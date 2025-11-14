const express = require("express");
const router = express.Router();
const {updateProfile}=require("../Controller/UpdateProfile")
const { authenticate } = require("../Middleware/auth.middleware");
router.put("/updateprofile", authenticate,updateProfile);
module.exports = router;