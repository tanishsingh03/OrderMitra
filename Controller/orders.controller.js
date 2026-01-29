// --------------------------
// FILE: modules/orders/orders.controller.js
// --------------------------
const prisma = require("../Utility/prisma");

async function createOrder(req, res) {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        console.log(`📦 Creating order for ${role} ${userId}`);

        // Role check is now handled by middleware, but keep as backup
        if (role !== "user" && role !== "customer") {
            console.error(`❌ Access denied: ${role} cannot create orders`);
            return res.status(403).json({
                success: false,
                message: "Access Denied: Only customers can create orders."
            });
        }

        const { restaurantId, items, addressId, paymentMethod = "COD" } = req.body;

        if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Restaurant ID and items are required"
            });
        }

        // Calculate order total with proper pricing
        let subtotal = 0;
        const orderItems = [];

        for (let item of items) {
            const menu = await prisma.menuItem.findUnique({
                where: { id: item.menuItemId || item.id }
            });

            if (!menu) {
                console.error(`❌ Menu item not found: ${item.menuItemId || item.id}`);
                return res.status(400).json({
                    success: false,
                    message: `Menu item not found: ${item.menuItemId || item.id}`
                });
            }

            if (menu.restaurantId !== parseInt(restaurantId)) {
                console.error(`❌ Menu item ${menu.name} does not belong to restaurant ${restaurantId}`);
                return res.status(400).json({
                    success: false,
                    message: `Menu item ${menu.name} does not belong to this restaurant`
                });
            }

            if (!menu.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: `Menu item ${menu.name} is not available`
                });
            }

            const quantity = item.quantity || item.qty || 1;
            const itemTotal = menu.price * quantity;
            subtotal += itemTotal;

            orderItems.push({
                menuItemId: menu.id,
                quantity: quantity,
                price: menu.price
            });
        }

        // Calculate fees (matching the pricing logic from order placement)
        const deliveryFee = Math.min(Math.max(30, subtotal * 0.05), 100);
        const handlingCharge = Math.min(Math.max(10, subtotal * 0.02), 50);
        const tax = subtotal * 0.05;
        const totalPrice = subtotal + deliveryFee + handlingCharge + tax;

        // Create order with transaction
        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    orderNumber: `ORD-${Date.now()}-${userId}`,
                    userId: userId,
                    restaurantId: parseInt(restaurantId),
                    addressId: addressId || null,
                    subtotal: subtotal,
                    deliveryFee: deliveryFee,
                    tax: tax,
                    totalPrice: totalPrice,
                    paymentMethod: paymentMethod,
                    status: "PLACED", // Order starts as PLACED
                    deliveryPartnerId: null, // Explicitly set to null
                    items: {
                        create: orderItems
                    }
                },
                include: {
                    items: {
                        include: { menuItem: true }
                    },
                    restaurant: {
                        select: {
                            id: true,
                            name: true,
                            address: true
                        }
                    },
                    address: true
                },
            });

            console.log(`✅ Order ${newOrder.orderNumber} created successfully`);
            return newOrder;
        });

        res.json({
            success: true,
            message: "Order created successfully",
            order
        });
    } catch (err) {
        console.error("❌ Error creating order:", err);
        res.status(400).json({
            success: false,
            message: err.message || "Failed to create order"
        });
    }
}

async function getUserOrders(req, res) {
    const { id } = req.params;
    try {
        const orders = await prisma.order.findMany({
            where: { userId: parseInt(id) },
            include: { items: { include: { menuItem: true } }, restaurant: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, orders });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function getMyOrders(req, res) {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        console.log(`📦 Fetching orders for ${role} ${userId}`);

        // Role check is handled by middleware, but keep as backup
        const allowedRoles = ["customer", "user"];
        if (!allowedRoles.includes(role)) {
            console.error(`❌ Access denied: ${role} cannot access customer orders`);
            return res.json({
                success: false,
                message: "Access denied. Customer access required."
            });
        }

        const orders = await prisma.order.findMany({
            where: { userId: userId },
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
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        image: true,
                        rating: true,
                        totalRatings: true
                    }
                },
                deliveryPartner: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        rating: true,
                        totalRatings: true
                    }
                },
                address: {
                    select: {
                        id: true,
                        label: true,
                        street: true,
                        city: true,
                        state: true,
                        zipCode: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`✅ Found ${orders.length} orders for user ${userId}`);

        res.json({
            success: true,
            orders: orders
        });
    } catch (err) {
        console.error("❌ Error fetching user orders:", err);
        res.json({
            success: false,
            message: err.message || "Failed to fetch orders"
        });
    }
}

module.exports = { createOrder, getUserOrders, getMyOrders };