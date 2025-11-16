const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first.");
    window.location.href = "login.html";
}

// ------------------------------
// LOAD RESTAURANT DATA
// ------------------------------
async function loadRestaurant() {
    const res = await fetch("http://localhost:6789/api/restaurant/me", {
        headers: { "Authorization": "Bearer " + token }
    });

    const result = await res.json();
    console.log("Restaurant:", result);

    if (result.success) {
        document.getElementById("restName").textContent = result.restaurant.name;
        document.getElementById("restEmail").textContent = result.restaurant.email;
        document.getElementById("restAddress").textContent = result.restaurant.address;
    }
}

loadRestaurant();


// ------------------------------
// ADD MENU ITEM
// ------------------------------
async function addMenuItem() {
    const name = document.getElementById("menuName").value;
    const price = document.getElementById("menuPrice").value;

    if (!name || !price) return alert("Enter name and price!");

    const res = await fetch("http://localhost:6789/api/menu", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, price })
    });

    const result = await res.json();
    alert(result.message);
    loadMenu();
}


// ------------------------------
// LOAD MENU ITEMS
// ------------------------------
async function loadMenu() {
    const res = await fetch("http://localhost:6789/api/menu", {
        headers: { "Authorization": "Bearer " + token }
    });

    const result = await res.json();
    const list = document.getElementById("menuList");
    list.innerHTML = "";

    result.menu.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${item.name} - ₹${item.price}
        `;
        list.appendChild(li);
    });
}

loadMenu();


// ------------------------------
// LOAD ORDERS
// ------------------------------
async function loadOrders() {
    const res = await fetch("http://localhost:6789/api/orders", {
        headers: { "Authorization": "Bearer " + token }
    });

    const result = await res.json();
    const list = document.getElementById("ordersList");
    list.innerHTML = "";

    result.orders.forEach(order => {
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>Order #${order.id}</strong><br>
            Customer: ${order.user.email}<br>
            Status: ${order.status}<br>
            <button onclick="updateOrder(${order.id}, 'Preparing')">Preparing</button>
            <button onclick="updateOrder(${order.id}, 'Delivered')">Delivered</button>
        `;
        list.appendChild(li);
    });
}

loadOrders();


// ------------------------------
// UPDATE ORDER STATUS
// ------------------------------
async function updateOrder(id, status) {
    const res = await fetch(`http://localhost:6789/api/orders/${id}`, {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
    });

    const result = await res.json();
    alert(result.message);
    loadOrders();
}


// ------------------------------
// LOGOUT
// ------------------------------
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
});
