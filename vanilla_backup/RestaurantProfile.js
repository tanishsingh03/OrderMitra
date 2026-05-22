const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first.");
    window.location.href = "login.html";
}

// ------------------------------
// LOAD RESTAURANT PROFILE
// ------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("http://localhost:6789/api/restaurant/me", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await res.json();
        console.log("Restaurant Profile:", result);

        if (result.success && result.restaurant) {

            const r = result.restaurant;   // <-- NO req here

            document.getElementById("name").value = r.name || "";
            document.getElementById("email").value = r.email || "";
            document.getElementById("address").value = r.address || "";
            document.getElementById("phone").value = r.phone || "";
        } 
        else {
            alert(result.message || "Unable to load profile");
        }

    } catch (error) {
        console.error("Profile load error:", error);
        alert("Something went wrong loading profile.");
    }
});


// ------------------------------
// UPDATE RESTAURANT PROFILE
// ------------------------------
document.getElementById("restaurantProfileForm")
.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const address = document.getElementById("address").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!name || !email) {
        return alert("Name and Email are required!");
    }

    const res = await fetch("http://localhost:6789/api/restaurant/update", {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password, address, phone })
    });

    const result = await res.json();
    console.log("Update Response:", result);

    if (result.success) {
        alert("Restaurant profile updated!");

        setTimeout(() => {
            window.location.href = "RestaurantDashboard.html";
        }, 800);

    } else {
        alert(result.message);
    }
});
