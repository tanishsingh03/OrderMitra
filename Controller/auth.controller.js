// --------------------------
// FILE: modules/auth/auth.controller.js
// --------------------------
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../Utility/prisma");
const { sendPasswordResetEmail, sendWelcomeEmail } = require("../Utility/email.service");
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

// async function signup(req, res) {
//     const { role } = req.params; // "user" or "restaurant"
//     const { name, email, password, address, phone } = req.body;
//     if (!password) return res.status(400).json({ message: "Password is required" });
//     const hashedPassword = await bcrypt.hash(password, 10);
//     try {
//         let result;
//         if (role === "user") {
//             result = await prisma.user.create({ data: { name, email, password: hashedPassword, address, phone } });
//         } else if (role === "restaurant") {
//             result = await prisma.restaurant.create({ data: { name, email, password: hashedPassword, address, phone } });
//         } else {
//             return res.status(400).json({ message: "Invalid role" });
//         }
//         res.json({ message: "Signup successful", user: result });
//     } catch (err) {
//         res.status(400).json({ message: err.message });
//     }
// }
async function signup(req, res) {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.json({ success: false, message: "All fields required" });
        }
        const existingUser = await prisma.user.findUnique({
            where: { email: email }
        });
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }


        const hashed = await bcrypt.hash(password, 10);
        let user;
        if (role === "customer") {
            user = await prisma.user.create({
                data: {
                    email,
                    password: hashed,
                    name: "",
                    phone: ""
                }
            });
        }

        else if (role === "restaurant-owner") {
            user = await prisma.restaurant.create({
                data: {
                    email,
                    password: hashed,
                    name: "New Restaurant",
                    address: "Not added",
                    phone: ""
                }
            });
        }
        else {
            return res.json({ success: false, message: "Invalid role" });
        }

        // Send welcome email
        try {
            await sendWelcomeEmail(email, user.name || "User");
        } catch (emailError) {
            console.error("Welcome email error:", emailError);
        }

        return res.json({ success: true, message: "Signup successful", user });

    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}


async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ success: false, message: "All fields required" });
        }

        let user = await prisma.user.findUnique({ where: { email } });
        let role = "customer";

        if (!user) {
            user = await prisma.restaurant.findUnique({ where: { email } });
            role = "restaurant-owner";
        }

        // If still not found
        if (!user) {
            return res.json({ success: false, message: "Account not found" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.json({ success: false, message: "Invalid password" });
        }

        // const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });
        const token = jwt.sign(
            { id: user.id, role: role },
            JWT_SECRET,
            { expiresIn: "7d" } // 7 days for better user experience
        );



        // return res.json({
        //     success: true,
        //     message: "Login successful",
        //     token,
        //     user
        // });
        return res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: role,
            }
        });

    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}







/**
 * Forgot Password - Request reset
 */
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        // Find user (customer or restaurant)
        let user = await prisma.user.findUnique({ where: { email } });
        let userType = "user";

        if (!user) {
            user = await prisma.restaurant.findUnique({ where: { email } });
            userType = "restaurant";
        }

        if (!user) {
            // Don't reveal if email exists for security
            return res.json({
                success: true,
                message: "If an account exists with this email, a password reset link has been sent.",
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Save reset token
        if (userType === "user") {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetToken,
                    resetExpires,
                },
            });
        } else {
            await prisma.restaurant.update({
                where: { id: user.id },
                data: {
                    resetToken,
                    resetExpires,
                },
            });
        }

        // Send reset email
        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:6789"}/reset-password.html?token=${resetToken}`;
        await sendPasswordResetEmail(email, resetToken, resetUrl);

        return res.json({
            success: true,
            message: "Password reset link has been sent to your email.",
        });
    } catch (err) {
        console.error("Forgot password error:", err);
        return res.json({ success: false, message: "An error occurred. Please try again." });
    }
}

/**
 * Reset Password - With token
 */
async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.json({ success: false, message: "Token and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.json({ success: false, message: "Password must be at least 6 characters" });
        }

        // Find user with valid reset token (check both User and Restaurant)
        let user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetExpires: {
                    gt: new Date(), // Token not expired
                },
            },
        });

        let userType = "user";
        if (!user) {
            user = await prisma.restaurant.findFirst({
                where: {
                    resetToken: token,
                    resetExpires: {
                        gt: new Date(),
                    },
                },
            });
            userType = "restaurant";
        }

        if (!user) {
            return res.json({ success: false, message: "Invalid or expired reset token" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        if (userType === "user") {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetExpires: null,
                },
            });
        } else {
            await prisma.restaurant.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetExpires: null,
                },
            });
        }

        return res.json({
            success: true,
            message: "Password has been reset successfully. You can now login with your new password.",
        });
    } catch (err) {
        console.error("Reset password error:", err);
        return res.json({ success: false, message: "An error occurred. Please try again." });
    }
}

/**
 * Change Password - For logged in users
 */
async function changePassword(req, res) {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.json({ success: false, message: "Current and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.json({ success: false, message: "New password must be at least 6 characters" });
        }

        // Find user
        let user = await prisma.user.findUnique({ where: { id: userId } });
        let userType = "user";

        if (!user) {
            user = await prisma.restaurant.findUnique({ where: { id: userId } });
            userType = "restaurant";
        }

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Verify current password
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return res.json({ success: false, message: "Current password is incorrect" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        if (userType === "user") {
            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword },
            });
        } else {
            await prisma.restaurant.update({
                where: { id: userId },
                data: { password: hashedPassword },
            });
        }

        return res.json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (err) {
        console.error("Change password error:", err);
        return res.json({ success: false, message: "An error occurred. Please try again." });
    }
}

module.exports = { signup, login, forgotPassword, resetPassword, changePassword };


