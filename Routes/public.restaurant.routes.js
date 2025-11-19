// Routes/public.restaurant.routes.js
const express = require("express");
const router = express.Router();
const {
  getAllRestaurants,
  getSingleRestaurant,
  getRestaurantMenu,
} = require("../Controller/public.restaurant.controller");

// PUBLIC – no auth needed to view restaurants & menus
router.get("/restaurants", getAllRestaurants);
router.get("/restaurants/:id", getSingleRestaurant);
router.get("/menu/:restaurantId", getRestaurantMenu);

module.exports = router;
