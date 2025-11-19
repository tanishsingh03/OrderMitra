const express = require("express");
const router = express.Router();
const {
    getAllRestaurants,
    getSingleRestaurant,
    getRestaurantMenu
} = require("../Controller/public.restaurant.controller");

// Public routes — no login required
router.get("/restaurants", getAllRestaurants);
router.get("/restaurants/:id", getSingleRestaurant);
router.get("/menu/:restaurantId", getRestaurantMenu);

module.exports = router;
