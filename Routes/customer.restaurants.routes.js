const express = require("express");
const router = express.Router();
const prisma = require("../Utility/prisma");

// GET /api/restaurants → list all restaurants (with optional location filter)
router.get("/restaurants", async (req, res) => {
  try {
    const { city, state } = req.query;

    // Show active restaurants to customers. Do not hide newly onboarded
    // restaurants just because profile metadata like phone/cuisine is incomplete.
    const allRestaurants = await prisma.restaurant.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        phone: true,
        image: true,
        rating: true,
        totalRatings: true,
        cuisine: true,
        description: true,
        latitude: true,
        longitude: true,
        prepTime: true,
        isVerified: true,
        _count: {
          select: { menu: true }
        }
      },
      orderBy: {
        rating: 'desc'
      }
    });

    const visibleRestaurants = allRestaurants.filter((r) => {
      const hasAnyIdentity = Boolean(
        (r.name && r.name.trim()) ||
        (r.address && r.address.trim()) ||
        (r.image && r.image.trim()) ||
        r._count.menu > 0
      );
      return hasAnyIdentity;
    });

    const locationQuery = String(city || state || "").trim().toLowerCase();
    const restaurants = locationQuery
      ? [...visibleRestaurants].sort((a, b) => {
          const aMatches = (a.address || "").toLowerCase().includes(locationQuery);
          const bMatches = (b.address || "").toLowerCase().includes(locationQuery);
          return Number(bMatches) - Number(aMatches);
        })
      : visibleRestaurants;

    console.log(`✅ Found ${restaurants.length} visible restaurants (from ${allRestaurants.length} active)`);

    res.json({ success: true, restaurants });
  } catch (err) {
    console.error("Error fetching restaurants:", err);
    res.status(500).json({ success: false, message: "Failed to load restaurants. Please try again." });
  }
});

module.exports = router;
