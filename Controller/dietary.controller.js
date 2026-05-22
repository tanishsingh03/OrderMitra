const prisma = require("../Utility/prisma");

const defaultTags = [
    { name: "Vegan", slug: "vegan", description: "Contains no animal products" },
    { name: "Vegetarian", slug: "vegetarian", description: "Contains no meat or seafood" },
    { name: "Gluten Free", slug: "gluten-free", description: "Prepared without gluten ingredients" },
    { name: "Dairy Free", slug: "dairy-free", description: "Prepared without dairy ingredients" },
    { name: "Peanut Free", slug: "peanut-free", description: "Prepared without peanut ingredients" },
    { name: "High Protein", slug: "high-protein", description: "Higher protein menu option" },
    { name: "Keto", slug: "keto", description: "Low-carb, high-fat friendly option" },
    { name: "Spicy", slug: "spicy", description: "Spicy menu option" }
];

function slugify(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function ensureDefaultTags() {
    const count = await prisma.foodTag.count();
    if (count > 0) return;

    await prisma.foodTag.createMany({
        data: defaultTags,
        skipDuplicates: true
    });
}

async function getFoodTags(req, res) {
    try {
        await ensureDefaultTags();

        const tags = await prisma.foodTag.findMany({
            orderBy: { name: "asc" }
        });

        res.json({ success: true, tags });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function createFoodTag(req, res) {
    try {
        const { name, description } = req.body;
        const slug = slugify(req.body.slug || name);

        if (!name || !slug) {
            return res.status(400).json({ success: false, message: "Tag name is required" });
        }

        const tag = await prisma.foodTag.upsert({
            where: { slug },
            update: { name, description },
            create: { name, slug, description }
        });

        res.status(201).json({ success: true, tag });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function filterMenuItems(req, res) {
    try {
        const {
            tags,
            matchType = "OR",
            restaurantId,
            priceMin,
            priceMax,
            isAvailable,
            limit = "50"
        } = req.query;

        const tagSlugs = tags
            ? String(tags).split(",").map((tag) => tag.trim()).filter(Boolean)
            : [];

        const where = {};

        if (restaurantId) where.restaurantId = Number(restaurantId);
        if (isAvailable === "true") where.isAvailable = true;

        if (priceMin || priceMax) {
            where.price = {};
            if (priceMin) where.price.gte = Number(priceMin);
            if (priceMax) where.price.lte = Number(priceMax);
        }

        if (tagSlugs.length > 0) {
            if (String(matchType).toUpperCase() === "AND") {
                where.AND = tagSlugs.map((slug) => ({
                    tags: { some: { slug } }
                }));
            } else {
                where.tags = { some: { slug: { in: tagSlugs } } };
            }
        }

        const menuItems = await prisma.menuItem.findMany({
            where,
            include: {
                tags: true,
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                        cuisine: true,
                        rating: true
                    }
                }
            },
            orderBy: { updatedAt: "desc" },
            take: Math.min(Number(limit) || 50, 100)
        });

        res.json({ success: true, menuItems });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function assignMenuItemTag(req, res) {
    try {
        const menuItemId = Number(req.params.itemId);
        const tagId = Number(req.body.tagId);

        if (!menuItemId || !tagId) {
            return res.status(400).json({ success: false, message: "Menu item and tag are required" });
        }

        const item = await prisma.menuItem.findFirst({
            where: {
                id: menuItemId,
                restaurantId: req.user.id
            },
            include: { tags: true }
        });

        if (!item) {
            return res.status(404).json({ success: false, message: "Menu item not found" });
        }

        const updated = await prisma.menuItem.update({
            where: { id: menuItemId },
            data: {
                tags: {
                    connect: { id: tagId }
                }
            },
            include: { tags: true }
        });

        res.json({ success: true, menuItem: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function removeMenuItemTag(req, res) {
    try {
        const menuItemId = Number(req.params.itemId);
        const tagId = Number(req.params.tagId);

        const item = await prisma.menuItem.findFirst({
            where: {
                id: menuItemId,
                restaurantId: req.user.id
            }
        });

        if (!item) {
            return res.status(404).json({ success: false, message: "Menu item not found" });
        }

        const updated = await prisma.menuItem.update({
            where: { id: menuItemId },
            data: {
                tags: {
                    disconnect: { id: tagId }
                }
            },
            include: { tags: true }
        });

        res.json({ success: true, menuItem: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getFoodTags,
    createFoodTag,
    filterMenuItems,
    assignMenuItemTag,
    removeMenuItemTag
};
