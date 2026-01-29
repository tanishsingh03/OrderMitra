// Routes/rating.routes.js
const express = require("express");
const router = express.Router();
const { addRating, getRestaurantRatings, getUserRatings, getDeliveryPartnerRatings, getOrderRatings } = require("../Controller/rating.controller");
const { authenticate } = require("../Middleware/auth.middleware");

router.post("/", authenticate, addRating);
router.get("/restaurant/:restaurantId", getRestaurantRatings);
router.get("/delivery/:deliveryPartnerId", getDeliveryPartnerRatings);
router.get("/order/:orderId", getOrderRatings);
router.get("/my", authenticate, getUserRatings);

module.exports = router;

