// Controller/notification.controller.js
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
} = require("../Utility/notification.service");

/**
 * Get User Notifications
 */
async function getNotifications(req, res) {
    try {
        const userId = req.user.id;
        const { limit = 50 } = req.query;

        const notifications = await getUserNotifications(userId, parseInt(limit));

        return res.json({ success: true, notifications });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Mark Notification as Read
 */
async function markNotificationRead(req, res) {
    try {
        const userId = req.user.id;
        const { notificationId } = req.params;

        const success = await markAsRead(parseInt(notificationId), userId);

        if (success) {
            return res.json({ success: true, message: "Notification marked as read" });
        } else {
            return res.json({ success: false, message: "Notification not found" });
        }
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Mark All Notifications as Read
 */
async function markAllNotificationsRead(req, res) {
    try {
        const userId = req.user.id;
        await markAllAsRead(userId);

        return res.json({ success: true, message: "All notifications marked as read" });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get Unread Count
 */
async function getUnreadNotificationCount(req, res) {
    try {
        const userId = req.user.id;
        const count = await getUnreadCount(userId);

        return res.json({ success: true, count });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

module.exports = {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadNotificationCount,
};

