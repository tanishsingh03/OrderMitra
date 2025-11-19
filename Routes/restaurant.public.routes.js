const express = require("express");
const router = express.Router();
const prisma = require("../Utility/prisma");

// ------------------------
// GET ALL RESTAURANTS
// ------------------------
router.get("/restaurants", async (req, res) => {
    try {
        const restaurants = await prisma.restaurant.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                address: true,
                image: true
            }
        });

        res.json({ success: true, restaurants });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ------------------------
// GET SINGLE RESTAURANT + MENU
// ------------------------
router.get("/restaurants/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const restaurant = await prisma.restaurant.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                address: true,
                image: true,
                menuItems: true,
            }
        });

        if (!restaurant)
            return res.json({ success: false, message: "Restaurant not found" });

        res.json({ success: true, restaurant });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

module.exports = router;
