// Utility/notification.service.js
const prisma = require('./prisma');
const { sendEmail } = require('./email.service');
const { publishOrderUpdate } = require('../websocket');

/**
 * Create and send notification
 */
async function createNotification(userId, type, title, message, link = null) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    });

    // Emit via WebSocket if user is connected
    if (userId) {
      publishOrderUpdate({
        type: 'notification',
        userId,
        notification: {
          id: notification.id,
          title,
          message,
          link,
          isRead: false,
          createdAt: notification.createdAt,
        },
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Send order status notification
 */
async function notifyOrderStatus(userId, orderNumber, status, message) {
  const statusMessages = {
    PENDING: 'Your order has been placed and is awaiting confirmation.',
    ACCEPTED: 'Restaurant has accepted your order!',
    PREPARING: 'Your order is being prepared.',
    READY: 'Your order is ready for pickup!',
    PICKED_UP: 'Your order has been picked up by the delivery partner.',
    OUT_FOR_DELIVERY: 'Your order is on the way!',
    DELIVERED: 'Your order has been delivered. Enjoy your meal!',
    CANCELLED: 'Your order has been cancelled.',
  };

  const title = `Order ${orderNumber} - ${status}`;
  const notificationMessage = message || statusMessages[status] || `Order status updated to ${status}`;

  await createNotification(
    userId,
    'order',
    title,
    notificationMessage,
    `/MyOrders.html?order=${orderNumber}`
  );
}

/**
 * Send payment notification
 */
async function notifyPayment(userId, orderNumber, status, amount) {
  const messages = {
    PAID: `Payment of ₹${amount} for order ${orderNumber} was successful.`,
    FAILED: `Payment of ₹${amount} for order ${orderNumber} failed. Please try again.`,
    REFUNDED: `Refund of ₹${amount} for order ${orderNumber} has been processed.`,
  };

  await createNotification(
    userId,
    'payment',
    `Payment ${status} - Order ${orderNumber}`,
    messages[status] || `Payment status: ${status}`,
    `/MyOrders.html?order=${orderNumber}`
  );
}

/**
 * Send general notification
 */
async function notifyGeneral(userId, title, message, link = null) {
  await createNotification(userId, 'general', title, message, link);
}

/**
 * Get user notifications
 */
async function getUserNotifications(userId, limit = 50) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
      data: { isRead: true },
    });
    return notification.count > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(userId) {
  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Get unread count
 */
async function getUnreadCount(userId) {
  try {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

module.exports = {
  createNotification,
  notifyOrderStatus,
  notifyPayment,
  notifyGeneral,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};

