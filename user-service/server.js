const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { createLogger, RabbitMQManager, eventTypes, authenticate } = require('../shared');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

const logger = createLogger('user-service');
const prisma = new PrismaClient();
const rabbitMQ = new RabbitMQManager(logger);

app.use(cors());
app.use(express.json());

// RabbitMQ Event Consumer Setup
async function initRabbit() {
  try {
    await rabbitMQ.connect();
    
    // Consume USER_REGISTERED event to create wallets automatically
    await rabbitMQ.consume('user-service-wallet-queue', [eventTypes.USER_REGISTERED], async (routingKey, message) => {
      logger.info(`Received event: ${routingKey}`);
      if (routingKey === eventTypes.USER_REGISTERED) {
        const { id, role } = message;
        if (role === 'customer') {
          try {
            await prisma.wallet.upsert({
              where: { userId: id },
              update: {},
              create: { userId: id, balance: 0 }
            });
            logger.info(`Wallet successfully initialized for Customer ID: ${id}`);
          } catch (err) {
            logger.error(`Error initializing wallet for Customer ID ${id}:`, err);
          }
        }
      }
    });
  } catch (err) {
    logger.error('Failed to initialize RabbitMQ in user-service', err);
  }
}
initRabbit();

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'User Service' });
});

// Profile endpoints
app.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        addresses: true,
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    delete user.password;
    return res.json({ success: true, user });
  } catch (err) {
    logger.error('Get profile error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/update-profile', authenticate, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    if (email && email !== req.user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
      updateData.email = email;
    }

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    delete updated.password;
    return res.json({ success: true, message: 'Profile updated successfully', user: updated });
  } catch (err) {
    logger.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Address endpoints
app.get('/addresses', authenticate, async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id }
    });
    return res.json({ success: true, addresses });
  } catch (err) {
    logger.error('Get addresses error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/addresses', authenticate, async (req, res) => {
  try {
    const { label, street, city, state, zipCode, latitude, longitude, isDefault } = req.body;

    if (!label || !street || !city || !state || !zipCode) {
      return res.json({ success: false, message: 'Missing required address fields' });
    }

    if (isDefault) {
      // Mark other addresses as not default
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: req.user.id,
        label,
        street,
        city,
        state,
        zipCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isDefault: !!isDefault
      }
    });

    return res.json({ success: true, address: newAddress });
  } catch (err) {
    logger.error('Add address error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update address
app.put('/addresses/:id', authenticate, async (req, res) => {
  try {
    const addressId = parseInt(req.params.id, 10);
    const { label, street, city, state, zipCode, latitude, longitude, isDefault } = req.body;

    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.address.update({
      where: { id: addressId },
      data: {
        label,
        street,
        city,
        state,
        zipCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        isDefault: !!isDefault
      }
    });

    return res.json({ success: true, address: updated });
  } catch (err) {
    logger.error('Update address error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete address
app.delete('/addresses/:id', authenticate, async (req, res) => {
  try {
    const addressId = parseInt(req.params.id, 10);

    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await prisma.address.delete({
      where: { id: addressId }
    });

    return res.json({ success: true, message: 'Address deleted successfully' });
  } catch (err) {
    logger.error('Delete address error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Set default address
const setDefaultAddressHandler = async (req, res) => {
  try {
    const addressId = parseInt(req.params.id, 10);

    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId: req.user.id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await prisma.address.updateMany({
      where: { userId: req.user.id },
      data: { isDefault: false }
    });

    const updated = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true }
    });

    return res.json({ success: true, address: updated });
  } catch (err) {
    logger.error('Set default address error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

app.put('/addresses/:id/default', authenticate, setDefaultAddressHandler);
app.post('/addresses/:id/default', authenticate, setDefaultAddressHandler);

// Wallet balance & transactions retrieve
app.get('/wallet', authenticate, async (req, res) => {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: req.user.id }
      });
    }

    return res.json({ success: true, wallet });
  } catch (err) {
    logger.error('Get wallet error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Wallet top up (credit)
app.post('/wallet/topup', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid topup amount' });
    }

    let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { userId: req.user.id } });
    }

    const updated = await prisma.wallet.update({
      where: { userId: req.user.id },
      data: {
        balance: { increment: parseFloat(amount) },
        transactions: {
          create: {
            amount: parseFloat(amount),
            type: 'credit',
            description: 'Wallet Top Up via Gateway'
          }
        }
      },
      include: {
        transactions: { orderBy: { createdAt: 'desc' } }
      }
    });

    return res.json({ success: true, message: 'Top up successful', wallet: updated });
  } catch (err) {
    logger.error('Wallet topup error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Internal wallet debit handler (invoked by payment/order service)
app.post('/wallet/debit', async (req, res) => {
  try {
    const { userId, amount, description, orderId } = req.body;
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid debit payload' });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    const updated = await prisma.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: parseFloat(amount) },
        transactions: {
          create: {
            amount: parseFloat(amount),
            type: 'debit',
            description: description || 'Wallet Debit',
            orderId: orderId ? parseInt(orderId, 10) : null
          }
        }
      }
    });

    return res.json({ success: true, balance: updated.balance });
  } catch (err) {
    logger.error('Internal wallet debit error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`👤 User Service running on port ${PORT}`);
});
