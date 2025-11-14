// --------------------------
// FILE: modules/auth/auth.routes.js
// --------------------------
const express = require("express");
const router = express.Router();
const { signup, login } = require("../Controller/auth.controller");

router.post("/signup", signup);
router.post("/login", login);

module.exports = router;