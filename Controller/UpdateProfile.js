// const bcrypt = require("bcryptjs");
// const prisma = require("../Utility/prisma");

// async function updateProfile(req, res) {
//     try {
//         const userId = req.user.id;
//         const role = req.user.role;

//         const { name, address, phone, password } = req.body;

//         let data = {};
//         if (name) data.name = name;
//         if (address) data.address = address;
//         if (phone) data.phone = phone;
//         if (password) data.password = await bcrypt.hash(password, 10);

//         let updatedUser;

//         if (role === "user") {
//             updatedUser = await prisma.user.update({ where: { id: userId }, data });
//         } else if (role === "restaurant") {
//             updatedUser = await prisma.restaurant.update({ where: { id: userId }, data });
//         } else {
//             return res.status(400).json({ success: false, message: "Invalid role" });
//         }

//         delete updatedUser.password;

//         return res.json({
//             success: true,
//             message: "Profile updated",
//             user: updatedUser,
//             role
//         });

//     } catch (err) {
//         return res.status(400).json({ success: false, message:"Update Failed" });
//     }
// }

// module.exports = { updateProfile };




const bcrypt = require("bcryptjs");
const prisma = require("../Utility/prisma");

async function updateCustomer(req, res) {
    try {
        const { name, email, password, phone } = req.body;

        // Accept both "customer" and "user" role
        const userRole = req.user.role?.toLowerCase().replace(/_/g, "-");
        if (userRole !== "customer" && userRole !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied. This endpoint is for customers only."
            });
        }

        // Build update data object
        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;

        // Only update email if provided and check for duplicates
        if (email && email !== req.user.email) {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing && existing.id !== req.user.id) {
                return res.status(409).json({
                    success: false,
                    message: "Email already in use by another account"
                });
            }
            updateData.email = email;
        }

        // Only hash and update password if provided
        if (password && password.trim() !== "") {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters"
                });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Perform update
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData
        });

        // Remove password from response
        delete updated.password;

        return res.json({
            success: true,
            message: "Profile updated successfully",
            user: updated
        });

    } catch (err) {
        console.error("Update customer error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile: " + err.message
        });
    }
}

async function getCustomerProfile(req, res) {
    try {
        // Accept both "customer" and "user" role
        const userRole = req.user.role?.toLowerCase().replace(/_/g, "-");
        if (userRole !== "customer" && userRole !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied. This endpoint is for customers only."
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                addresses: true,  // Include addresses for profile completeness check
                wallet: true       // Include wallet info
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Remove sensitive data
        delete user.password;
        delete user.resetToken;
        delete user.resetExpires;

        return res.json({ success: true, user });

    } catch (err) {
        console.error("Get customer profile error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch profile: " + err.message
        });
    }
}

module.exports = { updateCustomer, getCustomerProfile };
