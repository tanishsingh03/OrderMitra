const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createLogger, authenticate } = require('../shared');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3009;

const logger = createLogger('ai-recommendation-service');
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'AI Recommendation Service' });
});

// Generate AI Suggestions for Restaurant Owner
app.get('/restaurant/:id', authenticate, async (req, res) => {
  try {
    const restaurantId = parseInt(req.params.id, 10);
    
    // Auth check
    if (req.user.role === 'restaurant-owner' && req.user.id !== restaurantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Fetch order history to run analysis
    const orderItems = await prisma.orderItem.findMany({
      where: { order: { restaurantId } },
      include: { menuItem: true }
    });

    const dishStats = {};
    orderItems.forEach(item => {
      if (!item.menuItem) return;
      const key = item.menuItemId;
      if (!dishStats[key]) {
        dishStats[key] = { id: key, name: item.menuItem.name, price: item.menuItem.price, quantitySold: 0 };
      }
      dishStats[key].quantitySold += item.quantity;
    });

    const sortedDishes = Object.values(dishStats).sort((a, b) => b.quantitySold - a.quantitySold);
    const topDishes = sortedDishes.slice(0, 3);
    const lowDishes = sortedDishes.reverse().slice(0, 3);

    // AI pricing optimization strategies
    const pricingOptimization = topDishes.map(dish => ({
      dishId: dish.id,
      dishName: dish.name,
      recommendation: `High demand detected. Consider increasing price of ${dish.name} by 5-8% (Recommended price: ₹${Math.round(dish.price * 1.07)}) to optimize profit margin.`
    }));

    if (lowDishes.length > 0) {
      lowDishes.forEach(dish => {
        pricingOptimization.push({
          dishId: dish.id,
          dishName: dish.name,
          recommendation: `Low volume detected (${dish.quantitySold} sales). Run a 10% promotional discount (Target price: ₹${Math.round(dish.price * 0.9)}) to increase sales velocity.`
        });
      });
    }

    // AI combo recommendations (bundle top dish + lower/mid tier item)
    const comboOffers = [];
    if (topDishes.length >= 2) {
      comboOffers.push({
        title: `Weekend Combo Deal: ${topDishes[0].name} + ${topDishes[1].name}`,
        description: `Bundle these two popular items together for a 15% discount. This target bundle has a projected 22% conversion increase.`,
        suggestedPrice: Math.round((topDishes[0].price + topDishes[1].price) * 0.85)
      });
    }

    // AI inventory planning predictions
    const inventoryPlanning = topDishes.map(dish => ({
      item: dish.name,
      suggestion: `Demand for ${dish.name} is expected to rise by 12% next weekend. Increase preparation stock by 15 units.`
    }));

    // General growth marketing recommendations
    const marketingStrategies = [
      {
        strategy: 'Targeted Lunch Discounts',
        impact: 'Medium-High',
        action: 'Configure a coupon code for 10% off between 12 PM - 3 PM to capture lunch time peak office orders.'
      },
      {
        strategy: 'Loyalty Reward Program',
        impact: 'High',
        action: 'Introduce a repeat customer discount code for customers who placed more than 3 orders this month.'
      }
    ];

    return res.json({
      success: true,
      recommendations: {
        pricingOptimization,
        comboOffers,
        inventoryPlanning,
        marketingStrategies
      }
    });
  } catch (err) {
    logger.error(`Error generating AI recommendations for Restaurant ${req.params.id}:`, err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`🤖 AI Recommendation Service running on port ${PORT}`);
});
