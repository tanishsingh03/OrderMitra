// --------------------------
// FILE: modules/menu/menu.controller.js
// --------------------------
// const prisma = require("../Utility/prisma");

// async function getMenuForRestaurant(req, res) {
//     if (req.user.role !== "user") return res.status(403).json({ message: "Forbidden" });
//     const { id } = req.params;
//     try {
//         const menu = await prisma.menuItem.findMany({ where: { restaurantId: parseInt(id) }, select: { id: true, name: true, price: true } });
//         res.json({ menu });
//     } catch (err) {
//         res.status(400).json({ message: err.message });
//     }
// }

// async function listRestaurants(req, res) {
//     if (req.user.role !== "user") return res.status(403).json({ message: "Forbidden" });
//     try {
//         const restaurants = await prisma.restaurant.findMany({ select: { id: true, name: true, address: true } });
//         res.json({ restaurants });
//     } catch (err) {
//         res.status(400).json({ message: err.message });
//     }
// }

// async function listRestaurants(req, res) {
//   if (req.user.role !== "user") return res.status(403).json({ message: "Forbidden" });

//   const { location } = req.query; // example: /api/restaurants?location=Delhi

//   try {
//     const where = location
//       ? { address: { contains: location, mode: "insensitive" } } // case-insensitive search
//       : {};

//     const restaurants = await prisma.restaurant.findMany({
//       where,
//       select: { id: true, name: true, address: true },
//     });

//     res.json({ restaurants });
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// }

// module.exports = { getMenuForRestaurant, listRestaurants };

const prisma = require("../Utility/prisma");

// Get menu items
async function getMenu(req, res) {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.json({ success: false, message: "Access denied" });
        }

        const menu = await prisma.menuItem.findMany({
            where: { restaurantId: req.user.id }
        });

        res.json({ success: true, menu });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
}

// Add item
async function addMenuItem(req, res) {
    try {
        const { name, price } = req.body;

        if (!name || !price) {
            return res.json({ success: false, message: "Name & Price required" });
        }

        const menuItem = await prisma.menuItem.create({
            data: {
                name,
                price: Number(price),
                restaurantId: req.user.id
            }
        });

        res.json({ success: true, menuItem });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
}

// Update item
async function updateMenuItem(req, res) {
    try {
        const id = req.params.id;
        const { name, price, description, category, isAvailable } = req.body;

        const updated = await prisma.menuItem.update({
            where: { id: Number(id) },
            data: { 
                name, 
                price: Number(price),
                description,
                category,
                isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : undefined
            }
        });

        res.json({ success: true, updated });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
}

// Delete item
async function deleteMenuItem(req, res) {
    try {
        const id = req.params.id;

        await prisma.menuItem.delete({
            where: { id: Number(id) }
        });

        res.json({ success: true, message: "Item deleted" });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
}

module.exports = {
    getMenu,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem
};
