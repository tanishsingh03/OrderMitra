// --------------------------
// FILE: modules/auth/auth.controller.js
// --------------------------
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../Utility/prisma");
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

        const hashed = await bcrypt.hash(password, 10);
        let user;

        if (role === "customer") {
            user = await prisma.user.create({
                data: { email, password: hashed }
            });
        } else if (role === "restaurant-owner") {
            user = await prisma.restaurant.create({
                data: { email, password: hashed }
            });
        } else {
            return res.json({ success: false, message: "Invalid role" });
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

        if (!user) {
            user = await prisma.restaurant.findUnique({ where: { email } });
        }

        // If still not found
        if (!user) {
            return res.json({ success: false, message: "Account not found" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.json({ success: false, message: "Invalid password" });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

module.exports = { signup, login };
