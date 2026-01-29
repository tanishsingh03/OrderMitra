// Routes/admin.routes.js
const express = require("express");
const router = express.Router();
const {
    login,
    getDashboardStats,
    getAllOrders,
    getAllUsers,
    getAllRestaurants,
    verifyRestaurant,
    getAllDeliveryPartners,
    assignOrder,
} = require("../Controller/admin.controller");
const { authenticate } = require("../Middleware/auth.middleware");

// Public routes
router.post("/login", login);

// Protected routes (admin only)
router.get("/dashboard/stats", authenticate, getDashboardStats);
router.get("/orders", authenticate, getAllOrders);
router.get("/users", authenticate, getAllUsers);
router.get("/restaurants", authenticate, getAllRestaurants);
router.put("/restaurants/:restaurantId/verify", authenticate, verifyRestaurant);
router.get("/delivery-partners", authenticate, getAllDeliveryPartners);
router.post("/orders/assign", authenticate, assignOrder);

module.exports = router;

