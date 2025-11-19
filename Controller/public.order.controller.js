// Controller/public.order.controller.js
const prisma = require("../Utility/prisma");

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;          // from JWT
    const role = req.user.role;

    if (role !== "customer") {
      return res.json({ success: false, message: "Only customers can place orders" });
    }

    const { restaurantId, items } = req.body;
    // items expected: [{ id: menuItemId, qty: number }, ... ]

    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    const menuItemIds = items.map(i => i.id);

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } }
    });

    if (menuItems.length !== items.length) {
      return res.json({ success: false, message: "Some menu items not found" });
    }

    // calculate total
    let totalPrice = 0;
    for (const cartItem of items) {
      const dbItem = menuItems.find(m => m.id === cartItem.id);
      if (!dbItem) continue;
      const qty = cartItem.qty || 1;
      totalPrice += dbItem.price * qty;
    }

    // create order
    const orderNumber = "ORD-" + Date.now();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        restaurantId: Number(restaurantId),
        totalPrice,
        status: "PENDING",
      },
    });

    // create order items
    for (const cartItem of items) {
      const qty = cartItem.qty || 1;
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: cartItem.id,
          quantity: qty,
        },
      });
    }

    res.json({
      success: true,
      message: "Order placed successfully",
      orderId: order.id,
      orderNumber,
    });

  } catch (err) {
    console.error("placeOrder error:", err);
    res.json({ success: false, message: err.message });
  }
};
