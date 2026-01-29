// // --------------------------
// // FILE: Controller/restaurant.controller.js
// // --------------------------
// const prisma = require("../Utility/prisma");
// const bcrypt = require("bcryptjs");

// // ------------------------------
// // GET Restaurant Profile (LOGGED IN RESTAURANT)
// // ------------------------------
// async function getRestaurantProfile(req, res) {
//     try {
//         if (req.user.role !== "restaurant-owner") {
//             return res.json({ success: false, message: "Access denied" });
//         }

//         const restaurant = await prisma.restaurant.findUnique({
//             where: { id: req.user.id }
//         });

//         if (!restaurant) {
//             return res.json({ success: false, message: "Restaurant not found" });
//         }

//         return res.json({ success: true, restaurant });

//     } catch (err) {
//         return res.json({ success: false, message: err.message });
//     }
// }



// // ------------------------------
// // UPDATE Restaurant Profile
// // ------------------------------
// async function updateRestaurant(req, res) {
//     try {
//         const { name, email, password, address, phone } = req.body;

//         if (req.user.role !== "restaurant-owner") {
//             return res.json({ success: false, message: "Access denied" });
//         }

//         // CHECK EMAIL DUPLICATE IN RESTAURANT TABLE ONLY
//         const existing = await prisma.restaurant.findUnique({
//             where: { email }
//         });

//         if (existing && existing.id !== req.user.id) {
//             return res.json({
//                 success: false,
//                 message: "Email already in use"
//             });
//         }

//         // Only hash if password is provided
//         let hashedPassword = undefined;
//         if (password && password.trim() !== "") {
//             hashedPassword = await bcrypt.hash(password, 10);
//         }

//         const updated = await prisma.restaurant.update({
//             where: { id: req.user.id },
//             data: {
//                 name,
//                 email,
//                 address,
//                 phone,
//                 ...(hashedPassword && { password: hashedPassword })
//             }
//         });

//         return res.json({
//             success: true,
//             message: "Restaurant profile updated",
//             restaurant: updated
//         });

//     } catch (err) {
//         return res.json({ success: false, message: err.message });
//     }
// }



// // ------------------------------
// // GET ORDERS FOR RESTAURANT
// // ------------------------------
// async function getRestaurantOrders(req, res) {
//     try {
//         if (req.user.role !== "restaurant-owner") {
//             return res.json({ success: false, message: "Access denied" });
//         }

//         const orders = await prisma.order.findMany({
//             where: { restaurantId: req.user.id },
//             include: {
//                 items: { include: { menuItem: true } },
//                 user: true
//             }
//         });

//         return res.json({ success: true, orders });

//     } catch (err) {
//         return res.json({ success: false, message: err.message });
//     }
// }



// // ------------------------------
// // ADD MENU ITEM
// // ------------------------------
// async function addMenuItem(req, res) {
//     try {
//         if (req.user.role !== "restaurant-owner") {
//             return res.json({ success: false, message: "Forbidden" });
//         }

//         const { name, price } = req.body;

//         if (!name || !price) {
//             return res.json({ success: false, message: "Name & Price required" });
//         }

//         const menuItem = await prisma.menuItem.create({
//             data: {
//                 name,
//                 price: Number(price),
//                 restaurantId: req.user.id
//             }
//         });

//         return res.json({
//             success: true,
//             message: "Menu item added",
//             menuItem
//         });

//     } catch (err) {
//         return res.json({ success: false, message: err.message });
//     }
// }

// module.exports = {
//     getRestaurantProfile,
//     updateRestaurant,
//     getRestaurantOrders,
//     addMenuItem
// };


const prisma = require("../Utility/prisma");
const bcrypt = require("bcryptjs");

// ------------------------------------
// GET Restaurant Profile
// ------------------------------------
async function getRestaurantProfile(req, res) {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.json({ success: false, message: "Access denied" });
        }

        // First get the restaurant
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: req.user.id }
        });

        if (!restaurant) {
            return res.json({ success: false, message: "Restaurant not found" });
        }

        // Get restaurant ratings (without ratingType filter to avoid schema issues)
        // Ratings with restaurantId are automatically restaurant ratings
        const restaurantRatings = await prisma.rating.findMany({
            where: {
                restaurantId: req.user.id
            },
            select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 10 // Latest 10 reviews
        });

        // Combine restaurant with ratings
        const restaurantWithRatings = {
            ...restaurant,
            ratings: restaurantRatings
        };

        res.json({ success: true, restaurant: restaurantWithRatings });

    } catch (err) {
        console.error("Error fetching restaurant profile:", err);
        res.json({ success: false, message: err.message });
    }
}



// ------------------------------------
// UPDATE Restaurant Profile (WITH IMAGE)
// ------------------------------------
async function updateRestaurant(req, res) {
    try {
        const { name, email, password, address, phone } = req.body;

        if (req.user.role !== "restaurant-owner") {
            return res.json({ success: false, message: "Access denied" });
        }

        // If an image file uploaded
        const image = req.file ? `/uploads/${req.file.filename}` : undefined;

        // Ensure email not taken
        const existing = await prisma.restaurant.findUnique({ where: { email } });
        if (existing && existing.id !== req.user.id) {
            return res.json({ success: false, message: "Email already in use" });
        }

        // Hash password if provided
        let hashedPassword = undefined;
        if (password && password.trim() !== "") {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const updated = await prisma.restaurant.update({
            where: { id: req.user.id },
            data: {
                name,
                email,
                address,
                phone,
                ...(image && { image }),
                ...(hashedPassword && { password: hashedPassword })
            }
        });

        res.json({ success: true, message: "Updated successfully", restaurant: updated });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
}



// ------------------------------------
// ADD MENU ITEM (WITH IMAGE)
// ------------------------------------
async function addMenuItem(req, res) {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.json({ success: false, message: "Access denied" });
        }

        const { name, price } = req.body;

        if (!name || !price) {
            return res.json({ success: false, message: "Name & Price required" });
        }

        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const menuItem = await prisma.menuItem.create({
            data: {
                name,
                price: Number(price),
                image,
                restaurantId: req.user.id
            }
        });

        res.json({ success: true, menuItem });

    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}



// ------------------------------------
// GET ALL ORDERS (Restaurant can only see their own orders)
// ------------------------------------
async function getRestaurantOrders(req, res) {
    try {
        const restaurantId = req.user.id;

        if (req.user.role !== "restaurant-owner") {
            console.error(`❌ Access denied: User ${req.user.id} with role ${req.user.role} tried to access restaurant orders`);
            return res.json({ success: false, message: "Access denied" });
        }

        console.log(`🍽️ Restaurant ${restaurantId} fetching their orders`);

        // Restaurant can ONLY see orders belonging to them
        // Always include full order item data
        const orders = await prisma.order.findMany({
            where: { restaurantId: restaurantId },
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
                        email: true,
                        phone: true
                    }
                },
                deliveryPartner: {
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
                        zipCode: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });


        // Ensure items are always present
        const ordersWithItems = orders.map(order => ({
            ...order,
            items: order.items || [],
            itemCount: order.items?.length || 0
        }));

        console.log(`✅ Found ${orders.length} orders for restaurant ${restaurantId}`);

        res.json({
            success: true,
            orders: ordersWithItems
        });

    } catch (err) {
        console.error("❌ Error loading restaurant orders:", err);
        console.error("Error stack:", err.stack);
        return res.status(500).json({ success: false, message: "Failed to load orders: " + err.message });
    }
}


// ------------------------------------
// UPDATE ORDER STATUS (Restaurant can accept/reject and mark ready)
// ------------------------------------
async function updateOrderStatus(req, res) {
    try {
        const restaurantId = req.user.id;

        if (req.user.role !== "restaurant-owner") {
            console.error(`❌ Access denied: User ${req.user.id} with role ${req.user.role} tried to update order status`);
            return res.json({ success: false, message: "Access denied" });
        }

        const { orderId } = req.params;
        const { status } = req.body;

        console.log(`🍽️ Restaurant ${restaurantId} updating order ${orderId} to status ${status}`);

        // Valid status transitions for restaurant
        const validStatuses = ['ACCEPTED', 'READY_FOR_PICKUP', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            console.error(`❌ Invalid status ${status} for restaurant`);
            return res.json({ success: false, message: `Invalid status. Restaurant can only set: ACCEPTED, READY_FOR_PICKUP, CANCELLED` });
        }

        // Check if order belongs to this restaurant
        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            include: {
                user: true,
                items: {
                    include: {
                        menuItem: true
                    }
                }
            }
        });

        if (!order) {
            console.error(`❌ Order ${orderId} not found`);
            return res.json({ success: false, message: "Order not found" });
        }

        if (order.restaurantId !== restaurantId) {
            console.error(`❌ Order ${orderId} does not belong to restaurant ${restaurantId}`);
            return res.json({ success: false, message: "Access denied: Order does not belong to this restaurant" });
        }

        // Validate status transition
        const validTransitions = {
            'PLACED': ['ACCEPTED', 'CANCELLED'],
            'ACCEPTED': ['READY_FOR_PICKUP', 'CANCELLED'],
            'READY_FOR_PICKUP': ['CANCELLED'] // Can only cancel, delivery partner will assign
        };

        if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
            console.error(`❌ Invalid status transition from ${order.status} to ${status}`);
            return res.json({
                success: false,
                message: `Invalid status transition. Current status: ${order.status}, cannot transition to: ${status}`
            });
        }

        // Update order status
        const updatedOrder = await prisma.order.update({
            where: { id: parseInt(orderId) },
            data: { status },
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
                        email: true,
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
                deliveryPartner: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                },
                address: true
            }
        });

        console.log(`✅ Order ${order.orderNumber} status updated to ${status}`);

        // If order status changed to READY_FOR_PICKUP, expose to delivery partners
        if (status === "READY_FOR_PICKUP") {
            console.log(`📦 Order ${order.orderNumber} is now READY_FOR_PICKUP, exposing to delivery partners`);
            const { distributeOrderToPartners } = require("../Utility/orderQueue");
            await distributeOrderToPartners(updatedOrder.id, {
                orderId: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                restaurantId: updatedOrder.restaurantId,
                userId: updatedOrder.userId,
                totalPrice: updatedOrder.totalPrice,
                deliveryFee: updatedOrder.deliveryFee,
                address: updatedOrder.address
            });
        }

        // Publish to Redis for real-time update
        const { publishOrderUpdate } = require("../websocket");

        // Define status-specific messages for customer
        const statusMessages = {
            'ACCEPTED': 'Restaurant accepted your order',
            'READY_FOR_PICKUP': 'Looking for a delivery partner',
            'CANCELLED': 'Order has been cancelled'
        };

        const message = statusMessages[status] || 'Order status updated';

        await publishOrderUpdate({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            status: updatedOrder.status,
            userId: updatedOrder.userId,
            restaurantId: updatedOrder.restaurantId,
            deliveryPartnerId: updatedOrder.deliveryPartnerId || null,
            message: message, // Customer-visible message
            timestamp: new Date().toISOString(),
            type: status === "READY_FOR_PICKUP" ? "NEW_ORDER_READY" : "STATUS_UPDATED"
        });

        res.json({ success: true, order: updatedOrder });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
}



module.exports = {
    getRestaurantProfile,
    updateRestaurant,
    addMenuItem,
    getRestaurantOrders,
    updateOrderStatus
};

