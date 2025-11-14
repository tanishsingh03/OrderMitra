const bcrypt = require("bcryptjs");
const prisma = require("../Utility/prisma");

async function updateProfile(req, res) {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        const { name, address, phone, password } = req.body;

        let data = {};
        if (name) data.name = name;
        if (address) data.address = address;
        if (phone) data.phone = phone;
        if (password) data.password = await bcrypt.hash(password, 10);

        let updatedUser;

        if (role === "user") {
            updatedUser = await prisma.user.update({ where: { id: userId }, data });
        } else if (role === "restaurant") {
            updatedUser = await prisma.restaurant.update({ where: { id: userId }, data });
        } else {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        delete updatedUser.password;

        return res.json({
            success: true,
            message: "Profile updated",
            user: updatedUser,
            role
        });

    } catch (err) {
        return res.status(400).json({ success: false, message:"Update Failed" });
    }
}

module.exports = { updateProfile };