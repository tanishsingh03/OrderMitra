const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first.");
    // DISABLED: window.location.href = "login.html";
    throw new Error("No token found");
}

let socket = null;
let userId = null;

// Initialize WebSocket connection
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
            console.log("✅ Connected to WebSocket");
            // Get user ID from token - always refresh from token
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                userId = payload.id;
                console.log("User ID from token:", userId);
                if (userId) {
                    socket.emit("join", { userId, role: "customer" });
                } else {
                    console.error("User ID not found in token");
                }
            } catch (err) {
                console.error("Error parsing token:", err);
                // Try to reload page if token is invalid
                if (err.message.includes("Invalid")) {
                    // DISABLED: alert("Session expired. Please login again.");
                    // DISABLED: localStorage.removeItem("token");
                    window.location.href = "login.html";
                }
            }
        });

        socket.on("joined", (data) => {
            console.log("✅ Successfully joined room:", data);
        });

        socket.on("order_update", (data) => {
            console.log("📦 Order update received:", data);
            if (data.userId === userId) {
                // Display the customer-visible message
                const message = data.message || `Order ${data.orderNumber} updated`;
                showNotification(message);

                if (data.type === "ORDER_CREATED") {
                    // New order - reload the list
                    loadOrders();
                } else {
                    // Status update - update specific order
                    updateOrderStatus(data.orderId, data.status);

                    // Show rating prompt if delivered
                    if (data.ratingPrompt && data.status === "DELIVERED") {
                        setTimeout(() => {
                            const ratePrompt = confirm(`${message}\n\nWould you like to rate your order now?`);
                            if (ratePrompt) {
                                // Reload to show rate button
                                loadOrders();
                            }
                        }, 1500);
                    }
                }
            }
        });

        socket.on("order_list_update", (data) => {
            console.log("📋 Order list update received:", data);
            if (data.userId === userId) {
                // Reload orders when list updates
                loadOrders();
            }
        });

        socket.on("rating_update", (data) => {
            console.log("⭐ Rating update received:", data);
            if (data.userId === userId || data.orderId) {
                // Reload orders to show updated ratings
                loadOrders();
                showNotification("Rating updated successfully!");
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

// Load orders
async function loadOrders() {
    const container = document.getElementById("ordersContainer");
    container.innerHTML = "<div class='loading'>Loading orders...</div>";

    // Refresh token and userId before each request
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
        alert("Please login first.");
        // DISABLED: window.location.href = "login.html";
        return;
    }

    try {
        // Verify token is still valid
        const payload = JSON.parse(atob(currentToken.split('.')[1]));
        userId = payload.id;

        const res = await fetch("http://localhost:6789/api/orders/my-orders", {
            headers: { "Authorization": "Bearer " + currentToken }
        });

        // Check for authentication errors FIRST before parsing response
        if (res.status === 401 || res.status === 403) {
            // DISABLED: alert("Session expired. Please login again.");
            // DISABLED: localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        const data = await res.json();

        if (!data.success) {
            container.innerHTML = `<div class='error'>${data.message || "Failed to load orders"}</div>`;
            return;
        }

        if (data.orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-bag"></i>
                    <h2>No orders yet</h2>
                    <p>Start ordering from your favorite restaurants!</p>
                    <a href="CustomerDashboard.html" class="btn-primary">Browse Restaurants</a>
                </div>
            `;
            return;
        }

        container.innerHTML = "";

        data.orders.forEach(order => {
            const orderCard = createOrderCard(order);
            container.appendChild(orderCard);
        });

    } catch (err) {
        console.error("Error loading orders:", err);
        container.innerHTML = `<div class='error'>Error loading orders. Please try again.</div>`;
    }
}

function createOrderCard(order) {
    const card = document.createElement("div");
    card.className = "order-card";
    card.setAttribute("data-order-id", order.id);

    const statusClass = getStatusClass(order.status);
    const statusIcon = getStatusIcon(order.status);
    const statusText = getStatusText(order.status);

    const itemsList = order.items.map(item =>
        `${item.menuItem.name} x${item.quantity}`
    ).join(", ");

    const orderDate = new Date(order.createdAt).toLocaleString();

    // Check if order is delivered and can be rated
    const canRate = order.status === "DELIVERED";
    const hasDeliveryPartner = order.deliveryPartnerId && order.deliveryPartner;

    // Check existing ratings for this order
    const existingRatings = order.ratings || [];
    const hasRestaurantRating = existingRatings.some(r => r.restaurantId && r.ratingType === "restaurant");
    const hasDeliveryRating = existingRatings.some(r => r.deliveryPartnerId && r.ratingType === "delivery");
    const hasFoodRatings = existingRatings.filter(r => r.menuItemId && r.ratingType === "food");

    card.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <h3>Order #${order.orderNumber}</h3>
                <p class="order-date">${orderDate}</p>
            </div>
            <div class="order-status ${statusClass}">
                <i class="${statusIcon}"></i>
                <span>${statusText}</span>
            </div>
        </div>
        
        <div class="order-restaurant">
            <i class="fas fa-store"></i>
            <span>${order.restaurant.name}</span>
            ${hasRestaurantRating ? `<span class="rating-badge">⭐ ${existingRatings.find(r => r.restaurantId)?.rating || 0}/5</span>` : ''}
        </div>

        ${hasDeliveryPartner ? `
        <div class="order-delivery-partner">
            <i class="fas fa-motorcycle"></i>
            <span>Delivery Partner: ${order.deliveryPartner.name || "N/A"}</span>
            ${hasDeliveryRating ? `<span class="rating-badge">⭐ ${existingRatings.find(r => r.deliveryPartnerId)?.rating || 0}/5</span>` : ''}
        </div>
        ` : ''}

        <div class="order-items">
            <h4>Items:</h4>
            <p>${itemsList}</p>
        </div>

        <div class="order-footer">
            <div class="order-breakdown-details">
                <div class="breakdown-row-small">
                    <span>Subtotal:</span>
                    <span>₹${(order.subtotal || order.totalPrice - (order.deliveryFee || 0) - (order.tax || 0)).toFixed(2)}</span>
                </div>
                ${order.deliveryFee ? `<div class="breakdown-row-small">
                    <span>Delivery Fee:</span>
                    <span>₹${order.deliveryFee.toFixed(2)}</span>
                </div>` : ''}
                ${order.tax ? `<div class="breakdown-row-small">
                    <span>Handling & Tax:</span>
                    <span>₹${order.tax.toFixed(2)}</span>
                </div>` : ''}
                <div class="order-total">
                    <strong>Total: ₹${order.totalPrice.toFixed(2)}</strong>
                </div>
            </div>
            <div class="order-progress">
                ${createProgressBar(order.status)}
            </div>
            ${canRate ? `
            <div class="rating-section">
                <button class="btn-rate" onclick="openRatingModal(${order.id}, ${order.restaurantId}, ${hasDeliveryPartner ? order.deliveryPartnerId : 'null'}, ${JSON.stringify(order.items).replace(/"/g, '&quot;')})">
                    <i class="fas fa-star"></i> Rate Order
                </button>
            </div>
            ` : ''}
        </div>
    `;

    return card;
}

function getStatusClass(status) {
    const statusMap = {
        'PLACED': 'status-pending',
        'ACCEPTED': 'status-accepted',
        'READY_FOR_PICKUP': 'status-ready',
        'ASSIGNED': 'status-assigned',
        'AT_RESTAURANT': 'status-at-restaurant',
        'PICKED_UP': 'status-picked',
        'DELIVERED': 'status-delivered',
        'CANCELLED': 'status-cancelled',
        'REFUNDED': 'status-refunded',
        // Legacy support
        'PENDING': 'status-pending',
        'PREPARING': 'status-accepted',
        'READY': 'status-ready',
        'OUT_FOR_DELIVERY': 'status-picked'
    };
    return statusMap[status] || 'status-pending';
}

function getStatusIcon(status) {
    const iconMap = {
        'PLACED': 'fas fa-shopping-cart',
        'ACCEPTED': 'fas fa-check-circle',
        'READY_FOR_PICKUP': 'fas fa-check-double',
        'ASSIGNED': 'fas fa-user-check',
        'AT_RESTAURANT': 'fas fa-store',
        'PICKED_UP': 'fas fa-box',
        'DELIVERED': 'fas fa-check-circle',
        'CANCELLED': 'fas fa-times-circle',
        'REFUNDED': 'fas fa-undo',
        // Legacy support
        'PENDING': 'fas fa-clock',
        'PREPARING': 'fas fa-utensils',
        'READY': 'fas fa-check-double',
        'OUT_FOR_DELIVERY': 'fas fa-truck'
    };
    return iconMap[status] || 'fas fa-clock';
}

function getStatusText(status) {
    const textMap = {
        'PLACED': 'Order Placed',
        'ACCEPTED': 'Order Accepted',
        'READY_FOR_PICKUP': 'Ready for Pickup',
        'ASSIGNED': 'Assigned to Delivery Partner',
        'AT_RESTAURANT': 'At Restaurant',
        'PICKED_UP': 'Picked Up',
        'DELIVERED': 'Delivered',
        'CANCELLED': 'Cancelled',
        'REFUNDED': 'Refunded',
        // Legacy support
        'PENDING': 'Order Pending',
        'PREPARING': 'Being Prepared',
        'READY': 'Ready for Delivery',
        'OUT_FOR_DELIVERY': 'Out for Delivery'
    };
    return textMap[status] || status;
}

function createProgressBar(status) {
    // New workflow: PLACED → ACCEPTED → READY_FOR_PICKUP → ASSIGNED → PICKED_UP → DELIVERED
    const steps = [
        { key: 'PLACED', label: 'Placed', icon: 'fa-shopping-cart' },
        { key: 'ACCEPTED', label: 'Accepted', icon: 'fa-check-circle' },
        { key: 'READY_FOR_PICKUP', label: 'Ready', icon: 'fa-check-double' },
        { key: 'ASSIGNED', label: 'Assigned', icon: 'fa-user-check' },
        { key: 'PICKED_UP', label: 'Picked Up', icon: 'fa-box' },
        { key: 'DELIVERED', label: 'Delivered', icon: 'fa-check-circle' }
    ];

    // Legacy status support
    const legacyMap = {
        'PENDING': 'PLACED',
        'PREPARING': 'ACCEPTED',
        'READY': 'READY_FOR_PICKUP',
        'OUT_FOR_DELIVERY': 'PICKED_UP'
    };

    const normalizedStatus = legacyMap[status] || status;

    if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'REFUNDED') {
        return `<div class="progress-cancelled">
            <i class="fas fa-times-circle"></i>
            Order ${normalizedStatus === 'CANCELLED' ? 'Cancelled' : 'Refunded'}
        </div>`;
    }

    const statusIndex = steps.findIndex(s => s.key === normalizedStatus);
    const currentIndex = statusIndex >= 0 ? statusIndex : 0;

    let html = '<div class="progress-bar">';
    steps.forEach((step, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        html += `
            <div class="progress-step ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}">
                <div class="step-circle">
                    ${isActive ? `<i class="fas ${step.icon}"></i>` : index + 1}
                </div>
                <div class="step-label">${step.label}</div>
            </div>
            ${index < steps.length - 1 ? `<div class="progress-line ${isActive && index < currentIndex ? 'active' : ''}"></div>` : ''}
        `;
    });
    html += '</div>';
    return html;
}

function updateOrderStatus(orderId, newStatus) {
    if (!orderId) return;

    const card = document.querySelector(`[data-order-id="${orderId}"]`);
    if (!card) {
        // If card not found, reload orders
        console.log("Order card not found, reloading orders...");
        loadOrders();
        return;
    }

    const statusElement = card.querySelector('.order-status');
    const statusClass = getStatusClass(newStatus);
    const statusIcon = getStatusIcon(newStatus);
    const statusText = getStatusText(newStatus);

    statusElement.className = `order-status ${statusClass}`;
    statusElement.innerHTML = `
        <i class="${statusIcon}"></i>
        <span>${statusText}</span>
    `;

    // Update progress bar
    const progressContainer = card.querySelector('.order-progress');
    progressContainer.innerHTML = createProgressBar(newStatus);

    // Add animation
    card.classList.add('status-updated');
    setTimeout(() => card.classList.remove('status-updated'), 1000);
}

function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add("show");
    }, 10);

    setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function logout() {
    // DISABLED: localStorage.removeItem("token");
    if (socket) socket.disconnect();
    window.location.href = "login.html";
}

// Rating Modal Functions
function openRatingModal(orderId, restaurantId, deliveryPartnerId, items) {
    const modal = document.createElement("div");
    modal.className = "rating-modal";
    modal.id = "ratingModal";

    const itemsArray = typeof items === 'string' ? JSON.parse(items.replace(/&quot;/g, '"')) : items;

    modal.innerHTML = `
        <div class="rating-modal-content">
            <span class="rating-close" onclick="closeRatingModal()">&times;</span>
            <h2>Rate Your Order</h2>
            
            <div class="rating-section-item">
                <h3><i class="fas fa-store"></i> Restaurant</h3>
                <div class="star-rating" data-type="restaurant" data-id="${restaurantId}">
                    ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-rating="${i}">☆</span>`).join('')}
                </div>
                <textarea class="rating-comment" placeholder="Share your experience..." data-type="restaurant"></textarea>
            </div>
            
            ${deliveryPartnerId ? `
            <div class="rating-section-item">
                <h3><i class="fas fa-motorcycle"></i> Delivery Partner</h3>
                <div class="star-rating" data-type="delivery" data-id="${deliveryPartnerId}">
                    ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-rating="${i}">☆</span>`).join('')}
                </div>
                <textarea class="rating-comment" placeholder="How was the delivery?" data-type="delivery"></textarea>
            </div>
            ` : ''}
            
            <div class="rating-section-item">
                <h3><i class="fas fa-utensils"></i> Food Items</h3>
                ${itemsArray.map(item => `
                    <div class="food-item-rating">
                        <span>${item.menuItem?.name || 'Item'} x${item.quantity}</span>
                        <div class="star-rating" data-type="food" data-item-id="${item.menuItemId}">
                            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-rating="${i}">☆</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <button class="btn-submit-rating" onclick="submitRatings(${orderId}, ${restaurantId}, ${deliveryPartnerId || 'null'})">
                Submit Ratings
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Star rating functionality
    modal.querySelectorAll('.star-rating').forEach(ratingDiv => {
        let selectedRating = 0;
        const stars = ratingDiv.querySelectorAll('.star');

        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                selectedRating = index + 1;
                stars.forEach((s, i) => {
                    s.textContent = i < selectedRating ? '★' : '☆';
                    s.style.color = i < selectedRating ? '#ff6f1e' : '#ccc';
                });
                ratingDiv.dataset.rating = selectedRating;
            });

            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => {
                    s.style.color = i <= index ? '#ff6f1e' : '#ccc';
                });
            });
        });

        ratingDiv.addEventListener('mouseleave', () => {
            stars.forEach((s, i) => {
                s.textContent = i < selectedRating ? '★' : '☆';
                s.style.color = i < selectedRating ? '#ff6f1e' : '#ccc';
            });
        });
    });
}

function closeRatingModal() {
    const modal = document.getElementById("ratingModal");
    if (modal) modal.remove();
}

async function submitRatings(orderId, restaurantId, deliveryPartnerId) {
    const modal = document.getElementById("ratingModal");
    if (!modal) return;

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please login first");
        return;
    }

    const ratings = [];

    // Restaurant rating
    const restaurantRating = modal.querySelector('[data-type="restaurant"]');
    const restaurantRatingValue = restaurantRating?.dataset.rating || 0;
    const restaurantComment = modal.querySelector('[data-type="restaurant"] + .rating-comment')?.value || '';

    if (restaurantRatingValue > 0) {
        ratings.push({
            restaurantId: parseInt(restaurantId),
            orderId: parseInt(orderId),
            rating: parseInt(restaurantRatingValue),
            comment: restaurantComment,
            ratingType: "restaurant"
        });
    }

    // Delivery partner rating
    if (deliveryPartnerId) {
        const deliveryRating = modal.querySelector('[data-type="delivery"]');
        const deliveryRatingValue = deliveryRating?.dataset.rating || 0;
        const deliveryComment = modal.querySelector('[data-type="delivery"] + .rating-comment')?.value || '';

        if (deliveryRatingValue > 0) {
            ratings.push({
                deliveryPartnerId: parseInt(deliveryPartnerId),
                orderId: parseInt(orderId),
                rating: parseInt(deliveryRatingValue),
                comment: deliveryComment,
                ratingType: "delivery"
            });
        }
    }

    // Food item ratings
    const foodRatings = modal.querySelectorAll('[data-type="food"]');
    foodRatings.forEach(foodRating => {
        const ratingValue = foodRating.dataset.rating || 0;
        const menuItemId = foodRating.dataset.itemId;

        if (ratingValue > 0 && menuItemId) {
            ratings.push({
                menuItemId: parseInt(menuItemId),
                orderId: parseInt(orderId),
                rating: parseInt(ratingValue),
                ratingType: "food"
            });
        }
    });

    if (ratings.length === 0) {
        alert("Please rate at least one item");
        return;
    }

    try {
        // Submit all ratings
        for (const rating of ratings) {
            const res = await fetch("http://localhost:6789/api/ratings", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(rating)
            });

            const result = await res.json();
            if (!result.success) {
                console.error("Error submitting rating:", result.message);
            }
        }

        alert("Ratings submitted successfully!");
        closeRatingModal();
        loadOrders(); // Reload to show ratings
    } catch (error) {
        console.error("Error submitting ratings:", error);
        alert("Error submitting ratings. Please try again.");
    }
}

// Make functions global
window.openRatingModal = openRatingModal;
window.closeRatingModal = closeRatingModal;
window.submitRatings = submitRatings;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    // Check if Socket.io is loaded
    if (typeof io === 'undefined') {
        console.error("Socket.io not loaded! Make sure the script is included in HTML.");
        alert("Real-time updates unavailable. Please refresh the page.");
    } else {
        initWebSocket();
    }
    loadOrders();
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
    if (socket) {
        socket.disconnect();
    }
});

