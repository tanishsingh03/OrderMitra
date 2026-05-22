const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createLogger, RabbitMQManager, eventTypes, authenticate } = require('../shared');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

const logger = createLogger('order-service');
const prisma = new PrismaClient();
const rabbitMQ = new RabbitMQManager(logger);

app.use(cors());
app.use(express.json());

// Initialize RabbitMQ and subscribe to related events
async function initRabbit() {
  try {
    await rabbitMQ.connect();

    // Consume status updates from other domains
    await rabbitMQ.consume('order-service-updates-queue', [
      eventTypes.ORDER_ASSIGNED,
      eventTypes.PAYMENT_COMPLETED,
      eventTypes.DELIVERY_COMPLETED
    ], async (routingKey, message) => {
      logger.info(`Received event: ${routingKey}`);
      const { orderId, deliveryPartnerId, paymentStatus } = message;

      try {
        if (routingKey === eventTypes.ORDER_ASSIGNED) {
          await prisma.order.update({
            where: { id: parseInt(orderId, 10) },
            data: {
              status: 'ASSIGNED',
              deliveryPartnerId: parseInt(deliveryPartnerId, 10)
            }
          });
          logger.info(`Order ${orderId} successfully marked as ASSIGNED to Rider ${deliveryPartnerId}`);
        }

        else if (routingKey === eventTypes.PAYMENT_COMPLETED) {
          await prisma.order.update({
            where: { id: parseInt(orderId, 10) },
            data: { paymentStatus: 'PAID' }
          });
          logger.info(`Order ${orderId} payment status updated to PAID`);
        }

        else if (routingKey === eventTypes.DELIVERY_COMPLETED) {
          await prisma.order.update({
            where: { id: parseInt(orderId, 10) },
            data: {
              status: 'DELIVERED',
              deliveredAt: new Date()
            }
          });
          logger.info(`Order ${orderId} marked as DELIVERED`);
        }
      } catch (err) {
        logger.error(`Failed to handle event ${routingKey} for Order ${orderId}:`, err);
      }
    });
  } catch (err) {
    logger.error('Failed to initialize RabbitMQ in order-service', err);
  }
}
initRabbit();

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Order Service' });
});

// Create Order (Customer)
app.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'customer' && req.user.role !== 'user') {
      return res.status(403).json({ success: false, message: 'Access denied: Customer only' });
    }

    const { restaurantId, items, addressId, paymentMethod = 'COD' } = req.body;

    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Restaurant ID and items are required' });
    }

    let subtotal = 0;
    const orderItems = [];

    for (let item of items) {
      const menu = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId || item.id }
      });

      if (!menu) {
        return res.status(400).json({ success: false, message: `Menu item not found: ${item.menuItemId || item.id}` });
      }

      if (menu.restaurantId !== parseInt(restaurantId, 10)) {
        return res.status(400).json({ success: false, message: `Menu item does not belong to this restaurant` });
      }

      if (!menu.isAvailable) {
        return res.status(400).json({ success: false, message: `Menu item ${menu.name} is out of stock` });
      }

      const quantity = item.quantity || item.qty || 1;
      subtotal += menu.price * quantity;

      orderItems.push({
        menuItemId: menu.id,
        quantity: quantity,
        price: menu.price,
        notes: item.notes || null
      });
    }

    const deliveryFee = Math.min(Math.max(30, subtotal * 0.05), 100);
    const tax = subtotal * 0.05;
    const totalPrice = subtotal + deliveryFee + tax;

    const order = await prisma.$transaction(async (tx) => {
      return await tx.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}-${req.user.id}`,
          userId: req.user.id,
          restaurantId: parseInt(restaurantId, 10),
          addressId: addressId || null,
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          tax: tax,
          totalPrice: totalPrice,
          paymentMethod: paymentMethod,
          status: 'PLACED',
          items: {
            create: orderItems
          }
        },
        include: {
          items: { include: { menuItem: true } },
          restaurant: true,
          address: true
        }
      });
    });

    // Publish ORDER_CREATED event to RabbitMQ
    await rabbitMQ.publish(eventTypes.ORDER_CREATED, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      restaurantId: order.restaurantId,
      totalPrice: order.totalPrice,
      paymentMethod: order.paymentMethod,
      items: orderItems
    });

    return res.json({ success: true, message: 'Order placed successfully', order });
  } catch (err) {
    logger.error('Create order error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get User Orders (Customer)
app.get('/my', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        address: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, orders });
  } catch (err) {
    logger.error('Fetch customer orders error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get Restaurant Orders (Restaurant Owner)
app.get('/restaurant', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant-owner') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const orders = await prisma.order.findMany({
      where: { restaurantId: req.user.id },
      include: {
        items: { include: { menuItem: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
        address: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, orders });
  } catch (err) {
    logger.error('Fetch restaurant orders error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get Order Details by ID (All Roles)
app.get('/:id', authenticate, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        address: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.json({ success: true, order });
  } catch (err) {
    logger.error('Get order by ID error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Order Status (Restaurant/Admin)
app.put('/:id/status', authenticate, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization
    if (req.user.role === 'restaurant-owner' && order.restaurantId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { menuItem: true } } }
    });

    // Publish matching events
    if (status === 'ACCEPTED') {
      await rabbitMQ.publish(eventTypes.ORDER_ACCEPTED, { orderId: updated.id, restaurantId: updated.restaurantId });
    } else if (status === 'READY_FOR_PICKUP') {
      await rabbitMQ.publish(eventTypes.ORDER_READY, { orderId: updated.id, restaurantId: updated.restaurantId });
    }

    return res.json({ success: true, message: `Order status updated to ${status}`, order: updated });
  } catch (err) {
    logger.error('Update status error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`📦 Order Service running on port ${PORT}`);
});
