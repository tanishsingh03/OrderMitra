// Controller/address.controller.js
const prisma = require("../Utility/prisma");

/**
 * Get User Addresses
 */
async function getAddresses(req, res) {
    try {
        const userId = req.user.id;
        const addresses = await prisma.address.findMany({
            where: { userId },
            orderBy: [
                { isDefault: "desc" },
                { createdAt: "desc" },
            ],
        });

        return res.json({ success: true, addresses });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Add Address
 */
async function addAddress(req, res) {
    try {
        const userId = req.user.id;
        const { label, street, city, state, zipCode, latitude, longitude, isDefault } = req.body;

        if (!street || !city || !state || !zipCode) {
            return res.json({ success: false, message: "Street, city, state, and zip code are required" });
        }

        // If this is set as default, unset other defaults
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const address = await prisma.address.create({
            data: {
                userId,
                label: label || "Home",
                street,
                city,
                state,
                zipCode,
                latitude,
                longitude,
                isDefault: isDefault || false,
            },
        });

        return res.json({ success: true, address });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Update Address
 */
async function updateAddress(req, res) {
    try {
        const userId = req.user.id;
        const { addressId } = req.params;
        const { label, street, city, state, zipCode, latitude, longitude, isDefault } = req.body;

        // Verify ownership
        const existing = await prisma.address.findFirst({
            where: { id: parseInt(addressId), userId },
        });

        if (!existing) {
            return res.json({ success: false, message: "Address not found" });
        }

        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId, isDefault: true, id: { not: parseInt(addressId) } },
                data: { isDefault: false },
            });
        }

        const address = await prisma.address.update({
            where: { id: parseInt(addressId) },
            data: {
                label,
                street,
                city,
                state,
                zipCode,
                latitude,
                longitude,
                isDefault,
            },
        });

        return res.json({ success: true, address });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Delete Address
 */
async function deleteAddress(req, res) {
    try {
        const userId = req.user.id;
        const { addressId } = req.params;

        // Verify ownership
        const existing = await prisma.address.findFirst({
            where: { id: parseInt(addressId), userId },
        });

        if (!existing) {
            return res.json({ success: false, message: "Address not found" });
        }

        await prisma.address.delete({
            where: { id: parseInt(addressId) },
        });

        return res.json({ success: true, message: "Address deleted" });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

/**
 * Set Default Address
 */
async function setDefaultAddress(req, res) {
    try {
        const userId = req.user.id;
        const { addressId } = req.params;

        // Verify ownership
        const existing = await prisma.address.findFirst({
            where: { id: parseInt(addressId), userId },
        });

        if (!existing) {
            return res.json({ success: false, message: "Address not found" });
        }

        // Unset other defaults
        await prisma.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });

        // Set this as default
        const address = await prisma.address.update({
            where: { id: parseInt(addressId) },
            data: { isDefault: true },
        });

        return res.json({ success: true, address });
    } catch (err) {
        return res.json({ success: false, message: err.message });
    }
}

module.exports = {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
};

