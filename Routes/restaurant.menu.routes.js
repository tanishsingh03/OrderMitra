const express = require("express");
const router = express.Router();
const upload = require("../Middleware/upload");
const { authenticate } = require("../Middleware/auth.middleware");

const {
    getMenu,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem
} = require("../Controller/restaurant.menu.controller");

// GET menu
router.get("/", authenticate, getMenu);

// ADD menu item WITH image
router.post("/add", authenticate, upload.single("image"), addMenuItem);

// UPDATE menu item WITH image
router.put("/update/:id", authenticate, upload.single("image"), updateMenuItem);

// DELETE menu item
router.delete("/delete/:id", authenticate, deleteMenuItem);

module.exports = router;
