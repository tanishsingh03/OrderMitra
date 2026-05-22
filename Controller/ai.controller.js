const prisma = require("../Utility/prisma");
const { publishOrderUpdate } = require("../websocket");

const AI_PROVIDER = (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "openai")).toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const money = (value) => Number((value || 0).toFixed(2));
const percent = (value) => Number((value || 0).toFixed(1));

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function getRange(days = 30) {
    const to = new Date();
    const from = new Date(to);
    from.setDate(to.getDate() - days + 1);
    from.setHours(0, 0, 0, 0);
    return { from, to };
}

function hourLabel(hour) {
    const suffix = hour >= 12 ? "PM" : "AM";
    const value = hour % 12 || 12;
    return `${value} ${suffix}`;
}

function priorityRank(priority) {
    return { critical: 4, high: 3, medium: 2, low: 1 }[priority] || 0;
}

function extractOpenAIText(payload) {
    if (payload?.output_text) return payload.output_text;
    const parts = [];
    for (const output of payload?.output || []) {
        for (const content of output.content || []) {
            if (content.text) parts.push(content.text);
        }
    }
    return parts.join("\n").trim();
}

function extractGeminiText(payload) {
    return (payload?.candidates || [])
        .flatMap((candidate) => candidate.content?.parts || [])
        .map((part) => part.text || "")
        .join("\n")
        .trim();
}

function extractJsonArray(text) {
    const cleaned = String(text || "")
        .replace(/```json/gi, "```")
        .replace(/```/g, "")
        .trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return [];
    try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("Failed to parse AI recommendation JSON:", err.message);
        return [];
    }
}

function normalizeRecommendations(items) {
    const allowedPriorities = new Set(["critical", "high", "medium", "low"]);
    return (items || [])
        .map((item) => ({
            recommendationType: String(item.recommendationType || item.type || "growth").toLowerCase().replace(/\s+/g, "_"),
            title: String(item.title || "").trim(),
            description: String(item.description || "").trim(),
            confidenceScore: Math.max(0, Math.min(100, Number(item.confidenceScore || item.confidence || 0))),
            priorityLevel: allowedPriorities.has(String(item.priorityLevel || item.priority || "").toLowerCase())
                ? String(item.priorityLevel || item.priority).toLowerCase()
                : "medium",
            metadata: {
                source: "ai-generated",
                evidence: item.evidence || item.metadata?.evidence || null,
                suggestedAction: item.suggestedAction || item.metadata?.suggestedAction || null
            }
        }))
        .filter((item) => item.title && item.description)
        .slice(0, 8)
        .sort((a, b) => priorityRank(b.priorityLevel) - priorityRank(a.priorityLevel) || b.confidenceScore - a.confidenceScore);
}

function buildRecommendationInstruction(context) {
    return [
        "Generate restaurant growth recommendations for OrderMitra.",
        "Use ONLY the provided restaurant analytics JSON. Do not invent orders, competitors, ratings, prices, or customer behavior.",
        "If there is not enough evidence for a recommendation, return an empty JSON array.",
        "Return ONLY a JSON array. No markdown. No explanation outside JSON.",
        "Each object must have: recommendationType, title, description, confidenceScore, priorityLevel, evidence, suggestedAction.",
        "priorityLevel must be one of: critical, high, medium, low.",
        "confidenceScore must be 0-100 and should be lower when data is sparse.",
        `Restaurant analytics JSON:\n${JSON.stringify(context, null, 2)}`
    ].join("\n\n");
}

async function collectRestaurantIntelligence(restaurantId, days = 30) {
    const { from, to } = getRange(days);
    const previousFrom = new Date(from);
    previousFrom.setDate(previousFrom.getDate() - days);

    const [restaurant, orders, previousOrders, ratings, menu] = await Promise.all([
        prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { id: true, name: true, cuisine: true, rating: true, totalRatings: true, prepTime: true, address: true }
        }),
        prisma.order.findMany({
            where: { restaurantId, createdAt: { gte: from, lte: to } },
            include: {
                user: { select: { id: true, name: true, email: true } },
                items: { include: { menuItem: true } }
            },
            orderBy: { createdAt: "asc" }
        }),
        prisma.order.findMany({
            where: { restaurantId, createdAt: { gte: previousFrom, lt: from } },
            select: { totalPrice: true, status: true, paymentStatus: true }
        }),
        prisma.rating.findMany({
            where: { restaurantId },
            include: { menuItem: true, user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
            take: 80
        }),
        prisma.menuItem.findMany({
            where: { restaurantId },
            include: { tags: true },
            orderBy: { createdAt: "desc" }
        })
    ]);

    const paidOrders = orders.filter((order) => order.status === "DELIVERED" || order.paymentStatus === "PAID");
    const cancelledOrders = orders.filter((order) => order.status === "CANCELLED");
    const activeOrders = orders.filter((order) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(order.status));
    const revenue = paidOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const previousRevenue = previousOrders
        .filter((order) => order.status === "DELIVERED" || order.paymentStatus === "PAID")
        .reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, label: hourLabel(hour), orders: 0, revenue: 0 }));
    const customers = new Map();
    const dishStats = new Map();
    const pairStats = new Map();
    const dayStats = Array.from({ length: 7 }, (_, day) => ({ day, orders: 0, revenue: 0 }));

    for (const order of orders) {
        const createdAt = new Date(order.createdAt);
        hourly[createdAt.getHours()].orders += 1;
        dayStats[createdAt.getDay()].orders += 1;
        if (order.status === "DELIVERED" || order.paymentStatus === "PAID") {
            hourly[createdAt.getHours()].revenue += order.totalPrice || 0;
            dayStats[createdAt.getDay()].revenue += order.totalPrice || 0;
        }

        const customer = customers.get(order.userId) || {
            id: order.userId,
            name: order.user?.name || order.user?.email || `Customer ${order.userId}`,
            orders: 0,
            revenue: 0
        };
        customer.orders += 1;
        customer.revenue += order.totalPrice || 0;
        customers.set(order.userId, customer);

        const orderDishNames = [];
        for (const item of order.items || []) {
            const menuItem = item.menuItem;
            if (!menuItem) continue;
            orderDishNames.push(menuItem.name);
            const entry = dishStats.get(item.menuItemId) || {
                id: item.menuItemId,
                name: menuItem.name,
                category: menuItem.category || "Other",
                price: menuItem.price || item.price || 0,
                sold: 0,
                revenue: 0,
                hours: Array.from({ length: 24 }, (_, hour) => ({ hour, sold: 0 }))
            };
            entry.sold += item.quantity;
            entry.revenue += (item.price || menuItem.price || 0) * item.quantity;
            entry.hours[createdAt.getHours()].sold += item.quantity;
            dishStats.set(item.menuItemId, entry);
        }

        const uniqueDishNames = [...new Set(orderDishNames)].sort();
        for (let i = 0; i < uniqueDishNames.length; i++) {
            for (let j = i + 1; j < uniqueDishNames.length; j++) {
                const key = `${uniqueDishNames[i]} + ${uniqueDishNames[j]}`;
                pairStats.set(key, (pairStats.get(key) || 0) + 1);
            }
        }
    }

    const dishes = [...dishStats.values()]
        .map((dish) => ({
            ...dish,
            revenue: money(dish.revenue),
            peakHour: dish.hours.sort((a, b) => b.sold - a.sold)[0]
        }))
        .sort((a, b) => b.sold - a.sold);
    const customerList = [...customers.values()].map((customer) => ({ ...customer, revenue: money(customer.revenue) }));
    const repeatCustomers = customerList.filter((customer) => customer.orders > 1).length;
    const deliveredOrders = orders.filter((order) => order.status === "DELIVERED" && order.deliveredAt);
    const deliveryDurations = deliveredOrders
        .map((order) => {
            return (new Date(order.deliveredAt) - new Date(order.createdAt)) / 60000;
        })
        .filter((value) => value !== null && value >= 0);
    const avgDeliveryTime = deliveryDurations.length
        ? deliveryDurations.reduce((sum, value) => sum + value, 0) / deliveryDurations.length
        : 0;
    const avgRating = ratings.length
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length
        : restaurant?.rating || 0;

    return {
        range: { from, to, days },
        restaurant,
        counters: {
            revenue: money(revenue),
            previousRevenue: money(previousRevenue),
            revenueGrowth: previousRevenue ? percent(((revenue - previousRevenue) / previousRevenue) * 100) : 0,
            orders: orders.length,
            activeOrders: activeOrders.length,
            cancelledOrders: cancelledOrders.length,
            cancellationRate: orders.length ? percent((cancelledOrders.length / orders.length) * 100) : 0,
            averageOrderValue: paidOrders.length ? money(revenue / paidOrders.length) : 0,
            customerRetention: customerList.length ? percent((repeatCustomers / customerList.length) * 100) : 0,
            avgDeliveryTime: percent(avgDeliveryTime),
            deliveryEfficiency: avgDeliveryTime ? percent(Math.max(0, 100 - ((avgDeliveryTime - 30) / 30) * 100)) : 100,
            avgRating: percent(avgRating),
            deliveredOrders: deliveredOrders.length
        },
        hourly: hourly.map((item) => ({ ...item, revenue: money(item.revenue) })),
        peakHours: [...hourly].sort((a, b) => b.orders - a.orders).slice(0, 3),
        dayStats,
        dishes: {
            top: dishes.slice(0, 5),
            least: dishes.slice(-5).reverse(),
            combos: [...pairStats.entries()]
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5),
            lowRated: ratings
                .filter((rating) => rating.menuItem && rating.rating <= 3)
                .map((rating) => ({ dish: rating.menuItem.name, rating: rating.rating, comment: rating.comment }))
                .slice(0, 5)
        },
        customers: {
            unique: customerList.length,
            repeat: repeatCustomers,
            mostActive: customerList.sort((a, b) => b.orders - a.orders).slice(0, 5)
        },
        ratings: ratings.slice(0, 10).map((rating) => ({
            rating: rating.rating,
            comment: rating.comment,
            dish: rating.menuItem?.name,
            customer: rating.user?.name
        })),
        menu: {
            total: menu.length,
            available: menu.filter((item) => item.isAvailable).length,
            tagged: menu.filter((item) => item.tags?.length).length
        }
    };
}

function buildRecommendations(context) {
    const recommendations = [];
    const hasEnoughOrders = context.counters.orders >= 3;
    const topDish = context.dishes.top[0];
    const lowDish = context.dishes.least.find((dish) => dish.sold > 0) || context.dishes.lowRated[0];
    const topCombo = context.dishes.combos[0];
    const peakHour = context.peakHours.find((hour) => hour.orders > 0);
    const weekendRevenue = context.dayStats
        .filter((day) => day.day === 0 || day.day === 6)
        .reduce((sum, day) => sum + day.revenue, 0);
    const weekdayRevenue = context.dayStats
        .filter((day) => day.day >= 1 && day.day <= 5)
        .reduce((sum, day) => sum + day.revenue, 0);

    if (topDish && topDish.sold >= 3) {
        recommendations.push({
            recommendationType: "dish_performance",
            title: `${topDish.name} is your current top seller`,
            description: `${topDish.name} has ${topDish.sold} units sold and ${money(topDish.revenue)} revenue in the selected data window.`,
            confidenceScore: Math.min(96, 72 + topDish.sold * 3),
            priorityLevel: "medium",
            metadata: { dishId: topDish.id, sold: topDish.sold, revenue: topDish.revenue }
        });
    }

    if (topCombo && topCombo.count >= 2) {
        recommendations.push({
            recommendationType: "combo",
            title: `Create a combo for ${topCombo.name}`,
            description: `Customers ordered this pairing ${topCombo.count} times. Offer it as a bundled deal to increase average order value.`,
            confidenceScore: Math.min(94, 70 + topCombo.count * 5),
            priorityLevel: "medium",
            metadata: topCombo
        });
    }

    if (lowDish && (lowDish.sold >= 3 || lowDish.rating <= 3)) {
        recommendations.push({
            recommendationType: "dish_performance",
            title: `Improve or reposition ${lowDish.name || lowDish.dish}`,
            description: `${lowDish.name || lowDish.dish} has a weak real signal from sales or ratings. Review its photo, description, price, and customer feedback before changing the item.`,
            confidenceScore: 81,
            priorityLevel: "medium",
            metadata: lowDish
        });
    }

    if (peakHour && peakHour.orders >= 3) {
        recommendations.push({
            recommendationType: "staffing",
            title: `Increase staff around ${peakHour.label}`,
            description: `${peakHour.orders} real orders were placed around ${peakHour.label}. Use this as your current peak-hour signal.`,
            confidenceScore: Math.min(93, 74 + peakHour.orders * 4),
            priorityLevel: peakHour.orders > 5 ? "high" : "medium",
            metadata: peakHour
        });
    }

    if (context.counters.cancellationRate >= 10) {
        recommendations.push({
            recommendationType: "cancellation",
            title: "Reduce order cancellations",
            description: `Cancellation rate is ${context.counters.cancellationRate}%. Check unavailable items, prep time accuracy, and late acceptance during busy hours.`,
            confidenceScore: 88,
            priorityLevel: "high",
            metadata: { cancellationRate: context.counters.cancellationRate }
        });
    }

    if (context.counters.customerRetention < 25 && context.customers.unique >= 3) {
        recommendations.push({
            recommendationType: "retention",
            title: "Launch a repeat-customer reward",
            description: `Repeat customer rate is ${context.counters.customerRetention}%. Offer a loyalty coupon for customers after their second order.`,
            confidenceScore: 84,
            priorityLevel: "high",
            metadata: { repeatCustomers: context.customers.repeat, uniqueCustomers: context.customers.unique }
        });
    }

    if (context.counters.deliveredOrders >= 3 && context.counters.avgDeliveryTime > 45) {
        recommendations.push({
            recommendationType: "delivery",
            title: "Improve delivery speed",
            description: `Average delivery time is ${context.counters.avgDeliveryTime} minutes across ${context.counters.deliveredOrders} delivered orders.`,
            confidenceScore: 86,
            priorityLevel: "high",
            metadata: { avgDeliveryTime: context.counters.avgDeliveryTime }
        });
    }

    if (hasEnoughOrders && (weekdayRevenue > 0 || weekendRevenue > 0)) {
        const weekendLift = weekdayRevenue ? percent(((weekendRevenue / 2) - (weekdayRevenue / 5)) / Math.max(weekdayRevenue / 5, 1) * 100) : 0;
        recommendations.push({
            recommendationType: "marketing",
            title: weekendLift >= 0 ? "Double down on weekend promotions" : "Recover weekend traffic",
            description: weekendLift >= 0
                ? `Weekend revenue is ${weekendLift}% above weekday average based on your real order history.`
                : `Weekend revenue is ${Math.abs(weekendLift)}% below weekday average based on your real order history.`,
            confidenceScore: 79,
            priorityLevel: "medium",
            metadata: { weekendLift }
        });
    }

    if (context.menu.total && context.menu.tagged / context.menu.total < 0.8) {
        recommendations.push({
            recommendationType: "discoverability",
            title: "Tag more menu items",
            description: `${context.menu.tagged}/${context.menu.total} menu items have dietary tags. Add tags like Jain, Vegan, High Protein, and Gluten-Free to improve filtered discovery.`,
            confidenceScore: 77,
            priorityLevel: "low",
            metadata: context.menu
        });
    }

    return recommendations
        .sort((a, b) => priorityRank(b.priorityLevel) - priorityRank(a.priorityLevel) || b.confidenceScore - a.confidenceScore)
        .slice(0, 8);
}

function buildFallbackChatResponse(message, context) {
    const question = message.toLowerCase();
    const topDish = context.dishes.top[0];
    const lowDish = context.dishes.least.find((dish) => dish.sold > 0);
    const peakHour = context.peakHours.find((hour) => hour.orders > 0);
    const topCustomer = context.customers.mostActive[0];
    const topCombo = context.dishes.combos[0];

    if (question.includes("best") || question.includes("performing")) {
        return topDish
            ? `${topDish.name} is performing best with ${topDish.sold} units sold and ${money(topDish.revenue)} revenue in the last ${context.range.days} days.`
            : "There is not enough order history yet to identify a best-performing dish.";
    }
    if (question.includes("low") || question.includes("remove")) {
        return lowDish
            ? `${lowDish.name} is the weakest seller right now with ${lowDish.sold} units sold. Improve its photo/description, test a small discount, or remove it if ratings remain weak.`
            : "No clearly low-performing dish is visible yet. Keep collecting orders and ratings.";
    }
    if (question.includes("peak") || question.includes("hour")) {
        return peakHour
            ? `Your current peak order hour is around ${peakHour.label}. Prepare stock and staff before this window.`
            : "Peak hours are not clear yet because there are not enough orders.";
    }
    if (question.includes("customer")) {
        return topCustomer
            ? `${topCustomer.name} is your most active customer with ${topCustomer.orders} orders. Repeat customer retention is ${context.counters.customerRetention}%.`
            : "No repeat-customer pattern is visible yet.";
    }
    if (question.includes("combo") || question.includes("promote")) {
        return topCombo
            ? `Create a combo for ${topCombo.name}. Customers already bought that pair ${topCombo.count} times.`
            : topDish
                ? `Promote ${topDish.name} tonight because it is your strongest item.`
                : "Start with one opening coupon and promote your clearest hero dish.";
    }
    if (question.includes("delivery")) {
        return `Average delivery time is ${context.counters.avgDeliveryTime} minutes and delivery efficiency is ${context.counters.deliveryEfficiency}%. Focus on prep-time accuracy and peak-hour rider availability.`;
    }
    if (question.includes("sales") || question.includes("revenue")) {
        return `Revenue for the last ${context.range.days} days is ${money(context.counters.revenue)} with ${context.counters.orders} orders. Growth versus the previous period is ${context.counters.revenueGrowth}%.`;
    }

    return `For the last ${context.range.days} days: revenue is ${money(context.counters.revenue)}, orders are ${context.counters.orders}, retention is ${context.counters.customerRetention}%, cancellation rate is ${context.counters.cancellationRate}%, and ${topDish ? `${topDish.name} is your strongest dish` : "more orders are needed for dish ranking"}.`;
}

async function callOpenAI(message, context) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured");
    }

    const payload = {
        model: OPENAI_MODEL,
        input: [
            {
                role: "system",
                content: "You are OrderMitra AI, a concise restaurant growth advisor. Use only the provided restaurant analytics context. Give practical, specific recommendations in 2-5 sentences. Mention uncertainty when data is sparse."
            },
            {
                role: "user",
                content: `Restaurant analytics context:\n${JSON.stringify(context, null, 2)}\n\nRestaurant owner question: ${message}`
            }
        ]
    };

    const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { response: extractOpenAIText(data) || buildFallbackChatResponse(message, context), provider: "openai", model: OPENAI_MODEL };
}

async function callGemini(message, context) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured");
    }

    const payload = {
        systemInstruction: {
            parts: [
                {
                    text: "You are OrderMitra AI, a concise restaurant growth advisor. Use only the provided restaurant analytics context. Give practical, specific recommendations in 2-5 sentences. Mention uncertainty when data is sparse."
                }
            ]
        },
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: `Restaurant analytics context:\n${JSON.stringify(context, null, 2)}\n\nRestaurant owner question: ${message}`
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 700
        }
    };

    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return { response: extractGeminiText(data) || buildFallbackChatResponse(message, context), provider: "gemini", model: GEMINI_MODEL };
}

async function callGroq(message, context) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("Groq API key is not configured");
    }

    const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.35,
            max_tokens: 700,
            messages: [
                {
                    role: "system",
                    content: "You are OrderMitra AI, a concise restaurant growth advisor. Use only the provided restaurant analytics context. Give practical, specific recommendations in 2-5 sentences. Mention uncertainty when data is sparse."
                },
                {
                    role: "user",
                    content: `Restaurant analytics context:\n${JSON.stringify(context, null, 2)}\n\nRestaurant owner question: ${message}`
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { response: text || "Groq returned an empty response.", provider: "groq", model: GROQ_MODEL };
}

async function callAI(message, context) {
    if (AI_PROVIDER === "gemini") return callGemini(message, context);
    if (AI_PROVIDER === "groq") return callGroq(message, context);
    return callOpenAI(message, context);
}

async function generateOpenAIRecommendations(context) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured");
    }

    const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            input: [
                {
                    role: "system",
                    content: "You generate strict JSON restaurant growth recommendations from real analytics data only."
                },
                {
                    role: "user",
                    content: buildRecommendationInstruction(context)
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI recommendation request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
        provider: "openai",
        model: OPENAI_MODEL,
        recommendations: normalizeRecommendations(extractJsonArray(extractOpenAIText(data)))
    };
}

async function generateGeminiRecommendations(context) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured");
    }

    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
            systemInstruction: {
                parts: [{ text: "You generate strict JSON restaurant growth recommendations from real analytics data only." }]
            },
            contents: [
                {
                    role: "user",
                    parts: [{ text: buildRecommendationInstruction(context) }]
                }
            ],
            generationConfig: {
                temperature: 0.25,
                maxOutputTokens: 1200,
                responseMimeType: "application/json"
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini recommendation request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
        provider: "gemini",
        model: GEMINI_MODEL,
        recommendations: normalizeRecommendations(extractJsonArray(extractGeminiText(data)))
    };
}

async function generateGroqRecommendations(context) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("Groq API key is not configured");
    }

    const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.25,
            max_tokens: 1200,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "You generate strict JSON restaurant growth recommendations from real analytics data only. Return a JSON object with a recommendations array."
                },
                {
                    role: "user",
                    content: `${buildRecommendationInstruction(context)}\n\nReturn format: {"recommendations":[...]}`
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq recommendation request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";
    let rawRecommendations = extractJsonArray(text);
    if (!rawRecommendations.length) {
        try {
            const parsed = JSON.parse(text);
            rawRecommendations = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
        } catch (_) {}
    }

    return {
        provider: "groq",
        model: GROQ_MODEL,
        recommendations: normalizeRecommendations(rawRecommendations)
    };
}

async function generateAIRecommendations(context) {
    if (AI_PROVIDER === "gemini") return generateGeminiRecommendations(context);
    if (AI_PROVIDER === "groq") return generateGroqRecommendations(context);
    return generateOpenAIRecommendations(context);
}

async function persistRecommendations(restaurantId, context, recommendations, aiMeta = {}) {
    const snapshot = await prisma.aIAnalyticsSnapshot.create({
        data: {
            restaurantId,
            revenue: context.counters.revenue,
            orders: context.counters.orders,
            customerRetention: context.counters.customerRetention,
            deliveryEfficiency: context.counters.deliveryEfficiency,
            topDishes: context.dishes.top,
            snapshot: context
        }
    });

    if (recommendations.length) {
        await prisma.aIRecommendation.createMany({
            data: recommendations.map((rec) => ({
                restaurantId,
                recommendationType: rec.recommendationType,
                title: rec.title,
                description: rec.description,
                confidenceScore: rec.confidenceScore,
                priorityLevel: rec.priorityLevel,
                metadata: { ...(rec.metadata || {}), snapshotId: snapshot.id, provider: aiMeta.provider || null, model: aiMeta.model || null }
            }))
        });
    }
}

async function getRecommendations(req, res) {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.status(403).json({ success: false, message: "Restaurant owners only" });
        }

        const restaurantId = req.user.id;
        const context = await collectRestaurantIntelligence(restaurantId);
        let aiResult = { provider: "unconfigured", model: null, recommendations: [] };
        try {
            aiResult = await generateAIRecommendations(context);
        } catch (err) {
            console.error("AI recommendation provider unavailable:", err.message);
        }
        const recommendations = aiResult.recommendations.map((rec, index) => ({
            id: `ai-${rec.recommendationType}-${index}`,
            restaurantId,
            status: "ai-generated",
            createdAt: new Date(),
            updatedAt: new Date(),
            ...rec
        }));

        return res.json({
            success: true,
            recommendations,
            summary: context,
            generatedAt: new Date(),
            source: "ai",
            provider: aiResult.provider,
            model: aiResult.model,
            aiConfigured: aiResult.provider !== "unconfigured"
        });
    } catch (err) {
        console.error("AI recommendations error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function refreshRecommendations(req, res) {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.status(403).json({ success: false, message: "Restaurant owners only" });
        }

        const restaurantId = req.user.id;
        const context = await collectRestaurantIntelligence(restaurantId);
        const aiResult = await generateAIRecommendations(context);
        const recommendations = aiResult.recommendations;
        await prisma.aIRecommendation.deleteMany({ where: { restaurantId } });
        await persistRecommendations(restaurantId, context, recommendations, aiResult);

        const saved = await prisma.aIRecommendation.findMany({
            where: { restaurantId },
            orderBy: { createdAt: "desc" },
            take: 8
        });

        await publishOrderUpdate({
            type: "AI_RECOMMENDATIONS_UPDATED",
            restaurantId,
            message: "AI growth recommendations refreshed",
            recommendations: saved
        });

        return res.json({
            success: true,
            recommendations: saved,
            summary: context,
            generatedAt: new Date(),
            source: "ai",
            provider: aiResult.provider,
            model: aiResult.model,
            aiConfigured: true
        });
    } catch (err) {
        console.error("AI refresh error:", err);
        return res.json({
            success: true,
            recommendations: [],
            summary: await collectRestaurantIntelligence(req.user.id),
            generatedAt: new Date(),
            source: "ai",
            provider: AI_PROVIDER,
            model: AI_PROVIDER === "gemini" ? GEMINI_MODEL : AI_PROVIDER === "groq" ? GROQ_MODEL : OPENAI_MODEL,
            aiConfigured: false,
            message: `AI provider request failed: ${err.message}. Check your API key/model in .env and restart the backend.`
        });
    }
}

async function chatWithAI(req, res) {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.status(403).json({ success: false, message: "Restaurant owners only" });
        }

        const message = String(req.body.message || "").trim();
        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }

        const restaurantId = req.user.id;
        const context = await collectRestaurantIntelligence(restaurantId);
        let aiResult;
        try {
            aiResult = await callAI(message, context);
        } catch (err) {
            console.error("AI chat provider error:", err.message);
            aiResult = {
                response: `AI chat is not configured or the provider request failed: ${err.message}. Add a valid GEMINI_API_KEY or OPENAI_API_KEY in .env and restart the backend.`,
                provider: "unconfigured"
            };
        }

        const history = await prisma.aIChatHistory.create({
            data: {
                restaurantId,
                message,
                response: aiResult.response,
                metadata: { provider: aiResult.provider, model: aiResult.model || null }
            }
        });

        await publishOrderUpdate({
            type: "AI_CHAT_RESPONSE",
            restaurantId,
            message: "AI assistant response ready"
        });

        return res.json({ success: true, chat: history, response: aiResult.response, provider: aiResult.provider });
    } catch (err) {
        console.error("AI chat error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function getChatHistory(req, res) {
    try {
        if (req.user.role !== "restaurant-owner") {
            return res.status(403).json({ success: false, message: "Restaurant owners only" });
        }

        const history = await prisma.aIChatHistory.findMany({
            where: { restaurantId: req.user.id },
            orderBy: { createdAt: "desc" },
            take: 20
        });

        return res.json({ success: true, history: history.reverse() });
    } catch (err) {
        console.error("AI chat history error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getRecommendations,
    refreshRecommendations,
    chatWithAI,
    getChatHistory,
    collectRestaurantIntelligence,
    buildRecommendations
};
