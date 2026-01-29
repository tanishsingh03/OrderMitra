// --------------------------
// FILE: modules/orders/orders.routes.js
// --------------------------
const express = require("express");
const router = express.Router();
const { createOrder, getUserOrders, getMyOrders } = require("../Controller/orders.controller");
const { authenticate, authorize } = require("../Middleware/auth.middleware");

// Create order - requires customer role
router.post("/orders", authenticate, authorize("customer", "user"), createOrder);
// Get user orders - requires customer role
router.get("/user/:id/orders", authenticate, authorize("customer", "user"), getUserOrders);
router.get("/orders/my-orders", authenticate, authorize("customer", "user"), getMyOrders);

module.exports = router;
