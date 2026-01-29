// Controller/wallet.controller.js
const prisma = require("../Utility/prisma");
const { publishOrderUpdate } = require("../websocket");

/**
 * Get Wallet Balance
 */
async function getWallet(req, res) {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        console.log(`💰 Fetching wallet for user ${userId} with role ${role}`);

        if (!role) {
            console.error("❌ No role found in request");
            return res.json({ 
                success: false, 
                message: "User role not found. Please login again." 
            });
        }

        let wallet;
        if (role === "customer" || role === "user") {
            wallet = await prisma.wallet.findUnique({
                where: { userId },
                include: {
                    transactions: {
                        orderBy: { createdAt: "desc" },
                        take: 20,
                    },
                },
            });
        } else if (role === "restaurant-owner" || role === "restaurant") {
            wallet = await prisma.wallet.findUnique({
                where: { restaurantId: userId },
                include: {
                    transactions: {
                        orderBy: { createdAt: "desc" },
                        take: 20,
                    },
                },
            });
        } else if (role === "delivery-partner") {
            wallet = await prisma.wallet.findUnique({
                where: { deliveryPartnerId: userId },
                include: {
                    transactions: {
                        orderBy: { createdAt: "desc" },
                        take: 20,
                    },
                },
            });
        } else {
            console.error(`❌ Invalid role: ${role}`);
            return res.json({ 
                success: false, 
                message: `Invalid user role: ${role}` 
            });
        }

        if (!wallet) {
            console.log(`📝 Creating new wallet for ${role} ${userId}`);
            // Create wallet if doesn't exist
            let walletData = {};
            if (role === "customer" || role === "user") {
                walletData.userId = userId;
            } else if (role === "restaurant-owner" || role === "restaurant") {
                walletData.restaurantId = userId;
            } else if (role === "delivery-partner") {
                walletData.deliveryPartnerId = userId;
            }

            wallet = await prisma.wallet.create({ 
                data: walletData,
                include: {
                    transactions: {
                        orderBy: { createdAt: "desc" },
                        take: 20,
                    },
                },
            });
        }

        console.log(`✅ Wallet balance for ${role} ${userId}: ₹${wallet.balance}`);

        return res.json({ success: true, wallet });
    } catch (err) {
        console.error("❌ Error fetching wallet:", err);
        return res.json({ 
            success: false, 
            message: err.message || "Failed to fetch wallet" 
        });
    }
}

/**
 * Get Wallet Transactions
 */
async function getTransactions(req, res) {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let wallet;
        if (role === "customer") {
            wallet = await prisma.wallet.findUnique({ where: { userId } });
        } else if (role === "restaurant-owner") {
            wallet = await prisma.wallet.findUnique({ where: { restaurantId: userId } });
        } else if (role === "delivery-partner") {
            wallet = await prisma.wallet.findUnique({ where: { deliveryPartnerId: userId } });
        }

        if (!wallet) {
            return res.json({ success: true, transactions: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } });
        }

        const [transactions, total] = await Promise.all([
            prisma.walletTransaction.findMany({
                where: { walletId: wallet.id },
                orderBy: { createdAt: "desc" },
                skip,
                take: parseInt(limit),
            }),
            prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
        ]);

        return res.json({
            success: true,
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Add Money to Wallet
 */
async function addMoney(req, res) {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { amount } = req.body;

        console.log(`💰 Adding ₹${amount} to wallet for ${role} ${userId}`);

        if (!amount || amount <= 0) {
            return res.json({ 
                success: false, 
                message: "Valid amount is required" 
            });
        }

        // Only customers can add money
        if (role !== "customer" && role !== "user") {
            return res.json({ 
                success: false, 
                message: "Only customers can add money to wallet" 
            });
        }

        // Use transaction for atomicity
        const result = await prisma.$transaction(async (tx) => {
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            
            if (!wallet) {
                console.log(`📝 Creating new wallet for customer ${userId}`);
                wallet = await tx.wallet.create({ data: { userId } });
            }

            const oldBalance = wallet.balance;
            const newBalance = oldBalance + amount;

            // Update balance
            wallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: newBalance },
            });

            // Create transaction record
            const transaction = await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    amount,
                    type: "credit",
                    description: `Added ₹${amount} to wallet`,
                },
            });

            console.log(`✅ Wallet updated: ₹${oldBalance} → ₹${newBalance} (+₹${amount})`);

            return { wallet, transaction };
        });

        // Broadcast wallet update via WebSocket
        await publishOrderUpdate({
            type: "WALLET_UPDATED",
            userId: userId,
            amount: amount,
            newBalance: result.wallet.balance,
            timestamp: new Date().toISOString()
        });

        return res.json({ success: true, wallet: result.wallet });
    } catch (err) {
        console.error("❌ Error adding money to wallet:", err);
        return res.json({ 
            success: false, 
            message: err.message || "Failed to add money to wallet" 
        });
    }
}

module.exports = {
    getWallet,
    getTransactions,
    addMoney,
};

