const express = require("express");
const router = express.Router();
const { authenticate } = require("../Middleware/auth.middleware");
const { getRestaurantAnalytics } = require("../Controller/analytics.controller");

router.get("/restaurant/me", authenticate, getRestaurantAnalytics);

module.exports = router;
