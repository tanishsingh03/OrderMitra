const express = require('express');
const http = require('http');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { Server } = require('socket.io');
const { createLogger, authenticate } = require('../shared');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3008;

const logger = createLogger('analytics-service');
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  lazyConnect: true,
  maxRetriesPerRequest: 1
});
redis.on('error', () => {});

app.use(cors());
app.use(express.json());

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

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildSeries(from, to, orders) {
  const map = new Map();
  orders.forEach((order) => {
    const key = dayKey(order.createdAt);
    const entry = map.get(key) || { date: key, revenue: 0, orders: 0, cancelled: 0 };
    entry.orders += 1;
    if (order.status === 'CANCELLED') entry.cancelled += 1;
    if (order.status === 'DELIVERED' || order.paymentStatus === 'PAID') entry.revenue += order.totalPrice || 0;
    map.set(key, entry);
  });
  const rows = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = dayKey(cursor);
    rows.push(map.get(key) || { date: key, revenue: 0, orders: 0, cancelled: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return rows;
}

async function calculateRestaurantAnalytics(restaurantId, query) {
  const { from, to } = getDateRange(query);
  const cacheKey = `analytics-service:restaurant:${restaurantId}:${from.toISOString()}:${to.toISOString()}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  const orders = await prisma.order.findMany({
    where: { restaurantId, createdAt: { gte: from, lte: to } },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'asc' }
  });

  const delivered = orders.filter((order) => order.status === 'DELIVERED' || order.paymentStatus === 'PAID');
  const cancelled = orders.filter((order) => order.status === 'CANCELLED');
  const active = orders.filter((order) => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status));
  const totalRevenue = delivered.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

  const dishMap = new Map();
  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (!item.menuItem) return;
      const entry = dishMap.get(item.menuItemId) || { name: item.menuItem.name, sold: 0, revenue: 0 };
      entry.sold += item.quantity;
      entry.revenue += (item.price || item.menuItem.price || 0) * item.quantity;
      dishMap.set(item.menuItemId, entry);
    });
  });
  const topDishes = [...dishMap.values()].sort((a, b) => b.sold - a.sold).slice(0, 8);

  const response = {
    success: true,
    analytics: {
      counters: {
        totalRevenue,
        totalOrders: orders.length,
        activeOrders: active.length,
        cancelledOrders: cancelled.length,
        cancellationRate: orders.length ? Number(((cancelled.length / orders.length) * 100).toFixed(1)) : 0
      },
      revenue: { daily: buildSeries(from, to, orders) },
      orders: { active },
      dishes: { topDishes },
      insights: topDishes[0] ? [`${topDishes[0].name} is currently your best-selling dish.`] : []
    }
  };

  try {
    await redis.set(cacheKey, JSON.stringify(response), 'EX', 60);
  } catch (_) {}
  return response;
}

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Analytics Service' });
});

// Get overall platform analytics (Admin Dashboard)
app.get('/metrics', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin only' });
    }

    // 1. Total Revenue
    const payments = await prisma.payment.findMany({
      where: { status: 'PAID' }
    });
    const totalRevenue = payments.reduce((acc, curr) => acc + curr.amount, 0);

    // 2. Order cancellation metrics
    const totalOrders = await prisma.order.count();
    const cancelledOrders = await prisma.order.count({ where: { status: 'CANCELLED' } });
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // 3. Peak order hours
    const orders = await prisma.order.findMany({
      select: { createdAt: true }
    });
    const hourlyCounts = Array(24).fill(0);
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hourlyCounts[hour]++;
    });
    const peakHours = hourlyCounts.map((count, hour) => ({ hour, count }));

    // 4. Most sold dishes (aggregate in-memory since Prisma queryRaw is simpler or standard JS reduce)
    const orderItems = await prisma.orderItem.findMany({
      include: { menuItem: true }
    });
    const dishSales = {};
    orderItems.forEach(item => {
      if (!item.menuItem) return;
      const key = item.menuItemId;
      if (!dishSales[key]) {
        dishSales[key] = { name: item.menuItem.name, count: 0 };
      }
      dishSales[key].count += item.quantity;
    });
    const topDishes = Object.values(dishSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.json({
      success: true,
      metrics: {
        totalRevenue,
        totalOrders,
        cancelledOrders,
        cancellationRate: parseFloat(cancellationRate.toFixed(2)),
        peakHours,
        topDishes
      }
    });
  } catch (err) {
    logger.error('Error fetching platform metrics:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get restaurant-specific analytics (Restaurant Owner Dashboard)
app.get('/restaurant/:id', authenticate, async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.id, 10);
    
    // Auth check
    if (req.user.role === 'restaurant-owner' && req.user.id !== restaurantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json(await calculateRestaurantAnalytics(restaurantId, req.query));
  } catch (err) {
    logger.error(`Error fetching metrics for Restaurant ID ${req.params.id}:`, err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

io.on('connection', (socket) => {
  socket.on('join_restaurant_analytics', (restaurantId) => {
    socket.join(`restaurant_analytics_${restaurantId}`);
  });
});

server.listen(PORT, () => {
  logger.info(`📊 Analytics Service running on port ${PORT}`);
});
