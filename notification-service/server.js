const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const redis = require('redis');
const { PrismaClient } = require('@prisma/client');
const { createLogger, RabbitMQManager, eventTypes, authenticate } = require('../shared');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3007;

const logger = createLogger('notification-service');
const prisma = new PrismaClient();
const rabbitMQ = new RabbitMQManager(logger);

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  logger.info(`🔌 Client connected to Socket.io: ${socket.id}`);

  socket.on('joinOrder', (orderId) => {
    socket.join(`order:${orderId}`);
    logger.info(`Client ${socket.id} joined tracking room: order:${orderId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Redis Pub/Sub setup for high-speed rider coordinates updates
const redisSubscriber = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

async function initRedisPubSub() {
  try {
    await redisSubscriber.connect();
    logger.info('🔑 Notification Service connected to Redis Pub/Sub');
    
    // Subscribe to rider location coordinates channel
    await redisSubscriber.subscribe('rider-location-channel', (message) => {
      try {
        const data = JSON.parse(message);
        // Broadcast location updates to all clients tracking this rider
        io.emit('locationUpdate', data);
      } catch (err) {
        logger.error('Error parsing rider location pub/sub message:', err);
      }
    });
  } catch (err) {
    logger.error('Failed to initialize Redis Pub/Sub in notification-service', err);
  }
}
initRedisPubSub();

// Initialize RabbitMQ and subscribe to order workflow events
async function initRabbit() {
  try {
    await rabbitMQ.connect();

    await rabbitMQ.consume('notification-service-alerts-queue', [
      eventTypes.USER_REGISTERED,
      eventTypes.ORDER_CREATED,
      eventTypes.ORDER_ACCEPTED,
      eventTypes.ORDER_READY,
      eventTypes.ORDER_ASSIGNED,
      eventTypes.PAYMENT_COMPLETED,
      eventTypes.DELIVERY_COMPLETED,
      eventTypes.MENU_ITEM_UPDATED
    ], async (routingKey, message) => {
      logger.info(`Received event: ${routingKey}`);

      try {
        let title = '';
        let body = '';
        let targetUserId = null;
        let eventPayload = { routingKey, data: message };

        if (routingKey === eventTypes.MENU_ITEM_UPDATED) {
          io.emit('menuItemUpdated', message);
          logger.info(`Broadcasted MENU_ITEM_UPDATED in Socket.io for Item ${message.menuItemId}`);
          return;
        }

        if (routingKey === eventTypes.USER_REGISTERED) {
          const { id, name, role } = message;
          title = 'Welcome to OrderMitra!';
          body = `Hi ${name || 'there'}, thank you for registering as a ${role}.`;
          targetUserId = id;
        }

        else if (routingKey === eventTypes.ORDER_CREATED) {
          const { orderId, userId, totalPrice } = message;
          title = 'Order Placed';
          body = `Your order #${orderId} of ₹${totalPrice} has been placed successfully.`;
          targetUserId = userId;

          // Broadcast order created alert to restaurant dashboards
          io.emit('newOrderAlert', message);
        }

        else if (routingKey === eventTypes.ORDER_ACCEPTED) {
          const { orderId, restaurantId } = message;
          title = 'Order Accepted';
          body = `Your order #${orderId} has been accepted by the restaurant and is being prepared.`;
          // Lookup customer user id from DB
          const order = await prisma.$queryRaw`SELECT "userId" FROM "Order" WHERE id = ${orderId} LIMIT 1`;
          if (order && order.length > 0) targetUserId = order[0].userId;

          io.to(`order:${orderId}`).emit('orderStatusChange', { orderId, status: 'ACCEPTED' });
        }

        else if (routingKey === eventTypes.ORDER_READY) {
          const { orderId } = message;
          title = 'Order Ready for Pickup';
          body = `Order #${orderId} is prepared and ready for delivery.`;
          // Broadcast to available riders
          io.emit('jobAvailableAlert', message);
          io.to(`order:${orderId}`).emit('orderStatusChange', { orderId, status: 'READY_FOR_PICKUP' });
        }

        else if (routingKey === eventTypes.ORDER_ASSIGNED) {
          const { orderId, deliveryPartnerId } = message;
          title = 'Rider Assigned';
          body = `Rider #${deliveryPartnerId} is on their way to pick up your order.`;
          const order = await prisma.$queryRaw`SELECT "userId" FROM "Order" WHERE id = ${orderId} LIMIT 1`;
          if (order && order.length > 0) targetUserId = order[0].userId;

          io.to(`order:${orderId}`).emit('orderStatusChange', { orderId, status: 'ASSIGNED', deliveryPartnerId });
        }

        else if (routingKey === eventTypes.PAYMENT_COMPLETED) {
          const { orderId } = message;
          title = 'Payment Received';
          body = `Payment for order #${orderId} has been processed successfully.`;
          const order = await prisma.$queryRaw`SELECT "userId" FROM "Order" WHERE id = ${orderId} LIMIT 1`;
          if (order && order.length > 0) targetUserId = order[0].userId;
        }

        else if (routingKey === eventTypes.DELIVERY_COMPLETED) {
          const { orderId } = message;
          title = 'Order Delivered';
          body = `Your order #${orderId} has been successfully delivered. Bon appétit!`;
          const order = await prisma.$queryRaw`SELECT "userId" FROM "Order" WHERE id = ${orderId} LIMIT 1`;
          if (order && order.length > 0) targetUserId = order[0].userId;

          io.to(`order:${orderId}`).emit('orderStatusChange', { orderId, status: 'DELIVERED' });
        }

        // Save persistent notification
        if (targetUserId) {
          const notif = await prisma.notification.create({
            data: {
              userId: targetUserId,
              type: 'general',
              title,
              message: body
            }
          });
          // Direct real-time push to target user
          io.emit(`user-notification:${targetUserId}`, notif);
        }
      } catch (err) {
        logger.error(`Error handling event ${routingKey} inside notification-service:`, err);
      }
    });
  } catch (err) {
    logger.error('Failed to initialize RabbitMQ in notification-service', err);
  }
}
initRabbit();

// Fetch customer's persistent notifications
app.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.json({ success: true, notifications });
  } catch (err) {
    logger.error('Fetch notifications error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Mark notification as read
app.put('/:id/read', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    return res.json({ success: true, notification: updated });
  } catch (err) {
    logger.error('Mark read error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

server.listen(PORT, () => {
  logger.info(`🔔 Notification WebSocket Service running on port ${PORT}`);
});
