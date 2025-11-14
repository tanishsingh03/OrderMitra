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

const app = express();

// Middleware
app.use(cors()); // allow cross-origin requests during dev
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
app.use("/api", restaurantRoutes);
app.use("/api", menuRoutes);



const PORT = process.env.PORT || 6789;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


