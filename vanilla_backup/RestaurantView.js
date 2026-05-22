// public/RestaurantView.js

const params = new URLSearchParams(window.location.search);
const restaurantId = params.get("rid");

let cart = [];

const token = localStorage.getItem("token");

async function loadRestaurant() {
  try {
    const res = await fetch(`http://localhost:6789/api/restaurants/${restaurantId}`);
    const data = await res.json();
    console.log("Restaurant:", data);

    if (!data.success) {
      alert(data.message || "Failed to load restaurant");
      return;
    }

    const r = data.restaurant;
    document.getElementById("restName").innerText = r.name || "Restaurant";
    document.getElementById("restAddress").innerText = r.address || "";
  } catch (err) {
    console.error("loadRestaurant error:", err);
    alert("Error loading restaurant");
  }
}

async function loadMenu() {
  try {
    const res = await fetch(`http://localhost:6789/api/menu/${restaurantId}`);
    const data = await res.json();
    console.log("Menu:", data);

    const container = document.getElementById("menuList");
    container.innerHTML = "";

    if (!data.success) {
      container.innerHTML = "<p>Failed to load menu</p>";
      return;
    }

    if (!data.menu || data.menu.length === 0) {
      container.innerHTML = "<p>No menu items yet.</p>";
      return;
    }

    data.menu.forEach(item => {
      const card = document.createElement("div");
      card.className = "menu-card";

      // Use local placeholder if image not available
      const imageUrl = item.image ? `http://localhost:6789${item.image}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2YwZjJmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Gb29kIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

      card.innerHTML = `
        <img src="${imageUrl}" alt="${item.name}" class="menu-card-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <div class="menu-card-placeholder" style="display:none; width:100%; height:180px; background:#f0f2f5; display:flex; align-items:center; justify-content:center; color:#9ca3af;">
          <span>Food Image</span>
        </div>
        <div class="menu-card-content">
          <h4>${item.name}</h4>
          <p>₹${item.price.toFixed(2)}</p>
          <button class="add-btn">Add to Cart</button>
        </div>
      `;

      card.querySelector(".add-btn").addEventListener("click", () => addToCart(item));
      container.appendChild(card);
    });

  } catch (err) {
    console.error("loadMenu error:", err);
    document.getElementById("menuList").innerHTML = "<p>Error loading menu</p>";
  }
}

function addToCart(item) {
  const existing = cart.find(ci => ci.id === item.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: 1,
      restaurantId: Number(restaurantId),
    });
  }
  renderCart();
  alert(`${item.name} added to cart!`);
}

function renderCart() {
  const list = document.getElementById("cartList");
  list.innerHTML = "";

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty</p>
      </div>
    `;
    document.getElementById("subtotal").innerText = "0.00";
    document.getElementById("deliveryFee").innerText = "0.00";
    document.getElementById("handlingCharge").innerText = "0.00";
    document.getElementById("tax").innerText = "0.00";
    document.getElementById("totalPrice").innerText = "0.00";
    return;
  }

  // Calculate subtotal
  let subtotal = 0;
  cart.forEach((item, index) => {
    subtotal += item.price * item.qty;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">₹${item.price.toFixed(2)} each</div>
      </div>
      <div class="item-qty">
        <button onclick="changeQty(${index}, -1)">-</button>
        <span class="qty-display">${item.qty}</span>
        <button onclick="changeQty(${index}, 1)">+</button>
      </div>
    `;
    list.appendChild(li);
  });

  // Calculate fees (same logic as backend)
  const baseDeliveryFee = 30;
  const percentageDeliveryFee = subtotal * 0.05;
  const deliveryFee = Math.min(Math.max(baseDeliveryFee, percentageDeliveryFee), 100);
  
  const handlingCharge = Math.min(Math.max(subtotal * 0.02, 10), 50);
  const tax = subtotal * 0.05;
  const totalPrice = subtotal + deliveryFee + handlingCharge + tax;

  // Update display
  document.getElementById("subtotal").innerText = subtotal.toFixed(2);
  document.getElementById("deliveryFee").innerText = deliveryFee.toFixed(2);
  document.getElementById("handlingCharge").innerText = handlingCharge.toFixed(2);
  document.getElementById("tax").innerText = tax.toFixed(2);
  document.getElementById("totalPrice").innerText = totalPrice.toFixed(2);
}

window.changeQty = function (index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  renderCart();
};

async function placeOrder() {
  if (!token) {
    alert("Please login as customer first");
    // DISABLED: window.location.href = "login.html";
    return;
  }

  if (cart.length === 0) {
    alert("Cart is empty");
    return;
  }

  const restaurantIdNum = Number(restaurantId);

  const payload = {
    restaurantId: restaurantIdNum,
    items: cart.map(c => ({
      id: c.id,
      qty: c.qty,
    })),
  };

  try {
    // Verify token before placing order
    if (!token) {
      alert("Please login first");
      // DISABLED: window.location.href = "login.html";
      return;
    }

    // Check role from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== "customer" && payload.role !== "user") {
        alert("Only customers can place orders. Please login as customer.");
        // DISABLED: window.location.href = "login.html";
        return;
      }
    } catch (err) {
      console.error("Error parsing token:", err);
      alert("Invalid session. Please login again.");
      // DISABLED: localStorage.removeItem("token");
      // DISABLED: window.location.href = "login.html";
      return;
    }

    const res = await fetch("http://localhost:6789/api/orders/place", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Place order:", data);

    if (data.success) {
      alert("Order placed! Order #" + data.orderNumber);
      cart = [];
      renderCart();
      // Redirect to MyOrders page
      setTimeout(() => {
        window.location.href = "MyOrders.html";
      }, 1000);
    } else {
      // More detailed error message
      if (data.message && data.message.includes("customer")) {
        alert("Please login as customer to place orders.");
        // DISABLED: window.location.href = "login.html";
      } else {
        alert(data.message || "Failed to place order");
      }
    }
  } catch (err) {
    console.error("placeOrder error:", err);
    alert("Error placing order");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadRestaurant();
  loadMenu();
  renderCart();
  //document.getElementById("placeOrderBtn").addEventListener("click", placeOrder);
});
