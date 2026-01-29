const express = require("express");
const router = express.Router();
const { authenticate } = require("../Middleware/auth.middleware");
const { requireCompleteCustomerProfile } = require("../Middleware/validateProfile");
const { placeOrder } = require("../Controller/public.order.controller");

// Require complete profile (name, phone, address) before allowing order placement
router.post("/orders/place", authenticate, requireCompleteCustomerProfile, placeOrder);

module.exports = router;

