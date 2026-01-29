const express = require("express");
const router = express.Router();
const prisma = require("../Utility/prisma");

// GET /api/restaurants → list all restaurants (with optional location filter)
router.get("/restaurants", async (req, res) => {
  try {
    const { city, state } = req.query;

    // Simple query - filter incomplete profiles in JavaScript instead of Prisma
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
      },
      orderBy: {
        rating: 'desc'
      }
    });

    // Filter out incomplete profiles in JavaScript
    const completeRestaurants = allRestaurants.filter(r => {
      const hasValidName = r.name && r.name.trim() !== "" && r.name !== "New Restaurant";
      const hasValidAddress = r.address && r.address.trim() !== "" && r.address !== "Not added";
      const hasValidPhone = r.phone && r.phone.trim() !== "";

      // Optional location filter
      let matchesLocation = true;
      if (city) {
        matchesLocation = r.address && r.address.toLowerCase().includes(city.toLowerCase());
      } else if (state) {
        matchesLocation = r.address && r.address.toLowerCase().includes(state.toLowerCase());
      }

      return hasValidName && hasValidAddress && hasValidPhone && matchesLocation;
    });

    console.log(`✅ Found ${completeRestaurants.length} restaurants with complete profiles (filtered from ${allRestaurants.length} total)`);

    res.json({ success: true, restaurants: completeRestaurants });
  } catch (err) {
    console.error("Error fetching restaurants:", err);
    res.status(500).json({ success: false, message: "Failed to load restaurants. Please try again." });
  }
});

module.exports = router;
