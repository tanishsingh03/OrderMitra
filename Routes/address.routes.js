// Routes/address.routes.js
const express = require("express");
const router = express.Router();
const {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
} = require("../Controller/address.controller");
const { authenticate } = require("../Middleware/auth.middleware");

router.get("/", authenticate, getAddresses);
router.post("/", authenticate, addAddress);
router.put("/:addressId", authenticate, updateAddress);
router.delete("/:addressId", authenticate, deleteAddress);
router.post("/:addressId/default", authenticate, setDefaultAddress);

module.exports = router;

