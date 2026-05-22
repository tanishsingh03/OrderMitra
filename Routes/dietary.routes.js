const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../Middleware/auth.middleware");
const {
    getFoodTags,
    createFoodTag,
    filterMenuItems,
    assignMenuItemTag,
    removeMenuItemTag
} = require("../Controller/dietary.controller");

router.get("/food-tags", getFoodTags);
router.post("/food-tags", authenticate, authorize("restaurant-owner", "admin"), createFoodTag);
router.get("/menu-items/filter", filterMenuItems);
router.post("/menu-items/:itemId/tags", authenticate, authorize("restaurant-owner"), assignMenuItemTag);
router.delete("/menu-items/:itemId/tags/:tagId", authenticate, authorize("restaurant-owner"), removeMenuItemTag);

module.exports = router;
