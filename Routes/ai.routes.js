const express = require("express");
const rateLimit = require("express-rate-limit");
const { authenticate, authorize } = require("../Middleware/auth.middleware");
const {
    getRecommendations,
    refreshRecommendations,
    chatWithAI,
    getChatHistory
} = require("../Controller/ai.controller");

const router = express.Router();

const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many AI requests. Please wait a moment and try again." }
});

router.use(authenticate, authorize("restaurant-owner"), aiLimiter);

router.get("/recommendations", getRecommendations);
router.post("/recommendations/refresh", refreshRecommendations);
router.post("/chat", chatWithAI);
router.get("/chat/history", getChatHistory);

module.exports = router;
