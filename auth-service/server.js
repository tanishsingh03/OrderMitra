const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { createLogger, RabbitMQManager, eventTypes } = require('../shared');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const logger = createLogger('auth-service');
const prisma = new PrismaClient();
const rabbitMQ = new RabbitMQManager(logger);

app.use(cors());
app.use(express.json());

// Initialize RabbitMQ connection
let isRabbitConnected = false;
async function initRabbit() {
  try {
    await rabbitMQ.connect();
    isRabbitConnected = true;
  } catch (err) {
    logger.error('Failed to connect to RabbitMQ in auth-service', err);
  }
}
initRabbit();

// Root route
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Auth Service' });
});

// Standard Signup (Customer and Restaurant Owner)
app.post('/signup', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.json({ success: false, message: 'All fields required' });
    }

    const hashed = await bcrypt.hash(password, 10);
    let user;

    if (role === 'customer') {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ message: 'Email already registered' });

      user = await prisma.user.create({
        data: { email, password: hashed, name: '', phone: '' }
      });
    } else if (role === 'restaurant-owner') {
      const existing = await prisma.restaurant.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ message: 'Email already registered' });

      user = await prisma.restaurant.create({
        data: { email, password: hashed, name: 'New Restaurant', address: 'Not added', phone: '' }
      });
    } else {
      return res.json({ success: false, message: 'Invalid role' });
    }

    // Publish USER_REGISTERED event to RabbitMQ
    if (isRabbitConnected) {
      await rabbitMQ.publish(eventTypes.USER_REGISTERED, {
        id: user.id,
        email: user.email,
        name: user.name || 'User',
        role: role
      });
    }

    return res.json({ success: true, message: 'Signup successful', user });
  } catch (err) {
    logger.error('Signup error:', err);
    return res.json({ success: false, message: err.message });
  }
});

// Standard Login (Customer and Restaurant Owner)
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: 'All fields required' });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    let role = 'customer';

    if (!user) {
      user = await prisma.restaurant.findUnique({ where: { email } });
      role = 'restaurant-owner';
    }

    if (!user) {
      return res.json({ success: false, message: 'Account not found' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.json({ success: false, message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, role: role, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: role,
      }
    });
  } catch (err) {
    logger.error('Login error:', err);
    return res.json({ success: false, message: err.message });
  }
});

// Delivery Partner Signup
app.post('/delivery/signup', async (req, res) => {
  try {
    const { name, email, password, phone, vehicleType, vehicleNumber, licenseNumber } = req.body;

    if (!email || !password || !name || !phone) {
      return res.json({ success: false, message: 'Name, email, password, and phone are required' });
    }

    const existing = await prisma.deliveryPartner.findUnique({ where: { email } });
    if (existing) {
      return res.json({ success: false, message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const partner = await prisma.deliveryPartner.create({
      data: { name, email, password: hashed, phone, vehicleType, vehicleNumber, licenseNumber },
    });

    // Publish USER_REGISTERED event to RabbitMQ for rider welcome email / notifications
    if (isRabbitConnected) {
      await rabbitMQ.publish(eventTypes.USER_REGISTERED, {
        id: partner.id,
        email: partner.email,
        name: partner.name,
        role: 'delivery-partner'
      });
    }

    return res.json({ success: true, message: 'Signup successful', partner });
  } catch (err) {
    logger.error('Delivery signup error:', err);
    return res.json({ success: false, message: err.message });
  }
});

// Delivery Partner Login
app.post('/delivery/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required' });
    }

    const partner = await prisma.deliveryPartner.findUnique({ where: { email } });
    if (!partner) {
      return res.json({ success: false, message: 'Account not found' });
    }

    const valid = await bcrypt.compare(password, partner.password);
    if (!valid) {
      return res.json({ success: false, message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: partner.id, role: 'delivery-partner', email: partner.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      partner: {
        id: partner.id,
        email: partner.email,
        name: partner.name,
        phone: partner.phone,
        role: 'delivery-partner',
      },
    });
  } catch (err) {
    logger.error('Delivery login error:', err);
    return res.json({ success: false, message: err.message });
  }
});

// Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password are required' });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin', email: admin.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (err) {
    logger.error('Admin login error:', err);
    return res.json({ success: false, message: err.message });
  }
});

// Forgot password placeholder
app.post('/forgot-password', async (req, res) => {
  return res.json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been sent.',
  });
});

app.listen(PORT, () => {
  logger.info(`🔑 Auth Service running on port ${PORT}`);
});
