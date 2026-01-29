// Routes/coupon.routes.js
const express = require("express");
const router = express.Router();
const {
    createCoupon,
    getValidCoupons,
    validateCoupon,
    getRestaurantCoupons,
} = require("../Controller/coupon.controller");
const { authenticate } = require("../Middleware/auth.middleware");

router.post("/", authenticate, createCoupon);
router.get("/valid", getValidCoupons);
router.post("/validate", validateCoupon);
router.get("/restaurant", authenticate, getRestaurantCoupons);

module.exports = router;

