// const express = require("express");
// const router = express.Router();
// const {updateProfile}=require("../Controller/UpdateProfile")
// const { authenticate } = require("../Middleware/auth.middleware");
// router.put("/updateprofile", authenticate,updateProfile);
// module.exports = router;
// router.get("/customer/me", authenticate, getCustomerProfile);
// router.put("/customer/update", authenticate, updateCustomer);
// router.put("/updateprofile", authenticate, updateCustomer);

// module.exports = router;
const express = require("express");
const router = express.Router();

const {
    updateCustomer,
    getCustomerProfile
} = require("../Controller/UpdateProfile");

const { authenticate } = require("../Middleware/auth.middleware");

// GET customer profile
router.get("/customer/me", authenticate, getCustomerProfile);

// UPDATE customer profile
router.put("/customer/update", authenticate, updateCustomer);
router.put("/users/update-profile", authenticate, updateCustomer);

module.exports = router;
