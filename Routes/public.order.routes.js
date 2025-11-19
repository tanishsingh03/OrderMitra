const express = require("express");
const router = express.Router();
const { authenticate } = require("../Middleware/auth.middleware");
const { placeOrder } = require("../Controller/public.order.controller");

router.post("/orders/place", authenticate, placeOrder);

module.exports = router;
