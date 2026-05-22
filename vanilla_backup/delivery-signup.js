const form = document.getElementById("deliverySignupForm");
const messageDiv = document.getElementById("message");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        password: document.getElementById("password").value,
        vehicleType: document.getElementById("vehicleType").value,
        vehicleNumber: document.getElementById("vehicleNumber").value.trim(),
        licenseNumber: document.getElementById("licenseNumber").value.trim(),
    };
    
    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.vehicleType) {
        showMessage("Please fill all required fields", "error");
        return;
    }
    
    if (formData.password.length < 6) {
        showMessage("Password must be at least 6 characters", "error");
        return;
    }
    
    // Disable button
    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing up...";
    
    try {
        const res = await fetch("http://localhost:6789/api/delivery/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });
        
        const result = await res.json();
        
        if (result.success) {
            showMessage("Signup successful! Redirecting to login...", "success");
            setTimeout(() => {
                window.location.href = "delivery-login.html";
            }, 2000);
        } else {
            showMessage(result.message || "Signup failed. Please try again.", "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign Up";
        }
    } catch (error) {
        showMessage("An error occurred. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign Up";
    }
});

function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = "block";
    
    if (type === "success") {
        setTimeout(() => {
            messageDiv.style.display = "none";
        }, 3000);
    }
}

