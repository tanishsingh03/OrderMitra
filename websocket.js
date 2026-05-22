const Redis = require("ioredis");

let io = null;
let pub = null;
let sub = null;

function emitOrderUpdate(data) {
    if (!io) return;

    if (data.userId) {
        io.to(`user_${data.userId}`).emit("order_update", data);
        console.log(`📤 Emitted order_update to user_${data.userId}`);
    }
    if (data.restaurantId) {
        io.to(`restaurant_${data.restaurantId}`).emit("order_update", data);
        console.log(`📤 Emitted order_update to restaurant_${data.restaurantId}`);
    }
    if (data.deliveryPartnerId) {
        io.to(`delivery_${data.deliveryPartnerId}`).emit("order_update", data);
        console.log(`📤 Emitted order_update to delivery_${data.deliveryPartnerId}`);
    }

    if (data.type === "NEW_ORDER_READY") {
        io.emit("new_order_available", data);
    }
    io.emit("order_list_update", data);
}

function emitRatingUpdate(data) {
    if (!io) return;

    if (data.userId) io.to(`user_${data.userId}`).emit("rating_update", data);
    if (data.deliveryPartnerId) io.to(`delivery_${data.deliveryPartnerId}`).emit("rating_update", data);
    if (data.restaurantId) io.to(`restaurant_${data.restaurantId}`).emit("rating_update", data);
}

async function socketServer(server) {
    io = require("socket.io")(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Initialize Redis connections
    try {
        const redisConfig = process.env.REDIS_URL
            ? {
                // Render provides a full Redis URL
                lazyConnect: false,
                retryStrategy: (times) => Math.min(times * 50, 2000)
            }
            : {
                host: process.env.REDIS_HOST || "localhost",
                port: parseInt(process.env.REDIS_PORT) || 6379,
                retryStrategy: (times) => Math.min(times * 50, 2000)
            };

        pub = process.env.REDIS_URL
            ? new Redis(process.env.REDIS_URL, redisConfig)
            : new Redis(redisConfig);

        sub = process.env.REDIS_URL
            ? new Redis(process.env.REDIS_URL, redisConfig)
            : new Redis(redisConfig);

        pub.on("error", (err) => console.error("Redis Publisher Error:", err));
        sub.on("error", (err) => console.error("Redis Subscriber Error:", err));
        pub.on("connect", () => console.log("✅ Redis Publisher Connected"));
        sub.on("connect", () => console.log("✅ Redis Subscriber Connected"));

        // Subscribe to order updates channel
        await sub.subscribe("order_updates");
        await sub.subscribe("new_order_available");
        await sub.subscribe("rating_updates");
        await sub.subscribe("location_updates"); // For real-time delivery partner location

        sub.on("message", (channel, message) => {
            try {
                const data = JSON.parse(message);

                if (channel === "new_order_available") {
                    // New order available for delivery partners
                    console.log("📦 New order available for delivery:", data.orderId);
                    // Also send the normal order_update event so customers and restaurants
                    // update status without requiring a manual refresh.
                    emitOrderUpdate(data);
                    return;
                }

                if (channel === "rating_updates") {
                    // Rating update
                    console.log("⭐ Rating update:", data);
                    emitRatingUpdate(data);
                    return;
                }

                if (channel === "location_updates") {
                    // Delivery partner location update
                    console.log("📍 Location update:", data);
                    // Emit to customer tracking this order
                    if (data.userId) {
                        io.to(`user_${data.userId}`).emit("location_update", data);
                    }
                    // Also emit to restaurant if partner is on the way
                    if (data.restaurantId) {
                        io.to(`restaurant_${data.restaurantId}`).emit("location_update", data);
                    }
                    return;
                }

                console.log("📢 Redis Broadcast:", data);
                emitOrderUpdate(data);
            } catch (err) {
                console.error("Error parsing Redis message:", err);
            }
        });
    } catch (err) {
        console.error("Redis connection error:", err);
    }

    // When frontend connects
    io.on("connection", (socket) => {
        // Only log in development
        if (process.env.NODE_ENV !== 'production') {
            console.log("🔌 Client connected:", socket.id);
        }

        // Client joins room
        socket.on("join", ({ userId, role }) => {
            if (!userId) {
                console.error("❌ Join event missing userId");
                return;
            }

            if (role === "customer" || role === "user") {
                const room = `user_${userId}`;
                socket.join(room);
                console.log(`👤 User ${userId} joined room: ${room}`);
                // Confirm join
                socket.emit("joined", { room, userId, role });
            } else if (role === "restaurant-owner" || role === "restaurant") {
                const room = `restaurant_${userId}`;
                socket.join(room);
                console.log(`🍽️  Restaurant ${userId} joined room: ${room}`);
                // Confirm join
                socket.emit("joined", { room, userId, role });
            } else if (role === "delivery-partner") {
                const room = `delivery_${userId}`;
                socket.join(room);
                console.log(`🚴 Delivery Partner ${userId} joined room: ${room}`);
                // Confirm join
                socket.emit("joined", { room, userId, role });
            } else {
                console.error(`❌ Unknown role: ${role}`);
            }
        });

        socket.on("disconnect", () => {
            // Only log in development
            if (process.env.NODE_ENV !== 'production') {
                console.log("❌ Client disconnected:", socket.id);
            }
        });
    });
}

// Function to publish order updates (can be called from controllers)
async function publishOrderUpdate(data) {
    if (!pub) {
        console.error("❌ Redis publisher not initialized! Emitting directly through Socket.io.");
        if (data.type === "RATING_ADDED" || data.type === "rating_update") emitRatingUpdate(data);
        else emitOrderUpdate(data);
        return;
    }

    try {
        const message = JSON.stringify(data);
        let channel = "order_updates";

        // Use appropriate channel based on update type
        if (data.type === "RATING_ADDED" || data.type === "rating_update") {
            channel = "rating_updates";
        } else if (data.type === "NEW_ORDER_READY") {
            channel = "new_order_available";
        } else if (data.type === "LOCATION_UPDATE") {
            channel = "location_updates";
        }

        const result = await pub.publish(channel, message);
        console.log(`📤 Published ${channel} to ${result} subscribers:`, data);

        // Also emit directly via Socket.io so the current server instance updates
        // immediately even before Redis fan-out completes.
        if (io) {
            if (data.type === "RATING_ADDED" || data.type === "rating_update") {
                emitRatingUpdate(data);
            } else {
                emitOrderUpdate(data);
            }
        }
    } catch (err) {
        console.error("Error publishing to Redis:", err);
        // Fallback: emit directly via Socket.io
        if (io) {
            console.log("🔄 Using Socket.io fallback (Redis unavailable)");
            if (data.type === "RATING_ADDED" || data.type === "rating_update") {
                emitRatingUpdate(data);
            } else {
                emitOrderUpdate(data);
            }
        }
    }
}

module.exports = { socketServer, publishOrderUpdate };
