const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first.");
    window.location.href = "login.html";
}

// ------------------------------
// LOAD RESTAURANT PROFILE
// ------------------------------
async function loadRestaurantInfo() {
    try {
        const res = await fetch("http://localhost:6789/api/restaurant/me", {
            headers: { "Authorization": "Bearer " + token }
        });

        const result = await res.json();
        console.log("Restaurant Profile:", result);

        if (result.success) {
            const r = result.restaurant;
            document.getElementById("restName").innerText = r.name;
            document.getElementById("restEmail").innerText = r.email;
            document.getElementById("restAddress").innerText = r.address;

            // Display rating stats if available
            if (r.rating !== undefined) {
                const ratingDisplay = document.getElementById("restRating");
                if (ratingDisplay) {
                    ratingDisplay.innerHTML = `
                        <div class="rating-display">
                            <span class="rating-value">⭐ ${r.rating.toFixed(1)}</span>
                            <span class="rating-count">(${r.totalRatings || 0} reviews)</span>
                        </div>
                    `;
                }
            }
        } else {
            alert(result.message);
        }

    } catch (err) {
        console.error(err);
        alert("Failed to load restaurant information.");
    }
}

// ------------------------------
// LOAD MENU ITEMS
// ------------------------------
async function loadMenu() {
    const list = document.getElementById("menuList");
    list.innerHTML = "<li>Loading menu...</li>";

    try {
        const res = await fetch("http://localhost:6789/api/menu", {
            headers: { "Authorization": "Bearer " + token }
        });

        const result = await res.json();
        console.log("Menu:", result);

        if (!result.success) {
            list.innerHTML = `<li>Error loading menu</li>`;
            return;
        }

        list.innerHTML = "";

        result.menu.forEach(item => {
            const li = document.createElement("li");
            li.innerHTML = `
                <strong>${item.name}</strong> - ₹${item.price}
                <button onclick="editMenuItem(${item.id}, '${item.name}', ${item.price})" class="small-btn">Edit</button>
                <button onclick="deleteMenuItem(${item.id})" class="small-btn danger">Delete</button>
            `;
            list.appendChild(li);
        });

    } catch (err) {
        console.error(err);
        list.innerHTML = `<li>Failed to load menu.</li>`;
    }
}

// ------------------------------
// ADD MENU ITEM WITH IMAGE
// ------------------------------
async function addMenuItem() {
    const name = document.getElementById("menuName").value.trim();
    const price = document.getElementById("menuPrice").value.trim();
    const image = document.getElementById("menuImage").files[0];

    if (!name || !price) {
        return alert("Name and price are required!");
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    if (image) formData.append("image", image);

    const res = await fetch("http://localhost:6789/api/menu/add", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token },
        body: formData
    });

    const data = await res.json();
    console.log("Add Menu Response:", data);

    if (data.success) {
        alert("Menu item added!");
        loadMenu();
    } else {
        alert(data.message);
    }
}

// ------------------------------
// EDIT MENU ITEM
// ------------------------------
function editMenuItem(id, oldName, oldPrice) {
    const newName = prompt("New Name:", oldName);
    const newPrice = prompt("New Price:", oldPrice);

    if (!newName || !newPrice) return;

    updateMenuItem(id, newName, newPrice);
}

async function updateMenuItem(id, name, price) {

    const res = await fetch(`http://localhost:6789/api/menu/update/${id}`, {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, price })
    });

    const result = await res.json();

    if (result.success) {
        alert("Menu item updated!");
        loadMenu();
    } else {
        alert(result.message);
    }
}

// ------------------------------
// DELETE MENU ITEM
// ------------------------------
async function deleteMenuItem(id) {

    if (!confirm("Delete this item?")) return;

    const res = await fetch(`http://localhost:6789/api/menu/delete/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
    });

    const result = await res.json();

    if (result.success) {
        alert("Item deleted!");
        loadMenu();
    } else {
        alert(result.message);
    }
}

let socket = null;
let restaurantId = null;

// Initialize WebSocket
function initWebSocket() {
    if (!token) {
        console.error("No token available for WebSocket");
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
            console.log("✅ Restaurant WebSocket connected");
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                restaurantId = payload.id;
                if (restaurantId) {
                    socket.emit("join", { userId: restaurantId, role: "restaurant-owner" });
                } else {
                    console.error("Restaurant ID not found in token");
                }
            } catch (err) {
                console.error("Error parsing token:", err);
            }
        });

        socket.on("joined", (data) => {
            console.log("✅ Successfully joined room:", data);
        });

        socket.on("order_update", (data) => {
            console.log("📦 Order update received:", data);
            if (data.restaurantId === restaurantId) {
                if (data.type === "ORDER_CREATED") {
                    // New order placed - reload the orders list
                    loadOrders();
                    showNotification(`New order received: ${data.orderNumber}`);
                } else {
                    // Status update - update specific order
                    updateOrderInList(data.orderId, data.status);
                    showNotification(`Order ${data.orderNumber} status updated to ${data.status}`);
                }
            }
        });

        socket.on("order_list_update", (data) => {
            console.log("📋 Order list update received:", data);
            if (data.restaurantId === restaurantId) {
                // Reload orders when list updates
                loadOrders();
            }
        });

        socket.on("rating_update", (data) => {
            console.log("⭐ Rating update received:", data);
            if (data.restaurantId === restaurantId) {
                // Reload orders and restaurant info to show updated ratings
                loadRestaurantInfo();
                loadOrders();
                showNotification("New rating received!");
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

// ------------------------------
// LOAD ORDERS
// ------------------------------
async function loadOrders() {
    const list = document.getElementById("ordersList");
    list.innerHTML = "<li>Loading orders...</li>";

    try {
        const res = await fetch("http://localhost:6789/api/restaurant/orders", {
            headers: { "Authorization": "Bearer " + token }
        });

        if (res.status === 401 || res.status === 403) {
            alert("Session expired. Please login again.");
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        const result = await res.json();
        console.log("Orders response:", result);

        if (!result.success) {
            console.error("Order loading failed:", result.message);
            list.innerHTML = `<li class='error-message'>Error: ${result.message || 'Failed to load orders'}</li>`;
            return;
        }

        if (result.orders.length === 0) {
            list.innerHTML = "<li class='no-orders'>No orders yet</li>";
            return;
        }

        list.innerHTML = "";

        // Display rating stats if available
        if (result.ratingStats) {
            const ratingStatsEl = document.getElementById("ratingStats");
            if (ratingStatsEl) {
                ratingStatsEl.style.display = "block";
                ratingStatsEl.innerHTML = `
                    <div class="rating-stats-card">
                        <h3>Restaurant Ratings</h3>
                        <div class="rating-stats-content">
                            <div class="rating-stat-item">
                                <span class="stat-label">Average Rating:</span>
                                <span class="stat-value">⭐ ${result.ratingStats.averageRating.toFixed(1)}/5</span>
                            </div>
                            <div class="rating-stat-item">
                                <span class="stat-label">Total Reviews:</span>
                                <span class="stat-value">${result.ratingStats.totalReviews}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        result.orders.forEach(order => {
            const orderCard = createOrderCard(order);
            list.appendChild(orderCard);
        });
    } catch (err) {
        console.error("Error fetching orders:", err);
        list.innerHTML = `<li class='error-message'>Network error: ${err.message}</li>`;
    }
}

function createOrderCard(order) {
    const li = document.createElement("li");
    li.className = "order-item";
    li.dataset.orderId = order.id;

    const itemsList = order.items.map(item =>
        `${item.menuItem.name} x${item.quantity}`
    ).join(", ");

    const orderDate = new Date(order.createdAt).toLocaleString();
    const statusClass = getStatusClass(order.status);
    const statusText = getStatusText(order.status);

    // Get ratings for this order
    const restaurantRating = order.ratings?.find(r => r.ratingType === "restaurant");
    const foodRatings = order.ratings?.filter(r => r.ratingType === "food") || [];

    let ratingsHtml = "";
    if (restaurantRating) {
        ratingsHtml += `
            <div class="order-rating">
                <strong>Restaurant Rating:</strong> 
                <span class="rating-stars">${'⭐'.repeat(restaurantRating.rating)}${'☆'.repeat(5 - restaurantRating.rating)}</span>
                <span class="rating-value">${restaurantRating.rating}/5</span>
                ${restaurantRating.comment ? `<p class="rating-comment">"${restaurantRating.comment}"</p>` : ''}
                <span class="rating-user">- ${restaurantRating.user?.name || 'Customer'}</span>
            </div>
        `;
    }

    if (foodRatings.length > 0) {
        ratingsHtml += `
            <div class="order-food-ratings">
                <strong>Food Ratings:</strong>
                ${foodRatings.map(r => `
                    <div class="food-rating-item">
                        <span>${r.menuItem?.name || 'Item'}:</span>
                        <span class="rating-stars">${'⭐'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                        <span class="rating-value">${r.rating}/5</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    li.innerHTML = `
        <div class="order-card-header">
            <div>
                <strong>Order #${order.orderNumber}</strong>
                <p class="order-customer">Customer: ${order.user.name}</p>
                <p class="order-time">${orderDate}</p>
            </div>
            <div class="order-status-badge ${statusClass}">${statusText}</div>
        </div>
        <div class="order-items-list">
            <strong>Items:</strong> ${itemsList}
        </div>
        <div class="order-total-price">
            <strong>Total: ₹${order.totalPrice.toFixed(2)}</strong>
        </div>
        ${ratingsHtml ? `<div class="order-ratings-section">${ratingsHtml}</div>` : ''}
        <div class="order-actions">
            ${createStatusButtons(order.id, order.status)}
        </div>
    `;

    return li;
}

function getStatusClass(status) {
    const map = {
        'PLACED': 'status-pending',
        'ACCEPTED': 'status-accepted',
        'READY_FOR_PICKUP': 'status-ready',
        'ASSIGNED': 'status-assigned',
        'AT_RESTAURANT': 'status-at-restaurant',
        'PICKED_UP': 'status-picked',
        'DELIVERED': 'status-delivered',
        'CANCELLED': 'status-cancelled'
    };
    return map[status] || 'status-pending';
}

function getStatusText(status) {
    const map = {
        'PLACED': 'Order Placed',
        'ACCEPTED': 'Accepted',
        'READY_FOR_PICKUP': 'Ready for Pickup',
        'ASSIGNED': 'Assigned to Delivery',
        'AT_RESTAURANT': 'Partner at Restaurant',
        'PICKED_UP': 'Out for Delivery',
        'DELIVERED': 'Delivered',
        'CANCELLED': 'Cancelled'
    };
    return map[status] || status;
}

function createStatusButtons(orderId, currentStatus) {
    if (currentStatus === 'CANCELLED' || currentStatus === 'DELIVERED') {
        return `<span class="order-final">Order ${currentStatus.toLowerCase()}</span>`;
    }

    const buttons = [];

    // New workflow: PLACED → ACCEPTED → READY_FOR_PICKUP
    if (currentStatus === 'PLACED') {
        buttons.push(`<button class="btn-status btn-accept" onclick="updateStatus(${orderId}, 'ACCEPTED')">Accept Order</button>`);
        buttons.push(`<button class="btn-status btn-cancel" onclick="updateStatus(${orderId}, 'CANCELLED')">Cancel</button>`);
    } else if (currentStatus === 'ACCEPTED') {
        buttons.push(`<button class="btn-status btn-next" onclick="updateStatus(${orderId}, 'READY_FOR_PICKUP')">Mark as Ready for Pickup</button>`);
        buttons.push(`<button class="btn-status btn-cancel" onclick="updateStatus(${orderId}, 'CANCELLED')">Cancel</button>`);
    } else if (currentStatus === 'READY_FOR_PICKUP') {
        buttons.push(`<span class="order-info">Waiting for delivery partner...</span>`);
        buttons.push(`<button class="btn-status btn-cancel" onclick="updateStatus(${orderId}, 'CANCELLED')">Cancel</button>`);
    } else if (currentStatus === 'ASSIGNED' || currentStatus === 'AT_RESTAURANT' || currentStatus === 'PICKED_UP') {
        buttons.push(`<span class="order-info">Order is being delivered...</span>`);
    }

    return buttons.join('');
}

async function updateStatus(orderId, newStatus) {
    if (!confirm(`Are you sure you want to update order status to ${getStatusText(newStatus)}?`)) {
        return;
    }

    try {
        const res = await fetch(`http://localhost:6789/api/restaurant/orders/${orderId}/status`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await res.json();

        if (result.success) {
            showNotification(`Order status updated to ${getStatusText(newStatus)}`);
            loadOrders(); // Reload orders
        } else {
            alert(result.message || "Failed to update order status");
        }
    } catch (err) {
        console.error("Error updating status:", err);
        alert("Error updating order status");
    }
}

function updateOrderInList(orderId, newStatus) {
    if (!orderId) return;

    const orderItem = document.querySelector(`[data-order-id="${orderId}"]`);
    if (orderItem) {
        // Reload to show updated status
        loadOrders();
    } else {
        // If order not found in list, reload anyway
        console.log("Order not found in list, reloading...");
        loadOrders();
    }
}

function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 10);
    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

window.updateStatus = updateStatus;

// ------------------------------
// LOGOUT
// ------------------------------
document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
};

// Load everything
loadRestaurantInfo();
loadMenu();
loadOrders();

// Initialize WebSocket after page loads
document.addEventListener("DOMContentLoaded", () => {
    // Check if Socket.io is loaded
    if (typeof io === 'undefined') {
        console.error("Socket.io not loaded! Make sure the script is included in HTML.");
    } else {
        initWebSocket();
    }
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
    if (socket) {
        socket.disconnect();
    }
});
