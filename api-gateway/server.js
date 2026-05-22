const express = require('express');
const cors = require('cors');
const proxy = require('express-http-proxy');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 6789;

// Downstream Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://localhost:3005';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3008';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3009';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logging
app.use((req, res, next) => {
  console.log(`[API Gateway] Forwarding ${req.method} request to ${req.url}`);
  next();
});

// Central Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);

// JWT Verification Middleware for Gateway
const gatewayAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'secretkey';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired auth token' });
  }
};
app.use(gatewayAuthMiddleware);

// Proxy Options Decorator to inject JWT User Headers
const proxyOptions = {
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.user) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.id;
      proxyReqOpts.headers['x-user-role'] = srcReq.user.role;
      proxyReqOpts.headers['x-user-email'] = srcReq.user.email;
    }
    return proxyReqOpts;
  }
};

// Route Forwarding Rules
app.use('/api/auth', proxy(AUTH_SERVICE_URL, proxyOptions));
app.use('/api/users', proxy(USER_SERVICE_URL, proxyOptions));
app.use('/api/restaurants', proxy(RESTAURANT_SERVICE_URL, proxyOptions));
app.use('/api/restaurant', proxy((req) => {
  if (req.path.startsWith('/orders') || req.path.startsWith('/restaurant/orders')) {
    return ORDER_SERVICE_URL;
  }
  return RESTAURANT_SERVICE_URL;
}, {
  ...proxyOptions,
  proxyReqPathResolver: (req) => {
    const path = require('url').parse(req.url).path;
    if (path === '/me') return '/profile';
    if (path === '/update') return '/profile';
    if (path === '/orders') return '/restaurant';
    const statusMatch = path.match(/^\/orders\/(\d+)\/status/);
    if (statusMatch) return `/${statusMatch[1]}/status`;
    return path;
  }
}));
app.use('/api/menu', proxy(RESTAURANT_SERVICE_URL, {
  ...proxyOptions,
  proxyReqPathResolver: (req) => {
    const path = require('url').parse(req.url).path;
    return '/menu' + (path === '/' ? '' : path);
  }
}));
app.use('/api/food-tags', proxy(RESTAURANT_SERVICE_URL, {
  ...proxyOptions,
  proxyReqPathResolver: (req) => {
    const path = require('url').parse(req.url).path;
    return '/food-tags' + (path === '/' ? '' : path);
  }
}));
app.use('/api/coupons', proxy(RESTAURANT_SERVICE_URL, {
  ...proxyOptions,
  proxyReqPathResolver: (req) => {
    const path = require('url').parse(req.url).path;
    return '/coupons' + (path === '/' ? '' : path);
  }
}));
app.use('/api/menu-items', proxy(RESTAURANT_SERVICE_URL, {
  ...proxyOptions,
  proxyReqPathResolver: (req) => {
    const path = require('url').parse(req.url).path;
    return '/menu-items' + (path === '/' ? '' : path);
  }
}));
app.use('/api/orders', proxy(ORDER_SERVICE_URL, proxyOptions));
app.use('/api/delivery', proxy(DELIVERY_SERVICE_URL, proxyOptions));
app.use('/api/payments', proxy(PAYMENT_SERVICE_URL, proxyOptions));
app.use('/api/notifications', proxy(NOTIFICATION_SERVICE_URL, proxyOptions));
app.use('/api/analytics', proxy(ANALYTICS_SERVICE_URL, proxyOptions));
app.use('/api/ai', proxy(AI_SERVICE_URL, proxyOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'API Gateway' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[API Gateway Error]:', err);
  res.status(500).json({ success: false, message: 'API Gateway failure routing downstream request' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway serving on port ${PORT}`);
});
