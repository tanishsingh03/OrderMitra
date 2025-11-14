async function addUser(email, password, role, URL) {
    try {
        const data = { email, password, role };

        const res = await fetch(URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await res.json();
        console.log(result);
        return result;

    } catch (error) {
        console.error("Error:", error);
        return { success: false, message: "Request failed" };
    }
}

const form = document.querySelector("#signup-form");

// Create message div dynamically (since your HTML doesn't have it)
const messageDiv = document.createElement("div");
messageDiv.id = "message";
form.after(messageDiv);

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    messageDiv.textContent = "";
    messageDiv.className = "";

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value.trim();
    const role = document.querySelector("#role").value.trim();

    if (!email || !password || !role) {
        messageDiv.textContent = "Please fill all fields!";
        messageDiv.className = "error";
        return;
    }

    const result = await addUser(
        email,
        password,
        role,
        "http://localhost:6789/api/signup"
    );

    if (result && result.success === true) {
        messageDiv.textContent = "Account created successfully! Redirecting...";
        messageDiv.className = "success";

        form.reset();
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);
    } else {
        messageDiv.textContent = result.message || "Something went wrong!";
        messageDiv.className = "error";
    }
});
