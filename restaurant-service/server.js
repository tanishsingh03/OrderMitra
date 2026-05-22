const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createLogger, RabbitMQManager, eventTypes, authenticate } = require('../shared');
const redis = require('redis');
const { z } = require('zod');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

const logger = createLogger('restaurant-service');
const prisma = new PrismaClient();
const rabbitMQ = new RabbitMQManager(logger);

app.use(cors());
app.use(express.json());

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

async function initServices() {
  try {
    await redisClient.connect();
    logger.info('🔑 Connected to Redis successfully in restaurant-service');
    await rabbitMQ.connect();
    await seedFoodTags();
  } catch (err) {
    logger.error('Failed to initialize services in restaurant-service', err);
  }
}

async function seedFoodTags() {
  const defaultTags = [
    { name: 'Jain', slug: 'jain', description: 'No root vegetables, purely vegetarian' },
    { name: 'Vegan', slug: 'vegan', description: 'No animal-derived products' },
    { name: 'Vegetarian', slug: 'vegetarian', description: 'No meat, fish or poultry' },
    { name: 'Non-Vegetarian', slug: 'non-vegetarian', description: 'Contains meat, fish or poultry' },
    { name: 'Gluten-Free', slug: 'gluten-free', description: 'Suitable for gluten-sensitive diets' },
    { name: 'Dairy-Free', slug: 'dairy-free', description: 'No milk or milk-derived products' },
    { name: 'Peanut-Free', slug: 'peanut-free', description: 'No peanuts or peanut traces' },
    { name: 'High Protein', slug: 'high-protein', description: 'Rich in protein content' },
    { name: 'Keto', slug: 'keto', description: 'Low carb, high fat ketogenic diet' },
    { name: 'Halal', slug: 'halal', description: 'Halal certified meat products' }
  ];

  try {
    for (const tag of defaultTags) {
      await prisma.foodTag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: tag
      });
    }
    logger.info('🌱 Default dietary food tags seeded successfully');
  } catch (err) {
    logger.error('Failed to seed dietary food tags:', err);
  }
}

initServices();

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Restaurant Service' });
});

// List all verified, active restaurants (Public)
app.get('/', async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        isVerified: true,
        isActive: true
      },
      orderBy: { rating: 'desc' }
    });
    return res.json({ success: true, restaurants });
  } catch (err) {
    logger.error('Get restaurants list error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get restaurant profile (Authenticated restaurant owner)
app.get('/profile', authenticate, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.user.id },
      include: { menu: true, coupons: true }
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    delete restaurant.password;
    return res.json({ success: true, restaurant });
  } catch (err) {
    logger.error('Get restaurant profile error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});



// Update restaurant profile details (Authenticated restaurant owner)
app.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, address, phone, cuisine, description, image, prepTime, isActive } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (cuisine !== undefined) updateData.cuisine = cuisine;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (prepTime !== undefined) updateData.prepTime = parseInt(prepTime, 10);
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const updated = await prisma.restaurant.update({
      where: { id: req.user.id },
      data: updateData
    });

    delete updated.password;
    return res.json({ success: true, message: 'Profile updated successfully', restaurant: updated });
  } catch (err) {
    logger.error('Update restaurant profile error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});



// Create menu item (Authenticated restaurant owner)
app.post('/menu', authenticate, async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    const newItem = await prisma.menuItem.create({
      data: {
        restaurantId: req.user.id,
        name,
        description,
        price: parseFloat(price),
        image,
        category,
        isAvailable: true
      }
    });

    return res.json({ success: true, menuItem: newItem });
  } catch (err) {
    logger.error('Create menu item error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update menu item availability or details (Authenticated restaurant owner)
app.put('/menu/:id', authenticate, async (req, res) => {
  try {
    const menuItemId = parseInt(req.params.id, 10);
    const { name, description, price, image, category, isAvailable } = req.body;

    const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
    if (!item || item.restaurantId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized menu modification' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (image !== undefined) updateData.image = image;
    if (category !== undefined) updateData.category = category;
    if (isAvailable !== undefined) updateData.isAvailable = !!isAvailable;

    const updated = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: updateData
    });

    return res.json({ success: true, menuItem: updated });
  } catch (err) {
    logger.error('Update menu item error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete menu item (Authenticated restaurant owner)
app.delete('/menu/:id', authenticate, async (req, res) => {
  try {
    const menuItemId = parseInt(req.params.id, 10);
    const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });

    if (!item || item.restaurantId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized menu deletion' });
    }

    await prisma.menuItem.delete({ where: { id: menuItemId } });
    return res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (err) {
    logger.error('Delete menu item error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// List promo coupons (Authenticated restaurant owner or customers checking discounts)
app.get('/coupons', authenticate, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { restaurantId: req.user.id }
    });
    return res.json({ success: true, coupons });
  } catch (err) {
    logger.error('Get coupons error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get coupons for the logged-in restaurant owner
app.get('/coupons/restaurant', authenticate, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: { restaurantId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, coupons });
  } catch (err) {
    logger.error('Get restaurant coupons error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get valid/active coupons for checkout
app.get('/coupons/valid', async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const where = {
      isActive: true,
      validFrom: { lte: new Date() },
      validUntil: { gte: new Date() }
    };

    if (restaurantId) {
      where.restaurantId = parseInt(restaurantId, 10);
    } else {
      where.restaurantId = null;
    }

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, coupons });
  } catch (err) {
    logger.error('Get valid coupons error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Create promo coupon (Authenticated restaurant owner)
app.post('/coupons', authenticate, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrder, maxDiscount, validFrom, validUntil, usageLimit } = req.body;

    if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
      return res.status(400).json({ success: false, message: 'Missing required coupon fields' });
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        restaurantId: req.user.id,
        discountType,
        discountValue: parseFloat(discountValue),
        minOrder: minOrder ? parseFloat(minOrder) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        isActive: true
      }
    });

    return res.json({ success: true, coupon: newCoupon });
  } catch (err) {
    logger.error('Create coupon error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Validate/Apply coupon code during checkout (Public/Internal)
app.post('/coupons/validate', async (req, res) => {
  try {
    const { code, restaurantId, subtotal } = req.body;

    if (!code || !restaurantId || !subtotal) {
      return res.status(400).json({ success: false, message: 'Missing coupon validation payload' });
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        restaurantId: parseInt(restaurantId, 10),
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() }
      }
    });

    if (!coupon) {
      return res.json({ success: false, message: 'Invalid or expired coupon code' });
    }

    if (coupon.minOrder && subtotal < coupon.minOrder) {
      return res.json({ success: false, message: `Minimum order amount of ₹${coupon.minOrder} required` });
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    return res.json({ success: true, discount, couponId: coupon.id });
  } catch (err) {
    logger.error('Validate coupon error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// FOOD TAGS & DIETARY FILTERING ENDPOINTS
// ==========================================

// Helper function to clear search/filter caches on menu changes
async function clearFilterCache() {
  try {
    const keys = await redisClient.keys('menu_filter:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Cleared ${keys.length} menu filter cache keys`);
    }
  } catch (err) {
    logger.error('Error clearing Redis filter cache:', err);
  }
}

// 1. Create Food Tag (Admin/Restaurant Owner)
app.post('/food-tags', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'restaurant-owner') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional()
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.issues });
    }

    const { name, description } = parsed.data;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const tag = await prisma.foodTag.create({
      data: { name, slug, description }
    });

    // Invalidate tags list cache
    await redisClient.del('food_tags:all');

    return res.json({ success: true, tag });
  } catch (err) {
    logger.error('Create food tag error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Get All Food Tags (Public)
app.get('/food-tags', async (req, res) => {
  try {
    const cached = await redisClient.get('food_tags:all');
    if (cached) {
      return res.json({ success: true, tags: JSON.parse(cached), cached: true });
    }

    const tags = await prisma.foodTag.findMany({
      orderBy: { name: 'asc' }
    });

    await redisClient.setEx('food_tags:all', 3600, JSON.stringify(tags)); // cache for 1 hour

    return res.json({ success: true, tags });
  } catch (err) {
    logger.error('Get all tags error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Assign Tag to Menu Item (Restaurant Owner/Admin only)
app.post('/menu-items/:id/tags', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant-owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const menuItemId = parseInt(req.params.id, 10);
    const { tagId, slug } = req.body;

    if (!tagId && !slug) {
      return res.status(400).json({ success: false, message: 'tagId or slug is required' });
    }

    // Find the item first to check ownership
    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (req.user.role === 'restaurant-owner' && item.restaurantId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized menu tagging' });
    }

    // Tag resolution
    const tag = tagId 
      ? await prisma.foodTag.findUnique({ where: { id: parseInt(tagId, 10) } })
      : await prisma.foodTag.findUnique({ where: { slug } });

    if (!tag) {
      return res.status(404).json({ success: false, message: 'Food tag not found' });
    }

    const updated = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        tags: { connect: { id: tag.id } }
      },
      include: { tags: true }
    });

    // Clear caches
    await clearFilterCache();

    // Publish event
    await rabbitMQ.publish('ordermitra.menu.update', {
      menuItemId: updated.id,
      restaurantId: updated.restaurantId,
      action: 'TAG_ASSIGNED',
      tag: { id: tag.id, name: tag.name, slug: tag.slug }
    });

    return res.json({ success: true, message: 'Tag assigned successfully', menuItem: updated });
  } catch (err) {
    logger.error('Assign tag error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Remove Tag from Menu Item (Restaurant Owner/Admin only)
app.delete('/menu-items/:id/tags/:tagId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant-owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const menuItemId = parseInt(req.params.id, 10);
    const tagId = parseInt(req.params.tagId, 10);

    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (req.user.role === 'restaurant-owner' && item.restaurantId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized menu modification' });
    }

    const updated = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        tags: { disconnect: { id: tagId } }
      },
      include: { tags: true }
    });

    // Clear caches
    await clearFilterCache();

    // Publish event
    await rabbitMQ.publish('ordermitra.menu.update', {
      menuItemId: updated.id,
      restaurantId: updated.restaurantId,
      action: 'TAG_REMOVED',
      tagId
    });

    return res.json({ success: true, message: 'Tag removed successfully', menuItem: updated });
  } catch (err) {
    logger.error('Remove tag error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Filter Menu Items by Tags (Public)
app.get('/menu-items/filter', async (req, res) => {
  try {
    // Generate a unique Redis cache key based on the query parameters
    const queryString = new URLSearchParams(req.query).toString();
    const cacheKey = `menu_filter:${queryString}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ success: true, ...JSON.parse(cached), cached: true });
    }

    // Validation Schema
    const schema = z.object({
      tags: z.string().optional(), // Comma separated slugs
      matchType: z.enum(['AND', 'OR', 'EXACT']).default('OR'),
      restaurantId: z.string().transform(v => parseInt(v, 10)).optional(),
      cuisine: z.string().optional(),
      priceMin: z.string().transform(v => parseFloat(v)).optional(),
      priceMax: z.string().transform(v => parseFloat(v)).optional(),
      isAvailable: z.string().transform(v => v === 'true').optional(),
      page: z.string().transform(v => parseInt(v, 10)).default('1'),
      limit: z.string().transform(v => parseInt(v, 10)).default('10'),
      sortBy: z.enum(['price', 'createdAt']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.issues });
    }

    const {
      tags,
      matchType,
      restaurantId,
      cuisine,
      priceMin,
      priceMax,
      isAvailable,
      page,
      limit,
      sortBy,
      sortOrder
    } = parsed.data;

    const where = {};

    // Availability Filter
    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    // Restaurant Filter
    if (restaurantId !== undefined) {
      where.restaurantId = restaurantId;
    }

    // Cuisine Filter (via Restaurant relationship)
    if (cuisine) {
      where.restaurant = {
        cuisine: {
          contains: cuisine,
          mode: 'insensitive'
        }
      };
    }

    // Price Bounds
    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {};
      if (priceMin !== undefined) where.price.gte = priceMin;
      if (priceMax !== undefined) where.price.lte = priceMax;
    }

    // Dietary Tags Filtering Logic
    let tagSlugs = [];
    if (tags) {
      tagSlugs = tags.split(',').map(s => s.trim().toLowerCase());
    }

    if (tagSlugs.length > 0) {
      if (matchType === 'OR') {
        where.tags = {
          some: {
            slug: { in: tagSlugs }
          }
        };
      } else if (matchType === 'AND' || matchType === 'EXACT') {
        // AND match requires all specified tags to be present
        where.AND = tagSlugs.map(slug => ({
          tags: { some: { slug } }
        }));
      }
    }

    // Standard pagination skips
    const skip = (page - 1) * limit;

    // We fetch with tags included to avoid N+1 query loading
    let menuItems = await prisma.menuItem.findMany({
      where,
      include: {
        tags: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            cuisine: true,
            rating: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit
    });

    // Exact Match filtering logic in-memory (Must have exactly the queried tags and no others)
    if (tagSlugs.length > 0 && matchType === 'EXACT') {
      menuItems = menuItems.filter(item => {
        if (item.tags.length !== tagSlugs.length) return false;
        const itemSlugs = item.tags.map(t => t.slug);
        return tagSlugs.every(s => itemSlugs.includes(s));
      });
    }

    const totalCount = await prisma.menuItem.count({ where });

    const result = {
      menuItems,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    };

    // Cache the response for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));

    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Filter menu items error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get restaurant by ID (Public)
app.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
    }
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { menu: true }
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    delete restaurant.password;
    return res.json({ success: true, restaurant });
  } catch (err) {
    logger.error('Get restaurant by ID error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get menu items (Public)
app.get('/:id/menu', async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.id, 10);
    if (isNaN(restaurantId)) {
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
    }
    const menu = await prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true }
    });
    return res.json({ success: true, menu });
  } catch (err) {
    logger.error('Get menu error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`🍳 Restaurant Service running on port ${PORT}`);
});
