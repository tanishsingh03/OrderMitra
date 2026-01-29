const form = document.getElementById("updateProfileForm");
const token = localStorage.getItem("token");

if (!token) {
    // DISABLED: window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", loadCustomerData);

async function loadCustomerData() {
    try {
        const res = await fetch("http://localhost:6789/api/customer/me", {
            headers: { "Authorization": "Bearer " + token }
        });

        // DISABLED: if (res.status === 401 || res.status === 403) {
            // DISABLED: // alert("Session expired. Please login again.");
            // localStorage.removeItem("token");
            // window.location.href = "login.html";
            // return;
        // }

        const result = await res.json();

        if (result.success) {
            document.getElementById("email").value = result.user.email || "";
            document.getElementById("name").value = result.user.name || "";
            document.getElementById("phone").value = result.user.phone || "";

            // Load addresses after loading profile
            loadAddresses();

            // Show profile completeness status
            const hasAddress = result.user.addresses && result.user.addresses.length > 0;
            const hasPhone = result.user.phone && result.user.phone.trim() !== "";
            const hasName = result.user.name && result.user.name.trim() !== "";

            if (!hasAddress || !hasPhone || !hasName) {
                const warning = document.createElement("div");
                warning.className = "alert alert-warning";
                warning.innerHTML = `
                    <strong>⚠️ Complete your profile to place orders:</strong>
                    <ul>
                        ${!hasName ? '<li>Add your name</li>' : ''}
                        ${!hasPhone ? '<li>Add a phone number</li>' : ''}
                        ${!hasAddress ? '<li>Add at least one delivery address</li>' : ''}
                    </ul>
                `;
                form.parentElement.insertBefore(warning, form);
            }
        } else {
            alert(result.message || "Failed to load profile");
        }
    } catch (err) {
        console.error("Error loading profile:", err);
        alert("Failed to load profile. Please try again.");
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
    };

    // Only include password if user entered one
    const password = document.getElementById("password").value.trim();
    if (password) {
        if (password.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }
        userData.password = password;
    }

    if (!userData.name || !userData.email) {
        alert("Name and email are required");
        return;
    }

    try {
        const res = await fetch("http://localhost:6789/api/customer/update", {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        // DISABLED: if (res.status === 401 || res.status === 403) {
            // DISABLED: // alert("Session expired. Please login again.");
            // localStorage.removeItem("token");
            // window.location.href = "login.html";
            // return;
        // }

        const result = await res.json();

        if (result.success) {
            alert("Profile updated successfully!");
            // Clear password field after successful update
            document.getElementById("password").value = "";
        } else {
            alert(result.message || "Failed to update profile");
        }
    } catch (err) {
        console.error("Error updating profile:", err);
        alert("Failed to update profile. Please try again.");
    }
});

// ============ ADDRESS MANAGEMENT ============

const addAddressBtn = document.getElementById("addAddressBtn");
const addAddressForm = document.getElementById("addAddressForm");
const saveAddressBtn = document.getElementById("saveAddressBtn");
const cancelAddressBtn = document.getElementById("cancelAddressBtn");

addAddressBtn.addEventListener("click", () => {
    addAddressForm.classList.add("active");
    addAddressBtn.style.display = "none";
});

cancelAddressBtn.addEventListener("click", () => {
    addAddressForm.classList.remove("active");
    addAddressBtn.style.display = "block";
    clearAddressForm();
});

saveAddressBtn.addEventListener("click", async () => {
    const addressData = {
        label: document.getElementById("newAddressLabel").value.trim() || "Home",
        street: document.getElementById("newAddressStreet").value.trim(),
        city: document.getElementById("newAddressCity").value.trim(),
        state: document.getElementById("newAddressState").value.trim(),
        zipCode: document.getElementById("newAddressZip").value.trim()
    };

    if (!addressData.street || !addressData.city || !addressData.state || !addressData.zipCode) {
        alert("Please fill in all required address fields");
        return;
    }

    try {
        const res = await fetch("http://localhost:6789/api/addresses", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(addressData)
        });

        const result = await res.json();

        if (result.success) {
            alert("Address added successfully!");
            clearAddressForm();
            addAddressForm.classList.remove("active");
            addAddressBtn.style.display = "block";
            loadAddresses();
            // Reload customer data to update profile completeness warning
            loadCustomerData();
        } else {
            alert(result.message || "Failed to add address");
        }
    } catch (err) {
        console.error("Error adding address:", err);
        alert("Failed to add address. Please try again.");
    }
});

async function loadAddresses() {
    try {
        const res = await fetch("http://localhost:6789/api/addresses", {
            headers: { "Authorization": "Bearer " + token }
        });

        const result = await res.json();

        if (result.success) {
            displayAddresses(result.addresses);
        }
    } catch (err) {
        console.error("Error loading addresses:", err);
    }
}

function displayAddresses(addresses) {
    const list = document.getElementById("addressesList");

    if (!addresses || addresses.length === 0) {
        list.innerHTML = '<p style="color:#ff6f1e; padding:10px; background:#fff3cd; border-radius:5px;">⚠️ No addresses added yet. Please add at least one delivery address to place orders.</p>';
        return;
    }

    list.innerHTML = addresses.map(addr => `
        <div class="address-card">
            <div class="address-info">
                <strong>${addr.label || 'Address'}</strong><br>
                ${addr.street}<br>
                ${addr.city}, ${addr.state} ${addr.zipCode}
            </div>
            <div class="address-actions">
                <button onclick="deleteAddress(${addr.id})" style="background:#dc3545; color:white;">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteAddress(id) {
    if (!confirm("Delete this address?")) return;

    try {
        const res = await fetch(`http://localhost:6789/api/addresses/${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        });

        const result = await res.json();

        if (result.success) {
            alert("Address deleted successfully!");
            loadAddresses();
            loadCustomerData();
        } else {
            alert(result.message || "Failed to delete address");
        }
    } catch (err) {
        console.error("Error deleting address:", err);
        alert("Failed to delete address. Please try again.");
    }
}

function clearAddressForm() {
    document.getElementById("newAddressLabel").value = "";
    document.getElementById("newAddressStreet").value = "";
    document.getElementById("newAddressCity").value = "";
    document.getElementById("newAddressState").value = "";
    document.getElementById("newAddressZip").value = "";
}

// Make deleteAddress available globally
window.deleteAddress = deleteAddress;
