// Controller/delivery.controller.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../Utility/prisma");
const { notifyOrderStatus } = require("../Utility/notification.service");
const { publishOrderUpdate } = require("../websocket");
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

/**
 * Delivery Partner Signup
 */
async function signup(req, res) {
    try {
        const { name, email, password, phone, vehicleType, vehicleNumber, licenseNumber } = req.body;

        if (!email || !password || !name || !phone) {
            return res.json({ success: false, message: "Name, email, password, and phone are required" });
        }

        const existing = await prisma.deliveryPartner.findUnique({ where: { email } });
        if (existing) {
            return res.json({ success: false, message: "Email already registered" });
        }

        const hashed = await bcrypt.hash(password, 10);
        const partner = await prisma.deliveryPartner.create({
            data: {
                name,
                email,
                password: hashed,
                phone,
                vehicleType,
                vehicleNumber,
                licenseNumber,
            },
        });

        // Create wallet
        await prisma.wallet.create({
            data: {
                deliveryPartnerId: partner.id,
            },
        });

        return res.json({ success: true, message: "Signup successful", partner });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Delivery Partner Login
 */
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ success: false, message: "Email and password are required" });
        }

        const partner = await prisma.deliveryPartner.findUnique({ where: { email } });
        if (!partner) {
            return res.json({ success: false, message: "Account not found" });
        }

        const valid = await bcrypt.compare(password, partner.password);
        if (!valid) {
            return res.json({ success: false, message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: partner.id, role: "delivery-partner" },
            JWT_SECRET,
            { expiresIn: "7d" } // 7 days for better UX
        );

        return res.json({
            success: true,
            message: "Login successful",
            token,
            partner: {
                id: partner.id,
                email: partner.email,
                name: partner.name,
                phone: partner.phone,
                role: "delivery-partner",
            },
        });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Update Delivery Partner Status (Online/Offline)
 */
async function updateStatus(req, res) {
    try {
        const partnerId = req.user.id;
        const { isOnline, isAvailable, latitude, longitude } = req.body;

        // Register/unregister in Redis queue
        const { registerDeliveryPartner, unregisterDeliveryPartner } = require("../Utility/orderQueue");

        if (isOnline) {
            await registerDeliveryPartner(partnerId, latitude && longitude ? { latitude, longitude } : null);
        } else {
            await unregisterDeliveryPartner(partnerId);
        }

        const updateData = {};
        if (isOnline !== undefined) updateData.isOnline = isOnline;
        if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
        if (latitude !== undefined) updateData.latitude = latitude;
        if (longitude !== undefined) updateData.longitude = longitude;

        const partner = await prisma.deliveryPartner.update({
            where: { id: partnerId },
            data: updateData,
        });

        // Broadcast location update
        publishOrderUpdate({
            type: "delivery_location",
            partnerId,
            latitude: partner.latitude,
            longitude: partner.longitude,
        });

        return res.json({ success: true, partner });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get Available Orders (Orders with READY_FOR_PICKUP status and no delivery partner assigned)
 */
async function getAvailableOrders(req, res) {
    try {
        const partnerId = req.user.id;
        console.log(`📦 Delivery partner ${partnerId} fetching available orders`);

        // Only show orders that are READY_FOR_PICKUP and not yet assigned
        const orders = await prisma.order.findMany({
            where: {
                status: "READY_FOR_PICKUP",
                deliveryPartnerId: null, // Must be unassigned
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        latitude: true,
                        longitude: true,
                        phone: true,
                    },
                },
                address: {
                    select: {
                        id: true,
                        label: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        latitude: true,
                        longitude: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                image: true,
                                category: true
                            }
                        }
                    }
                },
            },
            orderBy: { createdAt: "asc" },
        });

        // Ensure items are properly serialized
        const serializedOrders = orders.map(order => ({
            ...order,
            items: order.items || [],
            itemCount: order.items?.length || 0
        }));

        console.log(`✅ Found ${orders.length} available orders`);
        orders.forEach(order => {
            console.log(`  - Order ${order.orderNumber}: ${order.items?.length || 0} items`);
        });

        return res.json({ success: true, orders: serializedOrders });
    } catch (err) {
        console.error("❌ Error fetching available orders:", err);
        return res.json({
            success: false,
            message: err.message || "Failed to fetch available orders"
        });
    }
}

/**
 * Accept Order (Atomic assignment with race condition prevention)
 */
async function acceptOrder(req, res) {
    try {
        const partnerId = req.user.id;
        const { orderId } = req.body;

        console.log(`🚴 Delivery partner ${partnerId} attempting to accept order ${orderId}`);

        // Use transaction with conditional update to prevent race conditions
        const result = await prisma.$transaction(async (tx) => {
            // Lock the order row and check conditions
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    restaurant: {
                        select: {
                            id: true,
                            name: true,
                            address: true
                        }
                    },
                    items: {
                        include: {
                            menuItem: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    price: true,
                                    image: true,
                                    category: true
                                }
                            }
                        }
                    }
                },
            });

            if (!order) {
                throw new Error("Order not found");
            }

            // Validate order is available for assignment
            if (order.status !== "READY_FOR_PICKUP") {
                throw new Error(`Order is not ready for pickup. Current status: ${order.status}`);
            }

            if (order.deliveryPartnerId !== null) {
                throw new Error("Order already assigned to another delivery partner");
            }

            // Atomically assign order to partner and update status to ASSIGNED
            const updatedOrder = await tx.order.update({
                where: {
                    id: orderId,
                    deliveryPartnerId: null, // Conditional: only update if still null
                    status: "READY_FOR_PICKUP" // Conditional: only update if still READY_FOR_PICKUP
                },
                data: {
                    deliveryPartnerId: partnerId,
                    status: "ASSIGNED", // Status changes to ASSIGNED on acceptance
                },
                include: {
                    items: {
                        include: {
                            menuItem: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    price: true,
                                    image: true,
                                    category: true
                                }
                            }
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    restaurant: {
                        select: {
                            id: true,
                            name: true,
                            address: true
                        }
                    },
                    address: true
                }
            });

            console.log(`✅ Order ${order.orderNumber} assigned to delivery partner ${partnerId}, status: ASSIGNED`);
            return updatedOrder;
        });

        // Remove from queue after successful assignment
        const { removeOrderFromQueue } = require("../Utility/orderQueue");
        await removeOrderFromQueue(orderId);

        // Get partner details for WebSocket broadcast
        const partnerDetails = await prisma.deliveryPartner.findUnique({
            where: { id: partnerId },
            select: {
                id: true,
                name: true,
                phone: true,
                rating: true,
                totalRatings: true,
                vehicleType: true,
                vehicleNumber: true
            }
        });

        // Notify customer
        const { notifyOrderStatus } = require("../Utility/notification.service");
        await notifyOrderStatus(result.userId, result.orderNumber, "ASSIGNED", `Your order has been assigned to ${partnerDetails.name}!`);

        // Broadcast update via WebSocket with enhanced partner details
        const { publishOrderUpdate } = require("../websocket");
        await publishOrderUpdate({
            orderId: result.id,
            orderNumber: result.orderNumber,
            status: result.status,
            userId: result.userId,
            restaurantId: result.restaurantId,
            deliveryPartnerId: partnerId,
            partnerDetails: {
                name: partnerDetails.name,
                phone: partnerDetails.phone,
                rating: partnerDetails.rating,
                totalRatings: partnerDetails.totalRatings,
                vehicleType: partnerDetails.vehicleType,
                vehicleNumber: partnerDetails.vehicleNumber
            },
            message: "Your delivery partner is on the way", // Exact message from workflow
            liveLocationEnabled: true,
            timestamp: new Date().toISOString(),
            type: "ORDER_ASSIGNED"
        });

        return res.json({ success: true, order: result });
    } catch (err) {
        console.error(`❌ Error accepting order:`, err);
        return res.json({
            success: false,
            message: err.message || "Failed to accept order. It may have been assigned to another partner."
        });
    }
}

/**
 * Update Order Status (PICKED_UP, DELIVERED)
 */
async function updateOrderStatus(req, res) {
    try {
        const partnerId = req.user.id;
        const { orderId, status } = req.body;

        console.log(`🚴 Delivery partner ${partnerId} updating order ${orderId} to status ${status}`);

        // Valid status transitions for delivery partner
        const validStatuses = ["AT_RESTAURANT", "PICKED_UP", "DELIVERED"];
        if (!validStatuses.includes(status)) {
            return res.json({
                success: false,
                message: `Invalid status. Delivery partner can only set: AT_RESTAURANT, PICKED_UP, DELIVERED`
            });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                },
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                image: true,
                                category: true
                            }
                        }
                    }
                }
            },
        });

        if (!order) {
            console.error(`❌ Order ${orderId} not found`);
            return res.json({ success: false, message: "Order not found" });
        }

        // Verify order is assigned to this delivery partner
        if (order.deliveryPartnerId !== partnerId) {
            console.error(`❌ Order ${orderId} not assigned to delivery partner ${partnerId}`);
            return res.json({
                success: false,
                message: "Order not assigned to you"
            });
        }

        // Validate status transition
        const validTransitions = {
            'ASSIGNED': ['AT_RESTAURANT'],
            'AT_RESTAURANT': ['PICKED_UP'],
            'PICKED_UP': ['DELIVERED']
        };

        if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
            console.error(`❌ Invalid status transition from ${order.status} to ${status}`);
            return res.json({
                success: false,
                message: `Invalid status transition. Current status: ${order.status}, cannot transition to: ${status}`
            });
        }

        const updateData = { status };
        if (status === "DELIVERED") {
            updateData.deliveredAt = new Date();
        }

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: updateData,
            include: {
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                image: true,
                                category: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                },
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                },
                address: true
            }
        });

        console.log(`✅ Order ${order.orderNumber} status updated to ${status}`);

        // Define status-specific messages for customer
        const statusMessages = {
            'AT_RESTAURANT': 'Your delivery partner has arrived at the restaurant',
            'PICKED_UP': 'Order picked up — on the way to you',
            'DELIVERED': 'Order delivered successfully'
        };

        const message = statusMessages[status] || 'Order status updated';

        // Notify customer
        await notifyOrderStatus(order.userId, order.orderNumber, status, message);

        // Broadcast update via WebSocket with enhanced data
        await publishOrderUpdate({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            status: updatedOrder.status,
            userId: order.userId,
            restaurantId: order.restaurantId,
            deliveryPartnerId: partnerId,
            message: message,
            liveLocationEnabled: ['ASSIGNED', 'AT_RESTAURANT', 'PICKED_UP'].includes(status),
            ratingPrompt: status === 'DELIVERED',
            timestamp: new Date().toISOString(),
            type: "STATUS_UPDATED"
        });

        // If order is delivered, credit delivery fee to partner's wallet
        if (status === "DELIVERED" && order.deliveryFee > 0) {
            try {
                console.log(`💰 Processing wallet credit for order ${order.orderNumber}: ₹${order.deliveryFee}`);

                // Use transaction to ensure atomicity
                const walletResult = await prisma.$transaction(async (tx) => {
                    // Get or create wallet for delivery partner
                    let wallet = await tx.wallet.findUnique({
                        where: { deliveryPartnerId: partnerId }
                    });

                    if (!wallet) {
                        console.log(`📝 Creating new wallet for delivery partner ${partnerId}`);
                        wallet = await tx.wallet.create({
                            data: {
                                deliveryPartnerId: partnerId,
                                balance: 0
                            }
                        });
                    }

                    // Calculate new balance
                    const oldBalance = wallet.balance;
                    const newBalance = oldBalance + order.deliveryFee;

                    // Update wallet balance atomically
                    const updatedWallet = await tx.wallet.update({
                        where: { id: wallet.id },
                        data: { balance: newBalance }
                    });

                    // Create wallet transaction record
                    const transaction = await tx.walletTransaction.create({
                        data: {
                            walletId: wallet.id,
                            amount: order.deliveryFee,
                            type: "credit",
                            description: `Delivery fee for order #${order.orderNumber}`,
                            orderId: orderId
                        }
                    });

                    console.log(`✅ Wallet updated: ₹${oldBalance} → ₹${newBalance} (+₹${order.deliveryFee})`);

                    return {
                        wallet: updatedWallet,
                        transaction
                    };
                });

                // Broadcast wallet update via WebSocket
                await publishOrderUpdate({
                    type: "WALLET_UPDATED",
                    deliveryPartnerId: partnerId,
                    orderId: orderId,
                    orderNumber: order.orderNumber,
                    amount: order.deliveryFee,
                    newBalance: walletResult.wallet.balance,
                    timestamp: new Date().toISOString()
                });

                console.log(`✅ Successfully credited ₹${order.deliveryFee} to delivery partner ${partnerId} for order ${order.orderNumber}`);
            } catch (walletError) {
                console.error("❌ Error updating delivery partner wallet:", walletError);
                // Log but don't fail the order update - wallet can be fixed manually
                // In production, you might want to queue this for retry
            }
        }

        return res.json({ success: true, order: updatedOrder });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Get Partner Orders (Orders assigned to this delivery partner)
 */
async function getMyOrders(req, res) {
    try {
        const partnerId = req.user.id;

        console.log(`📦 Delivery partner ${partnerId} fetching their assigned orders`);

        // Show only orders assigned to this delivery partner
        const orders = await prisma.order.findMany({
            where: { deliveryPartnerId: partnerId },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        latitude: true,
                        longitude: true,
                        phone: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                },
                address: {
                    select: {
                        id: true,
                        label: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true,
                        latitude: true,
                        longitude: true
                    }
                },
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                image: true,
                                category: true
                            }
                        }
                    },
                }
            },
            orderBy: { createdAt: "desc" },
        });

        // Ensure items are properly serialized
        const serializedOrders = orders.map(order => ({
            ...order,
            items: order.items || [],
            itemCount: order.items?.length || 0
        }));

        console.log(`✅ Found ${orders.length} orders for partner ${partnerId}`);
        orders.forEach(order => {
            console.log(`  - Order ${order.orderNumber}: ${order.items?.length || 0} items`);
        });

        // Also get partner info with rating
        const partner = await prisma.deliveryPartner.findUnique({
            where: { id: partnerId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                rating: true,
                totalRatings: true,
                isOnline: true,
                isAvailable: true
            }
        });

        if (!partner) {
            console.error(`❌ Partner ${partnerId} not found`);
            return res.json({ success: false, message: "Partner not found" });
        }

        return res.json({
            success: true,
            orders: serializedOrders,
            partner
        });
    } catch (err) {
        console.error("❌ Error fetching partner orders:", err);
        return res.json({
            success: false,
            message: err.message || "Failed to fetch orders"
        });
    }
}

/**
 * Get Partner Earnings
 */
async function getEarnings(req, res) {
    try {
        const partnerId = req.user.id;
        const { startDate, endDate, period } = req.query; // period: 'daily', 'weekly', 'lifetime'

        const where = {
            deliveryPartnerId: partnerId,
            status: "DELIVERED",
        };

        // Calculate date ranges
        const now = new Date();
        let dateFilter = {};

        if (period === 'daily') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            dateFilter = {
                gte: startOfDay,
                lte: new Date()
            };
        } else if (period === 'weekly') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - 7);
            startOfWeek.setHours(0, 0, 0, 0);
            dateFilter = {
                gte: startOfWeek,
                lte: new Date()
            };
        } else if (startDate && endDate) {
            dateFilter = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        if (Object.keys(dateFilter).length > 0) {
            where.deliveredAt = dateFilter;
        }

        const orders = await prisma.order.findMany({
            where,
            select: {
                id: true,
                orderNumber: true,
                deliveryFee: true,
                deliveredAt: true,
                totalPrice: true,
                createdAt: true,
            },
            orderBy: { deliveredAt: 'desc' },
        });

        const totalEarnings = orders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

        // Get wallet balance and transactions
        let wallet = await prisma.wallet.findUnique({
            where: { deliveryPartnerId: partnerId },
            include: {
                transactions: {
                    where: {
                        orderId: { not: null }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 50
                }
            }
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: {
                    deliveryPartnerId: partnerId,
                    balance: 0
                }
            });
        }

        // Calculate lifetime stats
        const lifetimeOrders = await prisma.order.findMany({
            where: {
                deliveryPartnerId: partnerId,
                status: "DELIVERED"
            },
            select: {
                deliveryFee: true,
                deliveredAt: true
            }
        });

        const lifetimeEarnings = lifetimeOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

        // Calculate daily earnings
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const dailyOrders = lifetimeOrders.filter(o =>
            o.deliveredAt && new Date(o.deliveredAt) >= todayStart
        );
        const dailyEarnings = dailyOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

        // Calculate weekly earnings
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const weeklyOrders = lifetimeOrders.filter(o =>
            o.deliveredAt && new Date(o.deliveredAt) >= weekStart
        );
        const weeklyEarnings = weeklyOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

        return res.json({
            success: true,
            earnings: {
                total: totalEarnings, // For selected period
                ordersCount: orders.length,
                walletBalance: wallet.balance || 0,
                orders,
                breakdown: {
                    daily: {
                        earnings: dailyEarnings,
                        orders: dailyOrders.length
                    },
                    weekly: {
                        earnings: weeklyEarnings,
                        orders: weeklyOrders.length
                    },
                    lifetime: {
                        earnings: lifetimeEarnings,
                        orders: lifetimeOrders.length
                    }
                },
                recentTransactions: wallet.transactions || []
            },
        });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Update Delivery Partner Location (Real-time tracking during delivery)
 */
async function updateLocation(req, res) {
    try {
        const partnerId = req.user.id;
        const { latitude, longitude, orderId } = req.body;

        if (!latitude || !longitude) {
            return res.json({
                success: false,
                message: "Latitude and longitude are required"
            });
        }

        console.log(`📍 Delivery partner ${partnerId} location update: ${latitude}, ${longitude}`);

        // Update partner's current location
        const partner = await prisma.deliveryPartner.update({
            where: { id: partnerId },
            data: { latitude, longitude }
        });

        // If orderId is provided, broadcast location to customer and restaurant
        if (orderId) {
            const order = await prisma.order.findUnique({
                where: { id: parseInt(orderId) },
                select: {
                    id: true,
                    orderNumber: true,
                    userId: true,
                    restaurantId: true,
                    status: true,
                    deliveryPartnerId: true
                }
            });

            if (order && order.deliveryPartnerId === partnerId) {
                // Only broadcast if order is in active delivery status
                const activeStatuses = ['ASSIGNED', 'AT_RESTAURANT', 'PICKED_UP'];
                if (activeStatuses.includes(order.status)) {
                    await publishOrderUpdate({
                        type: "LOCATION_UPDATE",
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        userId: order.userId,
                        restaurantId: order.restaurantId,
                        deliveryPartnerId: partnerId,
                        latitude,
                        longitude,
                        status: order.status,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`✅ Location broadcasted for order ${order.orderNumber}`);
                }
            }
        }

        return res.json({
            success: true,
            message: "Location updated successfully",
            location: { latitude, longitude }
        });
    } catch (err) {
        console.error("❌ Error updating location:", err);
        return res.json({
            success: false,
            message: err.message || "Failed to update location"
        });
    }
}

module.exports = {
    signup,
    login,
    updateStatus,
    getAvailableOrders,
    acceptOrder,
    updateOrderStatus,
    getMyOrders,
    getEarnings,
    updateLocation, // NEW: Real-time location tracking
};

