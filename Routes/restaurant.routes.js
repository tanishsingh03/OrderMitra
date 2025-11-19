// // // --------------------------
// // // FILE: Routes/restaurant.routes.js
// // // --------------------------
// // const express = require("express");
// // const router = express.Router();

// // const {
// //     getRestaurantProfile,
// //     updateRestaurant,
// //     getRestaurantOrders,
// //     addMenuItem
// // } = require("../Controller/restaurant.controller");
// // const { getMenu } = require("../Controller/restaurant.menu.controller");

// // const { authenticate } = require("../Middleware/auth.middleware");

// // // RESTAURANT PROFILE ROUTES
// // router.get("/restaurant/me", authenticate, getRestaurantProfile);
// // router.put("/restaurant/update", authenticate, updateRestaurant);

// // // RESTAURANT ORDERS
// // router.get("/restaurant/orders", authenticate, getRestaurantOrders);

// // // RESTAURANT MENU
// // // router.get("/restaurant/menu", authenticate, async (req, res) => {
// // //     try {
// // //         const menu = await prisma.menuItem.findMany({
// // //             where: { restaurantId: req.user.id }
// // //         });
// // //         res.json({ success: true, menu });
// // //     } catch (err) {
// // //         res.json({ success: false, message: err.message });
// // //     }
// // // });
// // router.get("/restaurant/menu", authenticate, getMenu);
// // router.post("/restaurant/menu/add", authenticate, addMenuItem);

// // module.exports = router;

// const express = require("express");
// const router = express.Router();
// const upload = require("../Middleware/upload");  // multer
// const { authenticate } = require("../Middleware/auth.middleware");

// const {
//     getRestaurantProfile,
//     updateRestaurant,
//     addMenuItem,
//     getRestaurantOrders
// } = require("../Controller/restaurant.controller");

// // PROFILE
// router.get("/restaurant/me", authenticate, getRestaurantProfile);
// router.put("/restaurant/update", authenticate, upload.single("image"), updateRestaurant);

// // MENU
// router.post("/restaurant/menu/add", authenticate, upload.single("image"), addMenuItem);

// // ORDERS
// router.get("/restaurant/orders", authenticate, getRestaurantOrders);

// module.exports = router;


const express = require("express");
const router = express.Router();
const upload = require("../Middleware/upload");  // multer
const { authenticate } = require("../Middleware/auth.middleware");

const {
    getRestaurantProfile,
    updateRestaurant,
    addMenuItem,
    getRestaurantOrders
} = require("../Controller/restaurant.controller");

// PROFILE
router.get("/restaurant/me", authenticate, getRestaurantProfile);
router.put("/restaurant/update", authenticate, upload.single("image"), updateRestaurant);

// MENU
router.post("/restaurant/menu/add", authenticate, upload.single("image"), addMenuItem);

// ORDERS
router.get("/restaurant/orders", authenticate, getRestaurantOrders);

module.exports = router;
