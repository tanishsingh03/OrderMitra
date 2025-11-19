const express = require("express");
const router = express.Router();
const prisma = require("../Utility/prisma");

// GET /api/restaurants → list all restaurants
router.get("/restaurants", async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        phone: true,
        image: true,    // if you added image column
      },
    });

    res.json({ success: true, restaurants });
  } catch (err) {
    console.error("Error fetching restaurants:", err);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
