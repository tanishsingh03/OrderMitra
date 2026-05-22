const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const redis = require('redis');
const { createLogger, RabbitMQManager, eventTypes, authenticate } = require('../shared');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

const logger = createLogger('delivery-service');
const prisma = new PrismaClient();
const rabbitMQ = new RabbitMQManager(logger);

app.use(cors());
app.use(express.json());

// Redis Client Setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

async function initServices() {
  try {
    await redisClient.connect();
    logger.info('🔑 Connected to Redis successfully');
    await rabbitMQ.connect();
  } catch (err) {
    logger.error('Service initialization failed', err);
  }
}
initServices();

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Delivery Service' });
});

// Update rider online/offline status
app.post('/status', authenticate, async (req, res) => {
  try {
    const { isOnline } = req.body;
    const partnerId = req.user.id;

    const partner = await prisma.deliveryPartner.update({
      where: { id: partnerId },
      data: { isOnline: !!isOnline }
    });

    // Cache online status in Redis
    if (isOnline) {
      await redisClient.sAdd('online_delivery_partners', partnerId.toString());
    } else {
      await redisClient.sRem('online_delivery_partners', partnerId.toString());
    }

    return res.json({ success: true, message: `Status updated to ${isOnline ? 'ONLINE' : 'OFFLINE'}`, partner });
  } catch (err) {
    logger.error('Update status error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get available orders for pickup (Online riders only)
app.get('/orders/available', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'READY_FOR_PICKUP',
        deliveryPartnerId: null
      }
    });
    return res.json({ success: true, orders });
  } catch (err) {
    logger.error('Get available orders error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Accept a delivery job
app.post('/orders/accept', authenticate, async (req, res) => {
  try {
    const { orderId } = req.body;
    const partnerId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const order = await prisma.order.findUnique({ where: { id: parseInt(orderId, 10) } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.deliveryPartnerId) {
      return res.status(400).json({ success: false, message: 'Order already assigned to another rider' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId, 10) },
      data: {
        status: 'ASSIGNED',
        deliveryPartnerId: partnerId
      }
    });

    // Publish ORDER_ASSIGNED event
    await rabbitMQ.publish(eventTypes.ORDER_ASSIGNED, {
      orderId: updatedOrder.id,
      deliveryPartnerId: partnerId
    });

    return res.json({ success: true, message: 'Delivery job accepted successfully', order: updatedOrder });
  } catch (err) {
    logger.error('Accept job error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update active delivery status transitions: ASSIGNED ➔ AT_RESTAURANT ➔ PICKED_UP ➔ DELIVERED
app.post('/orders/update-status', authenticate, async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const partnerId = req.user.id;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, message: 'Order ID and Status are required' });
    }

    const order = await prisma.order.findUnique({ where: { id: parseInt(orderId, 10) } });
    if (!order || order.deliveryPartnerId !== partnerId) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this order' });
    }

    const updated = await prisma.order.update({
      where: { id: parseInt(orderId, 10) },
      data: { status }
    });

    // If order is completed
    if (status === 'DELIVERED') {
      await rabbitMQ.publish(eventTypes.DELIVERY_COMPLETED, {
        orderId: updated.id,
        deliveryPartnerId: partnerId,
        totalPrice: updated.totalPrice
      });
    } else {
      // General status update event
      await rabbitMQ.publish('ordermitra.delivery.update', {
        orderId: updated.id,
        status: status,
        deliveryPartnerId: partnerId
      });
    }

    return res.json({ success: true, message: `Order status updated to ${status}`, order: updated });
  } catch (err) {
    logger.error('Update order status error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update rider real-time GPS coordinates
app.post('/location', authenticate, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const partnerId = req.user.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const locationData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      updatedAt: new Date().toISOString()
    };

    // Cache location coordinates in Redis
    await redisClient.set(`rider:location:${partnerId}`, JSON.stringify(locationData));

    // Update location in Postgres
    await prisma.deliveryPartner.update({
      where: { id: partnerId },
      data: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    });

    // Publish coordinate updates to Redis Pub/Sub channel for realtime websocket tracking
    await redisClient.publish('rider-location-channel', JSON.stringify({
      deliveryPartnerId: partnerId,
      ...locationData
    }));

    return res.json({ success: true, message: 'GPS coordinates updated successfully' });
  } catch (err) {
    logger.error('GPS update error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`🚴 Delivery Service running on port ${PORT}`);
});
