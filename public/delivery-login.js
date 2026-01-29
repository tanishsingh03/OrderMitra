const form = document.getElementById("deliveryLoginForm");
const messageDiv = document.getElementById("message");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    
    if (!email || !password) {
        showMessage("Please enter email and password", "error");
        return;
    }
    
    // Disable button
    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";
    
    try {
        const res = await fetch("http://localhost:6789/api/delivery/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await res.json();
        
        if (result.success) {
            // Store token and user info
            localStorage.setItem("token", result.token);
            localStorage.setItem("user", JSON.stringify(result.partner));
            localStorage.setItem("role", "delivery-partner");
            
            showMessage("Login successful! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "DeliveryDashboard.html";
            }, 1000);
        } else {
            showMessage(result.message || "Invalid email or password", "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Login";
        }
    } catch (error) {
        showMessage("An error occurred. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
    }
});

function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = "block";
}

