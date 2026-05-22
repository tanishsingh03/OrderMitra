const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createLogger, RabbitMQManager, eventTypes, authenticate } = require('../shared');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3006;

const logger = createLogger('payment-service');
const prisma = new PrismaClient();
const rabbitMQ = new RabbitMQManager(logger);

app.use(cors());
app.use(express.json());

// Initialize RabbitMQ and event listeners
async function initRabbit() {
  try {
    await rabbitMQ.connect();

    // Consume ORDER_CREATED to setup payments
    await rabbitMQ.consume('payment-service-order-queue', [
      eventTypes.ORDER_CREATED,
      eventTypes.DELIVERY_COMPLETED
    ], async (routingKey, message) => {
      logger.info(`Received event: ${routingKey}`);

      if (routingKey === eventTypes.ORDER_CREATED) {
        const { orderId, totalPrice, paymentMethod, userId } = message;
        try {
          const payment = await prisma.payment.create({
            data: {
              orderId,
              amount: totalPrice,
              method: paymentMethod,
              status: paymentMethod === 'WALLET' ? 'PAID' : 'PENDING',
              transactionId: `TXN-${Date.now()}`
            }
          });

          if (paymentMethod === 'WALLET') {
            // Debit customer's wallet in PostgreSQL directly
            const wallet = await prisma.wallet.findUnique({ where: { userId } });
            if (wallet && wallet.balance >= totalPrice) {
              await prisma.$transaction([
                prisma.wallet.update({
                  where: { userId },
                  data: { balance: { decrement: totalPrice } }
                }),
                prisma.walletTransaction.create({
                  data: {
                    walletId: wallet.id,
                    amount: totalPrice,
                    type: 'debit',
                    description: `Order Checkout Payment (Order #${orderId})`,
                    orderId: orderId
                  }
                })
              ]);
              logger.info(`Wallet debited successfully for User ID ${userId}`);
              await rabbitMQ.publish(eventTypes.PAYMENT_COMPLETED, { orderId, status: 'PAID' });
            } else {
              await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'FAILED' }
              });
              logger.warn(`Wallet checkout failed for User ID ${userId}: Insufficient funds`);
            }
          } else {
            // Simulated instant gateway payment for UPI / CARD
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'PAID' }
            });
            await rabbitMQ.publish(eventTypes.PAYMENT_COMPLETED, { orderId, status: 'PAID' });
          }
        } catch (err) {
          logger.error(`Error processing payment setup for Order ${orderId}:`, err);
        }
      }

      else if (routingKey === eventTypes.DELIVERY_COMPLETED) {
        const { orderId, deliveryPartnerId, totalPrice } = message;
        try {
          // Find or create rider wallet
          let riderWallet = await prisma.wallet.findUnique({ where: { deliveryPartnerId } });
          if (!riderWallet) {
            riderWallet = await prisma.wallet.create({ data: { deliveryPartnerId, balance: 0 } });
          }

          // Credit Rider Commission (flat ₹40 base fee + delivery commission)
          const riderEarnings = 50.00; 
          await prisma.$transaction([
            prisma.wallet.update({
              where: { deliveryPartnerId },
              data: { balance: { increment: riderEarnings } }
            }),
            prisma.walletTransaction.create({
              data: {
                walletId: riderWallet.id,
                amount: riderEarnings,
                type: 'credit',
                description: `Delivery Commission (Order #${orderId})`,
                orderId
              }
            })
          ]);
          logger.info(`Commission of ₹${riderEarnings} credited to Rider ${deliveryPartnerId}`);

          // Fetch order details to identify the restaurant (simulate query or assume default/lookup)
          // For simplicity, find restaurant id linked to the order via payment lookup if we don't have order service query
          // In a microservices architecture, we can fetch the order details via DB since we use the shared database
          const orderRecord = await prisma.$queryRaw`SELECT "restaurantId" FROM "Order" WHERE id = ${orderId} LIMIT 1`;
          if (orderRecord && orderRecord.length > 0) {
            const restaurantId = orderRecord[0].restaurantId;
            let restWallet = await prisma.wallet.findUnique({ where: { restaurantId } });
            if (!restWallet) {
              restWallet = await prisma.wallet.create({ data: { restaurantId, balance: 0 } });
            }

            // Restaurant Earnings: Order Total minus 15% Platform Commission
            const commission = totalPrice * 0.15;
            const restaurantEarnings = totalPrice - commission;

            await prisma.$transaction([
              prisma.wallet.update({
                where: { restaurantId },
                data: { balance: { increment: restaurantEarnings } }
              }),
              prisma.walletTransaction.create({
                data: {
                  walletId: restWallet.id,
                  amount: restaurantEarnings,
                  type: 'credit',
                  description: `Order Earnings minus 15% Commission (Order #${orderId})`,
                  orderId
                }
              })
            ]);
            logger.info(`Earnings of ₹${restaurantEarnings} credited to Restaurant ${restaurantId}`);
          }
        } catch (err) {
          logger.error(`Error distributing payouts for Completed Order ${orderId}:`, err);
        }
      }
    });
  } catch (err) {
    logger.error('Failed to initialize RabbitMQ in payment-service', err);
  }
}
initServices();

async function initServices() {
  await initRabbit();
}

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'Payment Service' });
});

// Get user/restaurant/rider wallet logs
app.get('/wallet/balance', authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    let queryField = 'userId';
    if (role === 'restaurant-owner') queryField = 'restaurantId';
    if (role === 'delivery-partner') queryField = 'deliveryPartnerId';

    let wallet = await prisma.wallet.findUnique({
      where: { [queryField]: req.user.id },
      include: { transactions: { orderBy: { createdAt: 'desc' } } }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { [queryField]: req.user.id, balance: 0 }
      });
    }

    return res.json({ success: true, wallet });
  } catch (err) {
    logger.error('Get wallet balance error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Process simulated payment checkout
app.post('/process', authenticate, async (req, res) => {
  try {
    const { orderId, paymentMethod, amount } = req.body;
    if (!orderId || !amount) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const payment = await prisma.payment.upsert({
      where: { orderId: parseInt(orderId, 10) },
      update: { status: 'PAID' },
      create: {
        orderId: parseInt(orderId, 10),
        amount: parseFloat(amount),
        method: paymentMethod || 'CARD',
        status: 'PAID',
        transactionId: `TXN-${Date.now()}`
      }
    });

    // Notify other services
    await rabbitMQ.publish(eventTypes.PAYMENT_COMPLETED, {
      orderId: parseInt(orderId, 10),
      status: 'PAID'
    });

    return res.json({ success: true, message: 'Payment processed successfully', payment });
  } catch (err) {
    logger.error('Payment execution error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`💳 Payment Service running on port ${PORT}`);
});
