// Routes/notification.routes.js
const express = require("express");
const router = express.Router();
const {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadNotificationCount,
} = require("../Controller/notification.controller");
const { authenticate } = require("../Middleware/auth.middleware");

router.get("/", authenticate, getNotifications);
router.put("/:notificationId/read", authenticate, markNotificationRead);
router.put("/read-all", authenticate, markAllNotificationsRead);
router.get("/unread-count", authenticate, getUnreadNotificationCount);

module.exports = router;

