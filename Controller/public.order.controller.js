const prisma = require("../Utility/prisma");

// --------------------------------------------
// PLACE CUSTOMER ORDER
// --------------------------------------------
exports.placeOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { restaurantId, items } = req.body;

        if (!restaurantId || !items || items.length === 0) {
            return res.json({ success: false, message: "Invalid order data" });
        }

        // Create main order
        const order = await prisma.order.create({
            data: {
                userId,
                restaurantId,
                status: "PENDING"
            }
        });

        // Create order items
        for (const it of items) {
            await prisma.orderItem.create({
                data: {
                    orderId: order.id,
                    menuItemId: it.id,
                    price: it.price
                }
            });
        }

        res.json({
            success: true,
            message: "Order placed successfully",
            orderId: order.id
        });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
