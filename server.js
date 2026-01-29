// server.js
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

dotenv.config();

const authRoutes = require("./Routes/auth.routes");
const ordersRoutes = require("./Routes/orders.routes");
const restaurantRoutes = require("./Routes/restaurant.routes");
const menuRoutes = require("./Routes/menu.routes");
const updateRoutes=require("./Routes/UpdateRoutes")
const restaurantMenuRoutes = require("./Routes/restaurant.menu.routes");
const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:6789",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
})); // allow cross-origin requests with credentials
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend (public folder)
app.use(express.static(__dirname+ "/public"));

// Health check / root page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Main.html"));
});

// mount modular routes under /api
app.use("/api", authRoutes);
app.use("/api", ordersRoutes);
// app.use("/api", restaurantRoutes);
app.use("/api", restaurantRoutes);
app.use("/api/menu", restaurantMenuRoutes);

app.use("/api", menuRoutes);
app.use("/api",updateRoutes)
app.use("/uploads", express.static("uploads"));

//app.use("/api", require("./Routes/customer.restaurants.routes"));
//app.use("/api", require("./Routes/customer.restaurant.menu.routes"));

const customerRestaurantsRoutes = require("./Routes/customer.restaurants.routes");

app.use("/api", customerRestaurantsRoutes);
const customerRestaurantMenuRoutes = require("./Routes/customer.restaurant.menu.routes");

app.use("/api", customerRestaurantMenuRoutes);


const publicRestaurantRoutes = require("./Routes/public.restaurant.routes");
const publicOrderRoutes = require("./Routes/public.order.routes");

app.use("/api", publicRestaurantRoutes);
app.use("/api", publicOrderRoutes);

// New routes
const deliveryRoutes = require("./Routes/delivery.routes");
const adminRoutes = require("./Routes/admin.routes");
const addressRoutes = require("./Routes/address.routes");
const walletRoutes = require("./Routes/wallet.routes");
const notificationRoutes = require("./Routes/notification.routes");
const ratingRoutes = require("./Routes/rating.routes");
const couponRoutes = require("./Routes/coupon.routes");

app.use("/api/delivery", deliveryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/coupons", couponRoutes);






const PORT = process.env.PORT || 6789;
//app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
const http = require("http");
const { socketServer } = require("./websocket");
const { initRedis } = require("./Utility/orderQueue");

const server = http.createServer(app);
socketServer(server);

// Initialize order queue Redis connection
initRedis();

server.listen(PORT, () => console.log(`🚀 Server running with WebSockets on port ${PORT}`));

// Handle port conflicts gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`💡 Try: lsof -ti:${PORT} | xargs kill -9`);
    console.error(`💡 Or use a different port by setting PORT in .env`);
    process.exit(1);
  } else {
    throw err;
  }
});



