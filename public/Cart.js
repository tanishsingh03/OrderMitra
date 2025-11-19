let cart = JSON.parse(localStorage.getItem("cart")) || [];

function loadCart() {
    const list = document.getElementById("cartItems");

    if (cart.length === 0) {
        list.innerHTML = "<p>Your cart is empty</p>";
        return;
    }

    list.innerHTML = "";

    cart.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "cart-item";

        div.innerHTML = `
            <strong>${item.name}</strong> — ₹${item.price}
            <br>
            Quantity:
            <button onclick="updateQty(${index}, -1)">-</button>
            ${item.qty}
            <button onclick="updateQty(${index}, 1)">+</button>
        `;

        list.appendChild(div);
    });

    updateTotal();
}

function updateQty(index, value) {
    cart[index].qty += value;

    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
}

function updateTotal() {
    const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
    document.getElementById("totalPrice").innerText = total;
}

async function placeOrder() {
    const token = localStorage.getItem("token");

    if (!token) return alert("Please log in first");

    if (cart.length === 0) return alert("Cart empty!");

    const restaurantId = cart[0].restaurantId;

    const res = await fetch("http://localhost:6789/api/orders/place", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            restaurantId,
            items: cart
        })
    });

    const data = await res.json();

    if (data.success) {
        alert("Order placed successfully!");

        localStorage.removeItem("cart");
        window.location.href = "OrderSuccess.html";
    } else {
        alert(data.message);
    }
}

loadCart();
