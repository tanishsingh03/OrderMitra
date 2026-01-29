// Controller/admin.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../Utility/prisma");
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

/**
 * Admin Login
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ success: false, message: "Email and password are required" });
        }

        const admin = await prisma.admin.findUnique({ where: { email } });
        if (!admin) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, admin.password);
        if (!valid) {
            return res.json({ success: false, message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: admin.id, role: "admin" },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
            },
        });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get Dashboard Stats
 */
async function getDashboardStats(req, res) {
    try {
        const [
            totalUsers,
            totalRestaurants,
            totalDeliveryPartners,
            totalOrders,
            pendingOrders,
            todayOrders,
            totalRevenue,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.restaurant.count(),
            prisma.deliveryPartner.count(),
            prisma.order.count(),
            prisma.order.count({ where: { status: "PLACED" } }),
            prisma.order.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            prisma.order.aggregate({
                where: { status: "DELIVERED" },
                _sum: { totalPrice: true },
            }),
        ]);

        return res.json({
            success: true,
            stats: {
                totalUsers,
                totalRestaurants,
                totalDeliveryPartners,
                totalOrders,
                pendingOrders,
                todayOrders,
                totalRevenue: totalRevenue._sum.totalPrice || 0,
            },
        });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get All Orders
 */
async function getAllOrders(req, res) {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) where.status = status;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    user: { select: { name: true, email: true, phone: true } },
                    restaurant: { select: { name: true, email: true } },
                    deliveryPartner: { select: { name: true, phone: true } },
                    address: true,
                    items: { include: { menuItem: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: parseInt(limit),
            }),
            prisma.order.count({ where }),
        ]);

        return res.json({
            success: true,
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get All Users
 */
async function getAllUsers(req, res) {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({ success: true, users });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get All Restaurants
 */
async function getAllRestaurants(req, res) {
    try {
        const restaurants = await prisma.restaurant.findMany({
            include: {
                _count: {
                    select: { orders: true, menu: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({ success: true, restaurants });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Verify Restaurant
 */
async function verifyRestaurant(req, res) {
    try {
        const { restaurantId } = req.params;
        const { isVerified } = req.body;

        const restaurant = await prisma.restaurant.update({
            where: { id: parseInt(restaurantId) },
            data: { isVerified },
        });

        return res.json({ success: true, restaurant });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get All Delivery Partners
 */
async function getAllDeliveryPartners(req, res) {
    try {
        const partners = await prisma.deliveryPartner.findMany({
            include: {
                _count: {
                    select: { orders: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({ success: true, partners });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Assign Order to Delivery Partner
 */
async function assignOrder(req, res) {
    try {
        const { orderId, deliveryPartnerId } = req.body;

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { deliveryPartnerId: parseInt(deliveryPartnerId) },
        });

        return res.json({ success: true, order: updatedOrder });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

module.exports = {
    login,
    getDashboardStats,
    getAllOrders,
    getAllUsers,
    getAllRestaurants,
    verifyRestaurant,
    getAllDeliveryPartners,
    assignOrder,
};

