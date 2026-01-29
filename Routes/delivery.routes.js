// Routes/delivery.routes.js
const express = require("express");
const router = express.Router();
const {
    signup,
    login,
    updateStatus,
    getAvailableOrders,
    acceptOrder,
    updateOrderStatus,
    getMyOrders,
    getEarnings,
    updateLocation, // NEW: Location tracking
} = require("../Controller/delivery.controller");
const { authenticate, authorize } = require("../Middleware/auth.middleware");

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected routes - require delivery-partner role
router.post("/status", authenticate, authorize("delivery-partner"), updateStatus);
router.get("/orders/available", authenticate, authorize("delivery-partner"), getAvailableOrders);
router.post("/orders/accept", authenticate, authorize("delivery-partner"), acceptOrder);
router.post("/orders/update-status", authenticate, authorize("delivery-partner"), updateOrderStatus);
router.get("/orders/my", authenticate, authorize("delivery-partner"), getMyOrders);
router.get("/earnings", authenticate, authorize("delivery-partner"), getEarnings);
router.post("/location", authenticate, authorize("delivery-partner"), updateLocation); // NEW: Real-time location

module.exports = router;

