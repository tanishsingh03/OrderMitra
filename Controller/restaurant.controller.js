// --------------------------
// FILE: modules/restaurant/restaurant.controller.js
// --------------------------
const prisma = require("../Utility/prisma");
const bcrypt = require("bcryptjs");


// GET restaurant profile
async function getRestaurantProfile(req, res) {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const restaurant = await prisma.restaurant.findUnique({
            where: { id: req.user.id }
        });

        return res.json({ success: true, restaurant });

    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}



// UPDATE RESTAURANT PROFILE
async function updateRestaurant(req, res) {
    try {
        const { name, email, password, address, phone } = req.body;

        if (req.user.role !== "restaurant-owner") {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Check duplicate email inside restaurant table
        const existing = await prisma.restaurant.findUnique({
            where: { email }
        });

        if (existing && existing.id !== req.user.id) {
            return res
                .status(409)
                .json({ success: false, message: "Email already in use" });
        }

        const hashed = await bcrypt.hash(password, 10);

        const updated = await prisma.restaurant.update({
            where: { id: req.user.id },
            data: {
                name,
                email,
                password: hashed,
                address,
                phone
            }
        });

        return res.json({
            success: true,
            message: "Restaurant profile updated",
            restaurant: updated
        });

    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}



// GET ALL ORDERS FOR RESTAURANT
async function getRestaurantOrders(req, res) {
    if (req.user.role !== "restaurant-owner") {
        return res.status(403).json({ message: "Forbidden" });
    }

    try {
        const orders = await prisma.order.findMany({
            where: { restaurantId: req.user.id },
            include: {
                items: { include: { menuItem: true } },
                user: true
            }
        });

        res.json({ success: true, orders });

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}



// ADD MENU ITEM
async function addMenuItem(req, res) {
    if (req.user.role !== "restaurant-owner") {
        return res.status(403).json({ message: "Forbidden" });
    }

    const { name, price } = req.body;

    try {
        const menuItem = await prisma.menuItem.create({
            data: {
                name,
                price,
                restaurantId: req.user.id
            }
        });

        res.json({ success: true, message: "Menu item added", menuItem });

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}



module.exports = {
    getRestaurantProfile,
    updateRestaurant,
    getRestaurantOrders,
    addMenuItem
};
