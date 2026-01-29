const token = localStorage.getItem("token");
const role = localStorage.getItem("role");

// Check authentication
if (!token) {
    // DISABLED: window.location.href = "delivery-login.html";
}

// Verify role from token
try {
    if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role !== "delivery-partner") {
            console.error("Invalid role in token:", payload.role);
            // DISABLED: localStorage.clear();
            // DISABLED: window.location.href = "delivery-login.html";
        }
    }
} catch (err) {
    console.error("Error verifying token:", err);
    // DISABLED: localStorage.clear();
    // DISABLED: window.location.href = "delivery-login.html";
}

let currentPartner = null;
let isOnline = false;
let socket = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Initializing Delivery Dashboard...");
    console.log("Token exists:", !!token);
    console.log("Role:", role);

    loadPartnerInfo();
    setupEventListeners();

    // Setup WebSocket after a small delay to ensure DOM is ready
    setTimeout(() => {
        setupWebSocket();
    }, 100);

    loadAvailableOrders();
    loadMyOrders();
    loadEarnings();

    // Load earnings periodically to keep stats updated
    setInterval(() => {
        loadEarnings();
    }, 30000); // Every 30 seconds
});

// Setup WebSocket
function setupWebSocket() {
    if (typeof io === 'undefined') {
        console.error("❌ Socket.io not loaded! Make sure the script is included in HTML.");
        alert("Real-time updates unavailable. Please refresh the page.");
        return;
    }

    if (!token) {
        console.error("❌ No token available for WebSocket");
        return;
    }

    try {
        socket = io("http://localhost:6789", {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });

        socket.on("connect", () => {
            console.log("✅ Delivery WebSocket connected, Socket ID:", socket.id);
            try {
                // Always get ID from token (most reliable)
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    console.log("Token payload:", payload);
                    if (payload.id && payload.role === "delivery-partner") {
                        socket.emit("join", { userId: payload.id, role: "delivery-partner" });
                        console.log(`📤 Emitted join for delivery partner ${payload.id}`);
                    } else {
                        console.error("Invalid token payload:", payload);
                        console.error("Expected role: delivery-partner, got:", payload.role);
                    }
                } else {
                    console.error("No token available for WebSocket");
                }
            } catch (err) {
                console.error("Error joining WebSocket room:", err);
                console.error("Token:", token ? "exists" : "missing");
                if (err.message.includes("Invalid")) {
                    // DISABLED: alert("Session expired. Please login again.");
                    // DISABLED: localStorage.clear();
                    window.location.href = "delivery-login.html";
                }
            }
        });

        socket.on("joined", (data) => {
            console.log("✅ Successfully joined delivery room:", data);
            // Test WebSocket by requesting available orders
            if (isOnline) {
                loadAvailableOrders();
            }
        });

        socket.on("connect_error", (error) => {
            console.error("❌ WebSocket connection error:", error);
            console.error("Make sure the server is running on http://localhost:6789");
        });

        socket.on("order_update", (data) => {
            console.log("📦 Order update received:", data);

            // Handle wallet updates
            if (data.type === "WALLET_UPDATED" && data.deliveryPartnerId) {
                console.log("💰 Wallet updated:", data);
                // Refresh earnings to show updated balance
                loadEarnings();
                showNotification(`Wallet credited: ₹${data.amount} (New balance: ₹${data.newBalance})`);
            }

            // Reload orders when status changes
            if (data.type === "ORDER_CREATED" || data.type === "STATUS_UPDATED") {
                loadAvailableOrders();
                loadMyOrders();
                if (data.status === "READY" && isOnline) {
                    showNotification(`New order available: ${data.orderNumber}`);
                }
                // If order is assigned to this partner, reload
                if (data.deliveryPartnerId) {
                    try {
                        const user = JSON.parse(localStorage.getItem("user") || "{}");
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        if (data.deliveryPartnerId === user.id || data.deliveryPartnerId === payload.id) {
                            loadMyOrders();
                            // If order was delivered, refresh earnings
                            if (data.status === "DELIVERED") {
                                loadEarnings();
                            }
                        }
                    } catch (err) {
                        console.error("Error checking delivery partner ID:", err);
                    }
                }
            }
        });

        socket.on("new_order_available", (data) => {
            console.log("🚴 New order available for pickup:", data);
            if (isOnline) {
                showNotification(`New order #${data.orderNumber} is ready for pickup!`);
                loadAvailableOrders(); // Refresh available orders list
            }
        });

        socket.on("order_list_update", (data) => {
            console.log("📋 Order list update received:", data);
            loadAvailableOrders();
            loadMyOrders();
        });

        socket.on("rating_update", (data) => {
            console.log("⭐ Rating update received:", data);
            // Check if this rating is for the current delivery partner
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (data.deliveryPartnerId && data.deliveryPartnerId === payload.id) {
                    console.log("✅ New rating received for this delivery partner");
                    // Reload partner info to show updated rating
                    loadPartnerInfo();
                    loadMyOrders();
                    loadEarnings(); // Refresh earnings as rating might affect stats
                    showNotification(`You received a ${data.rating}/5 star rating! ${data.comment ? `"${data.comment}"` : ''}`);
                }
            } catch (err) {
                console.error("Error checking delivery partner ID:", err);
            }
        });

        socket.on("disconnect", () => {
            console.log("❌ Disconnected from WebSocket");
        });

        socket.on("connect_error", (error) => {
            console.error("WebSocket connection error:", error);
        });
    } catch (err) {
        console.error("Error initializing WebSocket:", err);
    }
}

// Load partner info
async function loadPartnerInfo() {
    try {
        // Fetch partner info from API to get latest rating
        if (!token) return;

        try {
            const res = await fetch("http://localhost:6789/api/delivery/orders/my", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (res.ok) {
                // Get partner info from delivery partner endpoint or use token
                const payload = JSON.parse(atob(token.split('.')[1]));

                // Try to get partner info from orders (includes delivery partner data)
                const ordersRes = await fetch("http://localhost:6789/api/delivery/orders/my", {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (ordersRes.ok) {
                    const ordersData = await ordersRes.json();
                    if (ordersData.orders && ordersData.orders.length > 0) {
                        const firstOrder = ordersData.orders[0];
                        if (firstOrder.deliveryPartner) {
                            currentPartner = firstOrder.deliveryPartner;
                            updatePartnerDisplay();
                            return;
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching partner info:", err);
        }

        // Fallback to localStorage/token
        const userStr = localStorage.getItem("user");
        if (userStr) {
            const user = JSON.parse(userStr);
            currentPartner = user;
            updatePartnerDisplay();
        } else {
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    currentPartner = { name: payload.name || payload.email || "Delivery Partner" };
                    updatePartnerDisplay();
                } catch (err) {
                    console.error("Error parsing token:", err);
                }
            }
        }
    } catch (error) {
        console.error("Error loading partner info:", error);
    }
}

function updatePartnerDisplay() {
    const nameElement = document.getElementById("partnerName");
    const ratingElement = document.getElementById("rating");

    if (nameElement && currentPartner) {
        nameElement.textContent = currentPartner.name || currentPartner.email || "Delivery Partner";
    }

    if (ratingElement && currentPartner) {
        const rating = currentPartner.rating || 0;
        const totalRatings = currentPartner.totalRatings || 0;
        ratingElement.textContent = rating > 0 ? `${rating.toFixed(1)} (${totalRatings})` : "0.0";
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "Main.html";
    });

    // Online toggle
    document.getElementById("onlineToggle").addEventListener("change", async (e) => {
        isOnline = e.target.checked;
        await updateStatus(isOnline);
    });

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Modal close
    const closeBtn = document.querySelector(".close");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            const modal = document.getElementById("orderModal");
            if (modal) {
                modal.style.display = "none";
            }
        });
    }

    // Close modal when clicking outside
    window.onclick = function (event) {
        const modal = document.getElementById("orderModal");
        if (event.target === modal) {
            modal.style.display = "none";
        }
    };

    // Accept order button - will be set dynamically in showOrderDetails
    // Don't set it here as it needs the orderId

    // Update status button - will be set dynamically
    const updateStatusBtn = document.getElementById("updateStatusBtn");
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener("click", () => {
            // This will be handled in showOrderDetails
        });
    }
}

// Update online status
async function updateStatus(online) {
    try {
        if (!token) {
            alert("Please login first");
            return;
        }

        const res = await fetch("http://localhost:6789/api/delivery/status", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ isOnline: online, isAvailable: online })
        });

        // DISABLED: if (res.status === 401 || res.status === 403) {
        // DISABLED: // alert("Session expired. Please login again.");
        // localStorage.clear();
        // window.location.href = "delivery-login.html";
        // return;
        // }

        const result = await res.json();

        if (result.success) {
            isOnline = online;
            const statusTextEl = document.getElementById("statusText");
            const statusMsgEl = document.getElementById("statusMessage");

            if (statusTextEl) {
                statusTextEl.textContent = online ? "Online" : "Offline";
            }
            if (statusMsgEl) {
                statusMsgEl.textContent = online
                    ? "You're online! You'll receive delivery requests."
                    : "Go online to receive delivery requests";
            }

            if (online) {
                loadAvailableOrders();
                // Rejoin WebSocket room with updated status
                if (socket && socket.connected) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        socket.emit("join", { userId: payload.id, role: "delivery-partner" });
                    } catch (err) {
                        console.error("Error rejoining room:", err);
                    }
                }
            }
        } else {
            alert(result.message || "Failed to update status");
        }
    } catch (error) {
        console.error("Error updating status:", error);
        alert("Error updating status. Please try again.");
    }
}

// Load available orders
async function loadAvailableOrders() {
    try {
        if (!token) {
            console.error("No token available");
            return;
        }

        const res = await fetch("http://localhost:6789/api/delivery/orders/available", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        // DISABLED: if (res.status === 401 || res.status === 403) {
        // DISABLED: // alert("Session expired. Please login again.");
        // localStorage.clear();
        // window.location.href = "delivery-login.html";
        // return;
        // }

        const result = await res.json();
        const container = document.getElementById("availableOrdersList");

        if (!container) {
            console.error("Available orders container not found");
            return;
        }

        if (result.success && result.orders && result.orders.length > 0) {
            container.innerHTML = result.orders.map(order => `
                <div class="order-card" onclick="showOrderDetails(${order.id}, 'available')">
                    <div class="order-header">
                        <span class="order-number">Order #${order.orderNumber}</span>
                        <span class="order-status ready">Ready for Pickup</span>
                    </div>
                    <div class="order-info">
                        <div class="info-item">
                            <span class="info-label">Restaurant</span>
                            <span class="info-value">${order.restaurant?.name || "N/A"}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Amount</span>
                            <span class="info-value">₹${order.totalPrice}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Delivery Fee</span>
                            <span class="info-value">₹${order.deliveryFee || 0}</span>
                        </div>
                    </div>
                    <div class="order-actions">
                        <button class="btn-primary" onclick="event.stopPropagation(); showOrderDetails(${order.id}, 'available')">
                            View Details
                        </button>
                    </div>
                </div>
            `).join("");
        } else {
            container.innerHTML = '<p class="empty-state">No available orders at the moment</p>';
        }
    } catch (error) {
        console.error("Error loading available orders:", error);
    }
}

// Load my orders
async function loadMyOrders() {
    try {
        if (!token) {
            console.error("No token available");
            return;
        }

        const res = await fetch("http://localhost:6789/api/delivery/orders/my", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        // DISABLED: if (res.status === 401 || res.status === 403) {
        // DISABLED: // alert("Session expired. Please login again.");
        // localStorage.clear();
        // window.location.href = "delivery-login.html";
        // return;
        // }

        const result = await res.json();

        if (!result.success) {
            console.error("Failed to load orders:", result.message);
            return;
        }

        // Update partner info if available
        if (result.partner) {
            currentPartner = result.partner;
            updatePartnerDisplay();
        }

        // Active orders
        const activeContainer = document.getElementById("activeOrdersList");
        const activeOrders = result.orders?.filter(o =>
            ["ASSIGNED", "AT_RESTAURANT", "PICKED_UP"].includes(o.status)
        ) || [];

        if (activeOrders.length > 0) {
            activeContainer.innerHTML = activeOrders.map(order => createOrderCard(order, "active")).join("");
        } else {
            activeContainer.innerHTML = '<p class="empty-state">No active deliveries</p>';
        }

        // History
        const historyContainer = document.getElementById("historyOrdersList");
        const historyOrders = result.orders?.filter(o =>
            ["DELIVERED", "CANCELLED"].includes(o.status)
        ) || [];

        if (historyOrders.length > 0) {
            historyContainer.innerHTML = historyOrders.map(order => createOrderCard(order, "history")).join("");
        } else {
            historyContainer.innerHTML = '<p class="empty-state">No delivery history</p>';
        }

        // Update stats
        updateStats(result.orders || []);
    } catch (error) {
        console.error("Error loading my orders:", error);
    }
}

// Create order card
function createOrderCard(order, type) {
    const statusClass = {
        "PICKED_UP": "picked",
        "OUT_FOR_DELIVERY": "delivering",
        "DELIVERED": "delivered",
        "CANCELLED": "cancelled"
    }[order.status] || "";

    // Get delivery rating if order is delivered
    const deliveryRating = order.ratings?.find(r => r.ratingType === "delivery" && r.deliveryPartnerId);
    const ratingDisplay = deliveryRating
        ? `<span class="rating-badge">⭐ ${deliveryRating.rating}/5</span>`
        : "";

    return `
        <div class="order-card ${statusClass}" onclick="showOrderDetails(${order.id}, '${type}')">
            <div class="order-header">
                <span class="order-number">Order #${order.orderNumber}</span>
                <span class="order-status ${statusClass}">${order.status.replace("_", " ")}${ratingDisplay}</span>
            </div>
            <div class="order-info">
                <div class="info-item">
                    <span class="info-label">Restaurant</span>
                    <span class="info-value">${order.restaurant?.name || "N/A"}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Customer</span>
                    <span class="info-value">${order.user?.name || "N/A"}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Amount</span>
                    <span class="info-value">₹${(order.totalPrice || 0).toFixed(2)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Delivery Fee</span>
                    <span class="info-value">₹${(order.deliveryFee || 0).toFixed(2)}</span>
                </div>
            </div>
            ${type === "active" ? `
                <div class="order-actions">
                    ${order.status === 'ASSIGNED' ? `
                        <button class="btn-secondary" onclick="event.stopPropagation(); updateOrderStatus(${order.id}, 'AT_RESTAURANT')">
                            Mark At Restaurant
                        </button>
                    ` : ''}
                    ${order.status === 'AT_RESTAURANT' ? `
                        <button class="btn-secondary" onclick="event.stopPropagation(); updateOrderStatus(${order.id}, 'PICKED_UP')">
                            Mark Picked Up
                        </button>
                    ` : ''}
                    ${order.status === 'PICKED_UP' ? `
                        <button class="btn-primary" onclick="event.stopPropagation(); updateOrderStatus(${order.id}, 'DELIVERED')">
                            Mark Delivered
                        </button>
                    ` : ''}
                </div>
            ` : ""}
        </div>
    `;
}

// Show order details
async function showOrderDetails(orderId, type) {
    try {
        let order = null;

        // For available orders, fetch from available endpoint
        if (type === "available") {
            const res = await fetch("http://localhost:6789/api/delivery/orders/available", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const result = await res.json();
            order = result.orders?.find(o => o.id === orderId);
        } else {
            // For my orders, fetch from my endpoint
            const res = await fetch("http://localhost:6789/api/delivery/orders/my", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const result = await res.json();
            order = result.orders?.find(o => o.id === orderId);
        }

        if (!order) {
            alert("Order not found");
            return;
        }

        const modal = document.getElementById("orderModal");
        const detailsDiv = document.getElementById("orderDetails");
        const acceptBtn = document.getElementById("acceptOrderBtn");
        const updateBtn = document.getElementById("updateStatusBtn");

        detailsDiv.innerHTML = `
            <div class="order-info">
                <div class="info-item">
                    <span class="info-label">Order Number</span>
                    <span class="info-value">${order.orderNumber}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status</span>
                    <span class="info-value">${order.status}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Restaurant</span>
                    <span class="info-value">${order.restaurant?.name || "N/A"}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Restaurant Address</span>
                    <span class="info-value">${order.restaurant?.address || "N/A"}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Customer</span>
                    <span class="info-value">${order.user?.name || "N/A"}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Customer Phone</span>
                    <span class="info-value">${order.user?.phone || "N/A"}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Delivery Address</span>
                    <span class="info-value">${order.address ? `${order.address.street}, ${order.address.city}` : "N/A"}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Amount</span>
                    <span class="info-value">₹${order.totalPrice}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Delivery Fee</span>
                    <span class="info-value">₹${order.deliveryFee || 0}</span>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <h3>Items:</h3>
                <ul>
                    ${(order.items && order.items.length > 0) ? order.items.map(item => {
            const menuItem = item.menuItem || {};
            const itemName = menuItem.name || "N/A";
            const quantity = item.quantity || 1;
            const price = item.price || menuItem.price || 0;
            const total = price * quantity;
            return `<li>${itemName} x ${quantity} = ₹${total.toFixed(2)}</li>`;
        }).join("") : "<li>No items found</li>"}
                </ul>
                ${order.itemCount !== undefined ? `<p style="margin-top: 10px; color: #666;">Total items: ${order.itemCount}</p>` : ""}
            </div>
        `;

        if (acceptBtn) {
            acceptBtn.style.display = type === "available" ? "block" : "none";
            acceptBtn.onclick = () => acceptOrder(orderId);
        }

        if (updateBtn) {
            updateBtn.style.display = type === "active" ? "block" : "none";
            updateBtn.onclick = () => {
                // Determine next status based on current status
                let nextStatus = null;
                if (order.status === 'ASSIGNED') nextStatus = 'AT_RESTAURANT';
                else if (order.status === 'AT_RESTAURANT') nextStatus = 'PICKED_UP';
                else if (order.status === 'PICKED_UP') nextStatus = 'DELIVERED';
                
                if (nextStatus) {
                    updateOrderStatus(orderId, nextStatus);
                } else {
                    alert('This order cannot be updated further.');
                }
            };
        }

        modal.style.display = "block";
    } catch (error) {
        console.error("Error loading order details:", error);
        alert("Error loading order details");
    }
}

// Accept order
async function acceptOrder(orderId) {
    try {
        const res = await fetch("http://localhost:6789/api/delivery/orders/accept", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ orderId })
        });

        const result = await res.json();

        if (result.success) {
            alert("Order accepted successfully!");
            document.getElementById("orderModal").style.display = "none";
            loadAvailableOrders();
            loadMyOrders();
        } else {
            alert(result.message || "Failed to accept order");
        }
    } catch (error) {
        console.error("Error accepting order:", error);
        alert("Error accepting order");
    }
}

// Update order status
async function updateOrderStatus(orderId, status) {
    if (!confirm(`Mark order as ${status.replace("_", " ")}?`)) {
        return;
    }

    try {
        // Refresh token before request
        const currentToken = localStorage.getItem("token");
        if (!currentToken) {
            // DISABLED: alert("Session expired. Please login again.");
            // DISABLED: window.location.href = "delivery-login.html";
            return;
        }

        const res = await fetch("http://localhost:6789/api/delivery/orders/update-status", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${currentToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ orderId, status })
        });

        // DISABLED: if (res.status === 401 || res.status === 403) {
        // DISABLED: // alert("Session expired. Please login again.");
        // localStorage.clear();
        // window.location.href = "delivery-login.html";
        // return;
        // }

        const result = await res.json();

        if (result.success) {
            alert("Order status updated!");
            loadMyOrders();
            loadEarnings(); // Refresh earnings to show updated wallet balance
            document.getElementById("orderModal").style.display = "none";
        } else {
            alert(result.message || "Failed to update status");
        }
    } catch (error) {
        console.error("Error updating order status:", error);
        alert("Error updating order status");
    }
}

// Load earnings
async function loadEarnings() {
    try {
        // Always get fresh token
        const currentToken = localStorage.getItem("token");
        if (!currentToken) {
            console.error("No token available");
            return;
        }

        const res = await fetch("http://localhost:6789/api/delivery/earnings", {
            headers: { "Authorization": `Bearer ${currentToken}` }
        });

        // DISABLED: if (res.status === 401 || res.status === 403) {
        // DISABLED: // alert("Session expired. Please login again.");
        // localStorage.clear();
        // window.location.href = "delivery-login.html";
        // return;
        // }

        const result = await res.json();

        if (result.success) {
            const totalEarnings = result.earnings?.total || 0;
            const walletBalance = result.earnings?.walletBalance || 0;
            const ordersCount = result.earnings?.ordersCount || 0;
            const breakdown = result.earnings?.breakdown || {};

            // Update earnings display
            const totalEarningsEl = document.getElementById("totalEarningsAmount");
            const walletBalanceEl = document.getElementById("walletBalanceAmount");
            const totalDeliveriesEl = document.getElementById("totalDeliveriesCount");

            if (totalEarningsEl) {
                totalEarningsEl.textContent = `₹${totalEarnings.toFixed(2)}`;
            }
            if (walletBalanceEl) {
                walletBalanceEl.textContent = `₹${walletBalance.toFixed(2)}`;
            }
            if (totalDeliveriesEl) {
                totalDeliveriesEl.textContent = ordersCount;
            }

            // Update stats cards
            const statsTotalEarnings = document.getElementById("totalEarnings");
            const statsWalletBalance = document.getElementById("walletBalance");

            if (statsTotalEarnings) {
                statsTotalEarnings.textContent = `₹${totalEarnings.toFixed(2)}`;
            }
            if (statsWalletBalance) {
                statsWalletBalance.textContent = `₹${walletBalance.toFixed(2)}`;
            }

            // Display earnings breakdown
            const breakdownEl = document.getElementById("earningsBreakdown");
            if (breakdownEl && breakdown.daily) {
                breakdownEl.innerHTML = `
                    <div class="earnings-breakdown">
                        <h3>Earnings Breakdown</h3>
                        <div class="breakdown-grid">
                            <div class="breakdown-item">
                                <span class="breakdown-label">Today</span>
                                <span class="breakdown-value">₹${(breakdown.daily?.earnings || 0).toFixed(2)}</span>
                                <span class="breakdown-count">${breakdown.daily?.orders || 0} orders</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">This Week</span>
                                <span class="breakdown-value">₹${(breakdown.weekly?.earnings || 0).toFixed(2)}</span>
                                <span class="breakdown-count">${breakdown.weekly?.orders || 0} orders</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">Lifetime</span>
                                <span class="breakdown-value">₹${(breakdown.lifetime?.earnings || 0).toFixed(2)}</span>
                                <span class="breakdown-count">${breakdown.lifetime?.orders || 0} orders</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            const earningsList = document.getElementById("earningsList");
            if (result.earnings?.orders && result.earnings.orders.length > 0) {
                earningsList.innerHTML = result.earnings.orders.map(order => {
                    const deliveredDate = order.deliveredAt
                        ? new Date(order.deliveredAt).toLocaleDateString()
                        : "N/A";
                    return `
                        <div class="earnings-item">
                            <div>
                                <strong>Order #${order.orderNumber}</strong>
                                <p style="color: #666; font-size: 12px; margin-top: 5px;">
                                    ${deliveredDate}
                                </p>
                            </div>
                            <div style="font-weight: 700; color: #4CAF50;">
                                +₹${(order.deliveryFee || 0).toFixed(2)}
                            </div>
                        </div>
                    `;
                }).join("");
            } else {
                earningsList.innerHTML = '<p class="empty-state">No earnings data</p>';
            }
        } else {
            console.error("Failed to load earnings:", result.message);
            const earningsList = document.getElementById("earningsList");
            if (earningsList) {
                earningsList.innerHTML = `<p class="empty-state">Error: ${result.message || "Failed to load earnings"}</p>`;
            }
        }
    } catch (error) {
        console.error("Error loading earnings:", error);
        const earningsList = document.getElementById("earningsList");
        if (earningsList) {
            earningsList.innerHTML = '<p class="empty-state">Error loading earnings. Please try again.</p>';
        }
    }
}

// Update stats
function updateStats(orders) {
    const delivered = orders.filter(o => o.status === "DELIVERED").length;
    const totalEarnings = orders
        .filter(o => o.status === "DELIVERED")
        .reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

    const totalOrdersEl = document.getElementById("totalOrders");
    const totalEarningsEl = document.getElementById("totalEarnings");

    if (totalOrdersEl) {
        totalOrdersEl.textContent = delivered;
    }
    if (totalEarningsEl) {
        totalEarningsEl.textContent = `₹${totalEarnings.toFixed(2)}`;
    }

    // Also update rating if we have partner info
    if (currentPartner && currentPartner.rating) {
        const ratingEl = document.getElementById("rating");
        if (ratingEl) {
            const rating = currentPartner.rating || 0;
            const totalRatings = currentPartner.totalRatings || 0;
            ratingEl.textContent = rating > 0 ? `${rating.toFixed(1)} (${totalRatings})` : "0.0";
        }
    }
}

// Switch tabs
function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
    document.getElementById(`${tabName}Tab`).classList.add("active");

    if (tabName === "available") {
        loadAvailableOrders();
    } else if (tabName === "active" || tabName === "history") {
        loadMyOrders();
    } else if (tabName === "earnings") {
        loadEarnings();
    }
}

// Show notification
function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #0B1420;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s ease;
        font-weight: 600;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = "1";
        notification.style.transform = "translateX(0)";
    }, 10);

    setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateX(400px)";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Make functions global for onclick handlers
window.showOrderDetails = showOrderDetails;
window.acceptOrder = acceptOrder;
window.updateOrderStatus = updateOrderStatus;

