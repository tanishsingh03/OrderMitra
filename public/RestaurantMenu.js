const urlParams = new URLSearchParams(window.location.search);
const restaurantId = urlParams.get("restaurantId");

let cart = JSON.parse(localStorage.getItem("cart")) || [];

updateCartCount();

async function loadMenu() {
    const res = await fetch(`http://localhost:6789/api/menu/${restaurantId}`);
    const data = await res.json();

    if (!data.success) return alert("Failed to load menu");

    document.getElementById("restaurantName").innerText = data.menu[0]?.restaurantName ?? "Restaurant Menu";

    const list = document.getElementById("menuList");
    list.innerHTML = "";

    data.menu.forEach(item => {
        const div = document.createElement("div");
        div.className = "menu-item";

        div.innerHTML = `
            <h3>${item.name}</h3>
            <p>₹${item.price}</p>
            <button onclick="addToCart(${item.id}, '${item.name}', ${item.price})">Add to Cart</button>
        `;

        list.appendChild(div);
    });
}

function addToCart(id, name, price) {
    let item = cart.find(i => i.id === id);

    if (item) {
        item.qty++;
    } else {
        cart.push({ id, name, price, qty: 1, restaurantId });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();

    alert("Added to cart!");
}

function updateCartCount() {
    document.getElementById("cartCount").innerText =
        cart.reduce((acc, item) => acc + item.qty, 0);
}

function goToCart() {
    window.location.href = "Cart.html";
}

loadMenu();
