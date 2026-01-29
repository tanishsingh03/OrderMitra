// Routes/wallet.routes.js
const express = require("express");
const router = express.Router();
const { getWallet, getTransactions, addMoney } = require("../Controller/wallet.controller");
const { authenticate } = require("../Middleware/auth.middleware");

router.get("/", authenticate, getWallet);
router.get("/transactions", authenticate, getTransactions);
router.post("/add-money", authenticate, addMoney);

module.exports = router;

