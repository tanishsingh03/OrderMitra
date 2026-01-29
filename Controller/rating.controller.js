// Controller/rating.controller.js
const prisma = require("../Utility/prisma");

/**
 * Add Rating
 */
async function addRating(req, res) {
    try {
        const userId = req.user.id;
        const { restaurantId, deliveryPartnerId, menuItemId, orderId, rating, comment, ratingType } = req.body;

        console.log(`⭐ Adding rating from user ${userId}:`, {
            restaurantId,
            deliveryPartnerId,
            menuItemId,
            orderId,
            rating,
            ratingType
        });

        if (!rating || rating < 1 || rating > 5) {
            return res.json({ 
                success: false, 
                message: "Valid rating (1-5) is required" 
            });
        }

        // Check if order exists and belongs to user
        if (orderId) {
            const order = await prisma.order.findFirst({
                where: { id: orderId, userId },
            });
            if (!order) {
                console.error(`❌ Order ${orderId} not found for user ${userId}`);
                return res.json({ 
                    success: false, 
                    message: "Order not found or access denied" 
                });
            }
        }

        // Determine rating type if not provided
        let finalRatingType = ratingType;
        if (!finalRatingType) {
            if (restaurantId) finalRatingType = "restaurant";
            else if (deliveryPartnerId) finalRatingType = "delivery";
            else if (menuItemId) finalRatingType = "food";
        }

        // Use transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            // Create rating
            const newRating = await tx.rating.create({
                data: {
                    userId,
                    restaurantId: restaurantId || null,
                    deliveryPartnerId: deliveryPartnerId || null,
                    menuItemId: menuItemId || null,
                    orderId: orderId || null,
                    rating,
                    comment: comment || null,
                    ratingType: finalRatingType,
                },
                include: {
                    user: {
                        select: { name: true, email: true }
                    },
                    restaurant: {
                        select: { name: true }
                    },
                    deliveryPartner: {
                        select: { name: true }
                    },
                    menuItem: {
                        select: { name: true }
                    }
                }
            });

            // Update restaurant average rating
            if (restaurantId) {
                const ratings = await tx.rating.findMany({
                    where: { 
                        restaurantId, 
                        ratingType: "restaurant" 
                    },
                    select: { rating: true },
                });

                if (ratings.length > 0) {
                    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
                    await tx.restaurant.update({
                        where: { id: restaurantId },
                        data: {
                            rating: avgRating,
                            totalRatings: ratings.length,
                        },
                    });
                    console.log(`✅ Updated restaurant ${restaurantId} rating: ${avgRating.toFixed(2)} (${ratings.length} reviews)`);
                }
            }

            // Update delivery partner average rating
            if (deliveryPartnerId) {
                const ratings = await tx.rating.findMany({
                    where: { 
                        deliveryPartnerId, 
                        ratingType: "delivery" 
                    },
                    select: { rating: true },
                });

                if (ratings.length > 0) {
                    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
                    await tx.deliveryPartner.update({
                        where: { id: deliveryPartnerId },
                        data: {
                            rating: avgRating,
                            totalRatings: ratings.length,
                        },
                    });
                    console.log(`✅ Updated delivery partner ${deliveryPartnerId} rating: ${avgRating.toFixed(2)} (${ratings.length} reviews)`);
                }
            }

            return newRating;
        });

        // Broadcast rating update via WebSocket
        const { publishOrderUpdate } = require("../websocket");
        await publishOrderUpdate({
            type: "RATING_ADDED",
            ratingId: result.id,
            userId,
            restaurantId: restaurantId || null,
            deliveryPartnerId: deliveryPartnerId || null,
            menuItemId: menuItemId || null,
            orderId: orderId || null,
            rating: result.rating,
            comment: result.comment,
            ratingType: result.ratingType,
            timestamp: new Date().toISOString(),
        });

        console.log(`✅ Rating ${result.id} created and broadcast successfully`);

        return res.json({ 
            success: true, 
            rating: result 
        });
    } catch (err) {
        console.error("❌ Error adding rating:", err);
        return res.json({ 
            success: false, 
            message: err.message || "Failed to add rating" 
        });
    }
}

/**
 * Get Restaurant Ratings
 */
async function getRestaurantRatings(req, res) {
    try {
        const { restaurantId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        console.log(`⭐ Fetching ratings for restaurant ${restaurantId}`);

        const [ratings, total] = await Promise.all([
            prisma.rating.findMany({
                where: { 
                    restaurantId: parseInt(restaurantId),
                    ratingType: "restaurant"
                },
                include: {
                    user: {
                        select: { 
                            id: true,
                            name: true, 
                            email: true 
                        },
                    },
                    order: {
                        select: {
                            id: true,
                            orderNumber: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: parseInt(limit),
            }),
            prisma.rating.count({ 
                where: { 
                    restaurantId: parseInt(restaurantId),
                    ratingType: "restaurant"
                } 
            }),
        ]);

        console.log(`✅ Found ${ratings.length} ratings for restaurant ${restaurantId}`);

        return res.json({
            success: true,
            ratings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error("❌ Error fetching restaurant ratings:", err);
        return res.json({ 
            success: false, 
            message: err.message || "Failed to fetch ratings" 
        });
    }
}

/**
 * Get User Ratings
 */
async function getUserRatings(req, res) {
    try {
        const userId = req.user.id;
        const ratings = await prisma.rating.findMany({
            where: { userId },
            include: {
                restaurant: {
                    select: { name: true, image: true },
                },
                deliveryPartner: {
                    select: { name: true },
                },
                menuItem: {
                    select: { name: true, image: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({ success: true, ratings });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get Delivery Partner Ratings
 */
async function getDeliveryPartnerRatings(req, res) {
    try {
        const { deliveryPartnerId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        console.log(`⭐ Fetching ratings for delivery partner ${deliveryPartnerId}`);

        const [ratings, total] = await Promise.all([
            prisma.rating.findMany({
                where: { 
                    deliveryPartnerId: parseInt(deliveryPartnerId),
                    ratingType: "delivery"
                },
                include: {
                    user: {
                        select: { 
                            id: true,
                            name: true, 
                            email: true 
                        },
                    },
                    order: {
                        select: {
                            id: true,
                            orderNumber: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: parseInt(limit),
            }),
            prisma.rating.count({ 
                where: { 
                    deliveryPartnerId: parseInt(deliveryPartnerId),
                    ratingType: "delivery"
                } 
            }),
        ]);

        console.log(`✅ Found ${ratings.length} ratings for delivery partner ${deliveryPartnerId}`);

        return res.json({
            success: true,
            ratings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        console.error("❌ Error fetching delivery partner ratings:", err);
        return res.json({ 
            success: false, 
            message: err.message || "Failed to fetch ratings" 
        });
    }
}

/**
 * Get Order Ratings (for a specific order)
 */
async function getOrderRatings(req, res) {
    try {
        const { orderId } = req.params;
        const ratings = await prisma.rating.findMany({
            where: { orderId: parseInt(orderId) },
            include: {
                user: {
                    select: { name: true },
                },
                restaurant: {
                    select: { name: true },
                },
                deliveryPartner: {
                    select: { name: true },
                },
                menuItem: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.json({ success: true, ratings });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

module.exports = {
    addRating,
    getRestaurantRatings,
    getUserRatings,
    getDeliveryPartnerRatings,
    getOrderRatings,
};

