// Controller/public.order.controller.js
const prisma = require("../Utility/prisma");

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;          // from JWT
    const role = req.user.role;

    // Allow both "customer" and "user" roles (they're the same)
    if (role !== "customer" && role !== "user") {
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

    // Calculate subtotal (items only)
    let subtotal = 0;
    for (const cartItem of items) {
      const dbItem = menuItems.find(m => m.id === cartItem.id);
      if (!dbItem) continue;
      const qty = cartItem.qty || 1;
      subtotal += dbItem.price * qty;
    }

    // Calculate delivery fee (mandatory)
    // Base delivery fee: ₹30, or 5% of subtotal (whichever is higher), max ₹100
    const baseDeliveryFee = 30;
    const percentageDeliveryFee = subtotal * 0.05;
    const deliveryFee = Math.min(Math.max(baseDeliveryFee, percentageDeliveryFee), 100);

    // Calculate handling charges (mandatory)
    // Handling charge: 2% of subtotal, minimum ₹10, maximum ₹50
    const handlingCharge = Math.min(Math.max(subtotal * 0.02, 10), 50);

    // Calculate tax (GST: 5% of subtotal)
    const tax = subtotal * 0.05;

    // Calculate total
    const totalPrice = subtotal + deliveryFee + handlingCharge + tax;

    // Get user's default address if available
    const defaultAddress = await prisma.address.findFirst({
      where: { userId, isDefault: true }
    });

    // Create order with PLACED status
    const orderNumber = "ORD-" + Date.now();

    console.log(`📦 Customer ${userId} placing order ${orderNumber} for restaurant ${restaurantId}`);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId,
        restaurantId: Number(restaurantId),
        addressId: defaultAddress?.id || null,
        deliveryPartnerId: null, // Explicitly set to null
        subtotal,
        deliveryFee,
        tax: handlingCharge, // Using tax field for handling charges
        totalPrice,
        status: "PLACED", // Order starts as PLACED
        items: {
          create: items.map(cartItem => {
            const dbItem = menuItems.find(m => m.id === cartItem.id);
            return {
              menuItemId: cartItem.id,
              quantity: cartItem.qty || 1,
              price: dbItem?.price || 0
            };
          })
        }
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                image: true,
                category: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true
          }
        },
        address: true
      }
    });

    console.log(`✅ Order ${order.orderNumber} created with ${order.items.length} items, status: PLACED`);

    // Emit real-time event to customer and restaurant
    const { publishOrderUpdate } = require("../websocket");
    await publishOrderUpdate({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      userId: order.userId,
      restaurantId: order.restaurantId,
      deliveryPartnerId: null, // No delivery partner assigned yet
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      tax: order.tax,
      totalPrice: order.totalPrice,
      message: "Order placed successfully", // Customer-visible message
      timestamp: new Date().toISOString(),
      type: "ORDER_CREATED"
    });

    // Note: Order will be added to distribution queue when restaurant marks it as READY

    res.json({
      success: true,
      message: "Order placed successfully",
      orderId: order.id,
      orderNumber,
      order,
      breakdown: {
        subtotal,
        deliveryFee,
        handlingCharge,
        tax,
        totalPrice
      }
    });

  } catch (err) {
    console.error("placeOrder error:", err);
    res.json({ success: false, message: err.message });
  }
};
