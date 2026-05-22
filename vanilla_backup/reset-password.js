// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

if (!token) {
    document.getElementById("message").textContent = "Invalid reset link. Please request a new password reset.";
    document.getElementById("message").className = "message error";
    document.getElementById("message").style.display = "block";
    document.getElementById("resetPasswordForm").style.display = "none";
} else {
    document.getElementById("token").value = token;
}

const form = document.getElementById("resetPasswordForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    
    if (newPassword !== confirmPassword) {
        showMessage("Passwords do not match", "error");
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage("Password must be at least 6 characters", "error");
        return;
    }
    
    // Disable button
    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Resetting...";
    
    try {
        const res = await fetch("http://localhost:6789/api/reset-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                token: document.getElementById("token").value,
                newPassword 
            })
        });
        
        const result = await res.json();
        
        if (result.success) {
            showMessage(result.message + " Redirecting to login...", "success");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        } else {
            showMessage(result.message, "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Reset Password";
        }
    } catch (error) {
        showMessage("An error occurred. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Reset Password";
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById("message");
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = "block";
}

