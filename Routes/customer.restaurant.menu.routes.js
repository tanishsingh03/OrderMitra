const express = require("express");
const router = express.Router();
const prisma = require("../Utility/prisma");

// GET /api/restaurant/:id → restaurant + menu items
router.get("/restaurant/:id", async (req, res) => {
  try {
    const restaurantId = Number(req.params.id);

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        menu: {
          include: {
            tags: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
      },
    });

    if (!restaurant) {
      return res.json({ success: false, message: "Restaurant not found" });
    }

    res.json({ success: true, restaurant });
  } catch (err) {
    console.error("Error fetching restaurant:", err);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
