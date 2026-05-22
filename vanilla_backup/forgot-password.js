const form = document.getElementById("forgotPasswordForm");
const messageDiv = document.getElementById("message");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const email = document.getElementById("email").value.trim();
    
    if (!email) {
        showMessage("Please enter your email address", "error");
        return;
    }
    
    // Disable button
    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    
    try {
        const res = await fetch("http://localhost:6789/api/forgot-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });
        
        const result = await res.json();
        
        if (result.success) {
            showMessage(result.message, "success");
            form.reset();
        } else {
            showMessage(result.message, "error");
        }
    } catch (error) {
        showMessage("An error occurred. Please try again.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Reset Link";
    }
});

function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = "block";
    
    if (type === "success") {
        setTimeout(() => {
            messageDiv.style.display = "none";
        }, 5000);
    }
}

