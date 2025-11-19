const prisma = require("../Utility/prisma");

// --------------------------------------------
// 1. GET ALL RESTAURANTS
// --------------------------------------------
exports.getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await prisma.restaurant.findMany();

        res.json({ success: true, restaurants });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

// --------------------------------------------
// 2. GET SINGLE RESTAURANT
// --------------------------------------------
exports.getSingleRestaurant = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const restaurant = await prisma.restaurant.findUnique({
            where: { id }
        });

        if (!restaurant)
            return res.json({ success: false, message: "Restaurant not found" });

        res.json({ success: true, restaurant });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

// --------------------------------------------
// 3. GET MENU FOR A RESTAURANT (PUBLIC API)
// --------------------------------------------
exports.getRestaurantMenu = async (req, res) => {
    try {
        const restaurantId = Number(req.params.restaurantId);

        const menu = await prisma.menuItem.findMany({
            where: { restaurantId }
        });

        res.json({ success: true, menu });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
