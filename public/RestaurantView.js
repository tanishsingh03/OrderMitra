const params = new URLSearchParams(window.location.search);
const restaurantId = params.get("rid");

let cart = [];

// Load restaurant data
async function loadRestaurant() {
    const res = await fetch(`http://localhost:6789/api/restaurants/${restaurantId}`);
    const data = await res.json();

    if (data.success) {
        document.getElementById("restName").innerText = data.restaurant.name;
    }
}

// Load menu
async function loadMenu() {
    const res = await fetch(`http://localhost:6789/api/menu/${restaurantId}`);
    const data = await res.json();

    const container = document.getElementById("menuList");
    container.innerHTML = "";

    data.menu.forEach(item => {
        const div = document.createElement("div");
        div.className = "menu-card";

        div.innerHTML = `
            <img src="${item.image ? '/uploads/' + item.image : 'https://via.placeholder.com/150'}">
            <h4>${item.name}</h4>
            <p>₹${item.price}</p>
            <button class="add-btn">Add</button>
        `;

        div.querySelector(".add-btn").addEventListener("click", () => addToCart(item));
        container.appendChild(div);
    });
}

// Add item to cart
function addToCart(item) {
    cart.push(item);
    renderCart();
}

// Render cart
function renderCart() {
    const list = document.getElementById("cartList");
    list.innerHTML = "";

    let total = 0;

    cart.forEach((item, index) => {
        total += item.price;

        const li = document.createElement("li");
        li.innerHTML = `
            ${item.name} - ₹${item.price}
            <button onclick="removeItem(${index})">X</button>
        `;
        list.appendChild(li);
    });

    document.getElementById("totalPrice").innerText = total;
}

// Remove item
function removeItem(index) {
    cart.splice(index, 1);
    renderCart();
}

// Place order
async function placeOrder() {
    if (cart.length === 0) return alert("Cart empty!");

    const token = localStorage.getItem("token");
    if (!token) return alert("Please login as customer.");

    const res = await fetch("http://localhost:6789/api/orders/place", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            restaurantId,
            items: cart.map(i => ({ id: i.id, price: i.price }))
        })
    });

    const data = await res.json();
    if (data.success) {
        alert("Order placed successfully!");
        cart = [];
        renderCart();
    } else {
        alert(data.message);
    }
}

// Load page
loadRestaurant();
loadMenu();
