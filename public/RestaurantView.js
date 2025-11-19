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

      card.innerHTML = `
        <h4>${item.name}</h4>
        <p>₹${item.price}</p>
        <button class="add-btn">Add</button>
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
}

function renderCart() {
  const list = document.getElementById("cartList");
  list.innerHTML = "";

  if (cart.length === 0) {
    list.innerHTML = "<li>Cart is empty</li>";
    document.getElementById("totalPrice").innerText = "0";
    return;
  }

  let total = 0;

  cart.forEach((item, index) => {
    total += item.price * item.qty;

    const li = document.createElement("li");
    li.innerHTML = `
      ${item.name} - ₹${item.price} x ${item.qty}
      <button onclick="changeQty(${index}, -1)">-</button>
      <button onclick="changeQty(${index}, 1)">+</button>
    `;
    list.appendChild(li);
  });

  document.getElementById("totalPrice").innerText = total;
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
    window.location.href = "login.html";
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
      // later: redirect to MyOrders page
    } else {
      alert(data.message || "Failed to place order");
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
