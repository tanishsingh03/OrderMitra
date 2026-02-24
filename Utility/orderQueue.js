// Utility/orderQueue.js - Redis-based order distribution queue
const Redis = require("ioredis");

let redisClient = null;

// Initialize Redis client for message queue
function initRedis() {
    if (!redisClient) {
        const redisConfig = {
            retryStrategy: (times) => Math.min(times * 50, 2000)
        };

        if (!process.env.REDIS_URL) {
            redisConfig.host = process.env.REDIS_HOST || "localhost";
            redisConfig.port = parseInt(process.env.REDIS_PORT) || 6379;
        }

        redisClient = process.env.REDIS_URL
            ? new Redis(process.env.REDIS_URL, redisConfig)
            : new Redis(redisConfig);

        redisClient.on("error", (err) => {
            console.error("❌ Order Queue Redis Error:", err);
        });

        redisClient.on("connect", () => {
            console.log("✅ Order Queue Redis Connected");
        });
    }
    return redisClient;
}

/**
 * Add order to distribution queue
 * This will notify all online delivery partners
 */
async function addOrderToQueue(orderId, orderData) {
    try {
        const client = initRedis();

        // Add order to queue with order data
        await client.lpush("order_queue", JSON.stringify({
            orderId,
            ...orderData,
            timestamp: new Date().toISOString()
        }));

        // Set order in hash for quick lookup
        await client.hset(`order:${orderId}`, {
            status: orderData.status || "READY",
            restaurantId: orderData.restaurantId,
            createdAt: new Date().toISOString()
        });

        // Set expiration (order expires from queue after 30 minutes)
        await client.expire(`order:${orderId}`, 1800);

        console.log(`📦 Order ${orderId} added to distribution queue`);

        // Publish to channel for real-time notification
        await client.publish("new_order_available", JSON.stringify({
            orderId,
            ...orderData
        }));

        return true;
    } catch (err) {
        console.error("Error adding order to queue:", err);
        return false;
    }
}

/**
 * Remove order from queue (when accepted)
 */
async function removeOrderFromQueue(orderId) {
    try {
        const client = initRedis();

        // Get all orders from queue
        const orders = await client.lrange("order_queue", 0, -1);

        // Filter out the accepted order
        const filteredOrders = orders.filter(orderStr => {
            const order = JSON.parse(orderStr);
            return order.orderId !== orderId;
        });

        // Clear and repush filtered orders
        await client.del("order_queue");
        if (filteredOrders.length > 0) {
            await client.rpush("order_queue", ...filteredOrders);
        }

        // Remove from hash
        await client.del(`order:${orderId}`);

        console.log(`✅ Order ${orderId} removed from queue`);
        return true;
    } catch (err) {
        console.error("Error removing order from queue:", err);
        return false;
    }
}

/**
 * Get all orders in queue
 */
async function getQueueOrders() {
    try {
        const client = initRedis();
        const orders = await client.lrange("order_queue", 0, -1);
        return orders.map(orderStr => JSON.parse(orderStr));
    } catch (err) {
        console.error("Error getting queue orders:", err);
        return [];
    }
}

/**
 * Register delivery partner as available
 */
async function registerDeliveryPartner(partnerId, location = null) {
    try {
        const client = initRedis();
        const key = `delivery_partner:${partnerId}`;

        await client.hset(key, {
            partnerId,
            isOnline: true,
            isAvailable: true,
            lastSeen: new Date().toISOString(),
            ...(location && { latitude: location.latitude, longitude: location.longitude })
        });

        // Add to set of online partners
        await client.sadd("online_partners", partnerId);

        // Set expiration (partner marked offline if not seen for 5 minutes)
        await client.expire(key, 300);

        console.log(`🚴 Delivery partner ${partnerId} registered as available`);
        return true;
    } catch (err) {
        console.error("Error registering delivery partner:", err);
        return false;
    }
}

/**
 * Unregister delivery partner
 */
async function unregisterDeliveryPartner(partnerId) {
    try {
        const client = initRedis();
        await client.srem("online_partners", partnerId);
        await client.del(`delivery_partner:${partnerId}`);
        console.log(`🚴 Delivery partner ${partnerId} unregistered`);
        return true;
    } catch (err) {
        console.error("Error unregistering delivery partner:", err);
        return false;
    }
}

/**
 * Get all online delivery partners
 */
async function getOnlinePartners() {
    try {
        const client = initRedis();
        const partnerIds = await client.smembers("online_partners");
        return partnerIds;
    } catch (err) {
        console.error("Error getting online partners:", err);
        return [];
    }
}

/**
 * Distribute order to nearest available partners
 * This uses a simple round-robin or can be enhanced with location-based logic
 */
async function distributeOrderToPartners(orderId, orderData) {
    try {
        const onlinePartners = await getOnlinePartners();

        if (onlinePartners.length === 0) {
            console.log("⚠️ No online delivery partners available");
            return false;
        }

        // Add to queue first
        await addOrderToQueue(orderId, orderData);

        // Notify all online partners via WebSocket (handled in websocket.js)
        return true;
    } catch (err) {
        console.error("Error distributing order:", err);
        return false;
    }
}

module.exports = {
    initRedis,
    addOrderToQueue,
    removeOrderFromQueue,
    getQueueOrders,
    registerDeliveryPartner,
    unregisterDeliveryPartner,
    getOnlinePartners,
    distributeOrderToPartners
};

