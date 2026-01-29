// Controller/coupon.controller.js
const prisma = require("../Utility/prisma");

/**
 * Create Coupon (Restaurant or Admin)
 */
async function createCoupon(req, res) {
    try {
        const { code, discountType, discountValue, minOrder, maxDiscount, validFrom, validUntil, usageLimit } = req.body;
        const role = req.user.role;
        const restaurantId = role === "restaurant-owner" ? req.user.id : req.body.restaurantId;

        if (!code || !discountType || !discountValue) {
            return res.json({ success: false, message: "Code, discount type, and discount value are required" });
        }

        // Check if code already exists
        const existing = await prisma.coupon.findUnique({ where: { code } });
        if (existing) {
            return res.json({ success: false, message: "Coupon code already exists" });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code,
                restaurantId,
                discountType, // percentage or fixed
                discountValue,
                minOrder,
                maxDiscount,
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                usageLimit,
            },
        });

        return res.json({ success: true, coupon });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get Valid Coupons
 */
async function getValidCoupons(req, res) {
    try {
        const { restaurantId } = req.query;
        const now = new Date();

        const where = {
            isActive: true,
            validFrom: { lte: now },
            validUntil: { gte: now },
        };

        if (restaurantId) {
            where.restaurantId = parseInt(restaurantId);
        } else {
            where.restaurantId = null; // Platform-wide coupons
        }

        const coupons = await prisma.coupon.findMany({
            where,
            orderBy: { discountValue: "desc" },
        });

        return res.json({ success: true, coupons });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Validate Coupon
 */
async function validateCoupon(req, res) {
    try {
        const { code, orderAmount, restaurantId } = req.body;

        if (!code || !orderAmount) {
            return res.json({ success: false, message: "Code and order amount are required" });
        }

        const coupon = await prisma.coupon.findUnique({ where: { code } });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid coupon code" });
        }

        // Check if coupon is active
        if (!coupon.isActive) {
            return res.json({ success: false, message: "Coupon is not active" });
        }

        // Check validity dates
        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validUntil) {
            return res.json({ success: false, message: "Coupon has expired" });
        }

        // Check restaurant match
        if (coupon.restaurantId && coupon.restaurantId !== restaurantId) {
            return res.json({ success: false, message: "Coupon not valid for this restaurant" });
        }

        // Check minimum order
        if (coupon.minOrder && orderAmount < coupon.minOrder) {
            return res.json({
                success: false,
                message: `Minimum order amount is ₹${coupon.minOrder}`,
            });
        }

        // Check usage limit
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.json({ success: false, message: "Coupon usage limit reached" });
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discountType === "percentage") {
            discount = (orderAmount * coupon.discountValue) / 100;
            if (coupon.maxDiscount) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else {
            discount = coupon.discountValue;
        }

        return res.json({
            success: true,
            coupon: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discount: Math.round(discount * 100) / 100,
            },
        });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get Restaurant Coupons
 */
async function getRestaurantCoupons(req, res) {
    try {
        const restaurantId = req.user.id;
        const coupons = await prisma.coupon.findMany({
            where: { restaurantId },
            orderBy: { createdAt: "desc" },
        });

        return res.json({ success: true, coupons });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

module.exports = {
    createCoupon,
    getValidCoupons,
    validateCoupon,
    getRestaurantCoupons,
};

