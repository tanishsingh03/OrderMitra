async function loginUser(email, password, URL) {
    try {
        const data = { email, password };
        const res = await fetch(URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await res.json();
        console.log("Login Response:", result);
        return result;

    } catch (error) {
        console.error("Error:", error);
        return { success: false, message: "Request failed" };
    }
}

const form = document.querySelector("#login-form");
let messageDiv = document.querySelector("#message");


form.addEventListener("submit", async (e) => {
    e.preventDefault();

    messageDiv.textContent = "";
    messageDiv.className = "";

    const email = form.querySelector("#email").value.trim();
    const password = form.querySelector("#password").value.trim();

    if (!email || !password) {
        messageDiv.textContent = "Please fill all fields!";
        messageDiv.className = "error";
        return;
    }

    const result = await loginUser(
        email,
        password,
        "http://localhost:6789/api/login"
    );

    if (result && result.success === true) {
        messageDiv.textContent = "Login successful! Redirecting...";
        messageDiv.className = "success";

        if (result.token) {
            localStorage.setItem("token", result.token);
        }

        setTimeout(() => {
            // if (result.user && result.user.role === "customer") {
            //     window.location.href = "CustomerDashboard.html";
            // } 
            if (result.user && result.user.role === "customer") {
                window.location.href = "CustomerDashboard.html";
            }


            else if (result.user && result.user.role === "restaurant-owner") {
                window.location.href = "RestaurantDashboard.html";
            }
            else {
                window.location.href = "Main.html";
            }
        }, 1500);

    } else {
        messageDiv.textContent = result.message || "Invalid credentials";
        messageDiv.className = "error";
    }
});
