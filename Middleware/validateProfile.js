const prisma = require("../Utility/prisma");

/**
 * Middleware to ensure customer has completed profile before placing orders
 * Checks for: name, phone, and at least one address
 */
async function requireCompleteCustomerProfile(req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Only apply to customer role
        const userRole = req.user.role?.toLowerCase().replace(/_/g, "-");
        if (userRole !== "customer" && userRole !== "user") {
            // Not a customer, skip this check
            return next();
        }

        // Fetch user with addresses
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                addresses: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check profile completeness
        const missing = [];

        if (!user.name || user.name.trim() === "") {
            missing.push("name");
        }

        if (!user.phone || user.phone.trim() === "") {
            missing.push("phone number");
        }

        if (!user.addresses || user.addresses.length === 0) {
            missing.push("delivery address");
        }

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Please complete your profile before placing orders. Missing: ${missing.join(", ")}`,
                code: "INCOMPLETE_PROFILE",
                missingFields: missing
            });
        }

        // Profile is complete, proceed
        next();
    } catch (err) {
        console.error("Profile validation error:", err);
        return res.status(500).json({
            success: false,
            message: "Error validating profile"
        });
    }
}

/**
 * Middleware to ensure restaurant has completed profile before being visible
 Checks for: name, address, phone, description, cuisine
 */
async function requireCompleteRestaurantProfile(req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Only apply to restaurant role
        const userRole = req.user.role?.toLowerCase().replace(/_/g, "-");
        if (userRole !== "restaurant-owner" && userRole !== "restaurant") {
            // Not a restaurant, skip this check
            return next();
        }

        // Fetch restaurant
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: req.user.id }
        });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }

        // Check profile completeness
        const missing = [];

        if (!restaurant.name || restaurant.name.trim() === "" || restaurant.name === "New Restaurant") {
            missing.push("restaurant name");
        }

        if (!restaurant.address || restaurant.address.trim() === "" || restaurant.address === "Not added") {
            missing.push("address");
        }

        if (!restaurant.phone || restaurant.phone.trim() === "") {
            missing.push("phone number");
        }

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Please complete your restaurant profile. Missing: ${missing.join(", ")}`,
                code: "INCOMPLETE_PROFILE",
                missingFields: missing
            });
        }

        // Profile is complete, proceed
        next();
    } catch (err) {
        console.error("Restaurant profile validation error:", err);
        return res.status(500).json({
            success: false,
            message: "Error validating restaurant profile"
        });
    }
}

module.exports = {
    requireCompleteCustomerProfile,
    requireCompleteRestaurantProfile
};
