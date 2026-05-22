const Redis = require("ioredis");
const prisma = require("../Utility/prisma");

let redis;
function getRedis() {
    if (!redis) {
        redis = new Redis({
            host: process.env.REDIS_HOST || "localhost",
            port: Number(process.env.REDIS_PORT || 6379),
            lazyConnect: true,
            maxRetriesPerRequest: 1
        });
        redis.on("error", () => {});
    }
    return redis;
}

function getDateRange(query) {
    const now = new Date();
    const fallbackFrom = new Date(now);
    fallbackFrom.setDate(now.getDate() - 29);
    fallbackFrom.setHours(0, 0, 0, 0);

    const from = query.from ? new Date(query.from) : fallbackFrom;
    const to = query.to ? new Date(query.to) : now;
    to.setHours(23, 59, 59, 999);

    return { from, to };
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function money(value) {
    return Number((value || 0).toFixed(2));
}

function percent(value) {
    return Number((value || 0).toFixed(1));
}

function buildDailySeries(from, to, orders) {
    const byDate = new Map();
    for (const order of orders) {
        const key = formatDate(order.createdAt);
        const entry = byDate.get(key) || { date: key, revenue: 0, orders: 0, cancelled: 0 };
        entry.orders += 1;
        if (order.status === "CANCELLED") entry.cancelled += 1;
        if (order.status === "DELIVERED" || order.paymentStatus === "PAID") entry.revenue += order.totalPrice || 0;
        byDate.set(key, entry);
    }

    const series = [];
    const cursor = new Date(from);
    while (cursor <= to) {
        const key = formatDate(cursor);
        const entry = byDate.get(key) || { date: key, revenue: 0, orders: 0, cancelled: 0 };
        series.push({ ...entry, revenue: money(entry.revenue) });
        cursor.setDate(cursor.getDate() + 1);
    }
    return series;
}

function buildHourSeries(orders) {
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${hour}:00`, orders: 0, revenue: 0 }));
    for (const order of orders) {
        const hour = new Date(order.createdAt).getHours();
        hours[hour].orders += 1;
        if (order.status === "DELIVERED" || order.paymentStatus === "PAID") hours[hour].revenue += order.totalPrice || 0;
    }
    return hours.map((item) => ({ ...item, revenue: money(item.revenue) }));
}

function buildDishAnalytics(orders) {
    const dishes = new Map();
    const hourly = new Map();

    for (const order of orders) {
        const hour = new Date(order.createdAt).getHours();
        for (const item of order.items || []) {
            const menuItem = item.menuItem;
            if (!menuItem) continue;
            const key = item.menuItemId;
            const entry = dishes.get(key) || {
                id: key,
                name: menuItem.name,
                category: menuItem.category || "Other",
                sold: 0,
                revenue: 0
            };
            entry.sold += item.quantity;
            entry.revenue += (item.price || menuItem.price || 0) * item.quantity;
            dishes.set(key, entry);

            const hourKey = `${key}:${hour}`;
            const hourEntry = hourly.get(hourKey) || { dish: menuItem.name, hour, sold: 0 };
            hourEntry.sold += item.quantity;
            hourly.set(hourKey, hourEntry);
        }
    }

    const sorted = [...dishes.values()]
        .map((dish) => ({ ...dish, revenue: money(dish.revenue) }))
        .sort((a, b) => b.sold - a.sold);

    return {
        topDishes: sorted.slice(0, 8),
        leastDishes: sorted.slice(-8).reverse(),
        trendingDishes: sorted.filter((dish) => dish.sold > 0).slice(0, 5),
        dishByHour: [...hourly.values()].sort((a, b) => b.sold - a.sold).slice(0, 12)
    };
}

function buildCustomerAnalytics(orders) {
    const customers = new Map();
    for (const order of orders) {
        const key = order.userId;
        const entry = customers.get(key) || {
            id: key,
            name: order.user?.name || order.user?.email || `Customer ${key}`,
            email: order.user?.email,
            orders: 0,
            revenue: 0
        };
        entry.orders += 1;
        if (order.status === "DELIVERED" || order.paymentStatus === "PAID") entry.revenue += order.totalPrice || 0;
        customers.set(key, entry);
    }
    const list = [...customers.values()].map((c) => ({ ...c, revenue: money(c.revenue) }));
    const repeatCustomers = list.filter((c) => c.orders > 1).length;
    return {
        uniqueCustomers: list.length,
        repeatCustomers,
        retentionRate: list.length ? percent((repeatCustomers / list.length) * 100) : 0,
        mostActiveCustomers: list.sort((a, b) => b.orders - a.orders).slice(0, 8)
    };
}

function buildHeatmap(orders) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const cells = [];
    for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
            cells.push({ day, dayLabel: days[day], hour, orders: 0 });
        }
    }
    for (const order of orders) {
        const date = new Date(order.createdAt);
        const cell = cells.find((item) => item.day === date.getDay() && item.hour === date.getHours());
        if (cell) cell.orders += 1;
    }
    return cells;
}

function buildInsights(dailySeries, hourSeries, dishAnalytics) {
    const insights = [];
    const bestHour = [...hourSeries].sort((a, b) => b.orders - a.orders)[0];
    const bestDish = dishAnalytics.topDishes[0];
    const lowDish = dishAnalytics.leastDishes[0];
    const weekdayRevenue = dailySeries.filter((d) => {
        const day = new Date(d.date).getDay();
        return day >= 1 && day <= 5;
    }).reduce((sum, d) => sum + d.revenue, 0);
    const weekendRevenue = dailySeries.filter((d) => {
        const day = new Date(d.date).getDay();
        return day === 0 || day === 6;
    }).reduce((sum, d) => sum + d.revenue, 0);

    if (bestDish && bestHour?.orders) insights.push(`${bestDish.name} is your strongest dish and orders peak around ${bestHour.label}.`);
    if (weekdayRevenue > 0) insights.push(`Weekend revenue is ${percent(((weekendRevenue / 2) - (weekdayRevenue / 5)) / Math.max(weekdayRevenue / 5, 1) * 100)}% different from weekday average.`);
    if (lowDish) insights.push(`${lowDish.name} has low sales and may need pricing, placement, or photo improvements.`);
    return insights;
}

async function getRestaurantAnalytics(req, res) {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.status(403).json({ success: false, message: "Restaurant owners only" });
        }

        const restaurantId = req.user.id;
        const { from, to } = getDateRange(req.query);
        const cacheKey = `analytics:restaurant:${restaurantId}:${from.toISOString()}:${to.toISOString()}`;

        try {
            const cached = await getRedis().get(cacheKey);
            if (cached) return res.json(JSON.parse(cached));
        } catch (_) {}

        const orders = await prisma.order.findMany({
            where: {
                restaurantId,
                createdAt: { gte: from, lte: to }
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                deliveryPartner: { select: { id: true, name: true } },
                items: { include: { menuItem: true } }
            },
            orderBy: { createdAt: "asc" }
        });

        const delivered = orders.filter((o) => o.status === "DELIVERED" || o.paymentStatus === "PAID");
        const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status));
        const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");
        const totalRevenue = delivered.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
        const dailySeries = buildDailySeries(from, to, orders);
        const hourSeries = buildHourSeries(orders);
        const dishAnalytics = buildDishAnalytics(orders);
        const customerAnalytics = buildCustomerAnalytics(orders);

        const deliveryDurations = delivered
            .map((order) => {
                const end = order.deliveredAt || order.updatedAt;
                return end ? (new Date(end) - new Date(order.createdAt)) / 60000 : null;
            })
            .filter((value) => value !== null && value >= 0);
        const avgDeliveryTime = deliveryDurations.length
            ? deliveryDurations.reduce((sum, value) => sum + value, 0) / deliveryDurations.length
            : 0;

        const response = {
            success: true,
            analytics: {
                range: { from, to },
                counters: {
                    totalRevenue: money(totalRevenue),
                    totalOrders: orders.length,
                    activeOrders: activeOrders.length,
                    cancelledOrders: cancelledOrders.length,
                    cancellationRate: orders.length ? percent((cancelledOrders.length / orders.length) * 100) : 0,
                    averageOrderValue: delivered.length ? money(totalRevenue / delivered.length) : 0,
                    avgDeliveryTime: percent(avgDeliveryTime),
                    delayedOrders: deliveryDurations.filter((minutes) => minutes > 45).length
                },
                revenue: {
                    daily: dailySeries,
                    weekly: dailySeries,
                    monthly: dailySeries,
                    growthTrend: dailySeries
                },
                orders: {
                    daily: dailySeries,
                    hourly: hourSeries,
                    heatmap: buildHeatmap(orders),
                    active: activeOrders.slice(-8).reverse()
                },
                dishes: dishAnalytics,
                customers: customerAnalytics,
                delivery: {
                    avgDeliveryTime: percent(avgDeliveryTime),
                    efficiency: avgDeliveryTime ? percent(Math.max(0, 100 - ((avgDeliveryTime - 30) / 30) * 100)) : 100,
                    delayedOrders: deliveryDurations.filter((minutes) => minutes > 45).length
                },
                insights: buildInsights(dailySeries, hourSeries, dishAnalytics)
            }
        };

        try {
            await getRedis().set(cacheKey, JSON.stringify(response), "EX", 60);
        } catch (_) {}

        return res.json(response);
    } catch (err) {
        console.error("Analytics error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = { getRestaurantAnalytics };
