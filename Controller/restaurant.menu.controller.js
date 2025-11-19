const prisma = require("../Utility/prisma");

// ------------------------------
// GET MENU FOR LOGGED-IN RESTAURANT
// ------------------------------
exports.getMenu = async (req, res) => {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.json({ success: false, message: "Access denied" });
        }

        const menu = await prisma.menuItem.findMany({
            where: { restaurantId: req.user.id }
        });

        return res.json({ success: true, menu });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

// ------------------------------
// ADD MENU ITEM WITH IMAGE
// ------------------------------
exports.addMenuItem = async (req, res) => {
    try {
        const { name, price } = req.body;
        const image = req.file ? req.file.filename : null; // multer stores filename

        if (!name || !price) {
            return res.json({ success: false, message: "Name & price required" });
        }

        const item = await prisma.menuItem.create({
            data: {
                name,
                price: Number(price),
                image: image,
                restaurantId: req.user.id
            }
        });

        res.json({ success: true, item });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

// ------------------------------
// UPDATE MENU ITEM + IMAGE CHANGE
// ------------------------------
exports.updateMenuItem = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, price } = req.body;

        const image = req.file ? req.file.filename : null;

        const updatedData = {
            ...(name && { name }),
            ...(price && { price: Number(price) }),
            ...(image && { image })
        };

        const item = await prisma.menuItem.update({
            where: { id },
            data: updatedData
        });

        res.json({ success: true, item });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

// ------------------------------
// DELETE MENU ITEM
// ------------------------------
exports.deleteMenuItem = async (req, res) => {
    try {
        const id = Number(req.params.id);

        await prisma.menuItem.delete({ where: { id } });

        res.json({ success: true, message: "Menu item deleted" });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};
