// --------------------------
// FILE: modules/auth/auth.routes.js
// --------------------------
const express = require("express");
const router = express.Router();

const {
    signup,
    login,
    forgotPassword,
    resetPassword,
    changePassword
} = require("../Controller/auth.controller");

const { authenticate } = require("../Middleware/auth.middleware");


// AUTH ROUTES
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", authenticate, changePassword);


// CUSTOMER PROFILE ROUTES
console.log("authenticate:", authenticate);




module.exports = router;
