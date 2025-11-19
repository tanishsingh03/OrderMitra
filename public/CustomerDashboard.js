// Load restaurants from backend and render cards
async function loadRestaurants() {
  const grid = document.getElementById("restaurantGrid");
  grid.innerHTML = "<p>Loading restaurants...</p>";

  try {
    const res = await fetch("http://localhost:6789/api/restaurants");
    const data = await res.json();

    if (!data.success) {
      grid.innerHTML = "<p>Failed to load restaurants</p>";
      return;
    }

    if (data.restaurants.length === 0) {
      grid.innerHTML = "<p>No restaurants found.</p>";
      return;
    }

    grid.innerHTML = "";

    data.restaurants.forEach(r => {
      const card = document.createElement("article");
      card.className = "restaurant-card";
      card.dataset.id = r.id; // VERY IMPORTANT

      card.innerHTML = `
        <img src="${r.image || 'https://via.placeholder.com/300x180?text=Restaurant'}" alt="${r.name}" />
        <div class="rest-info">
            <h3>${r.name}</h3>
            <p class="cuisines">${r.address || "Address not available"}</p>
            <div class="details">
                <span>20–30 min</span>
                <span class="delivery">Free delivery</span>
            </div>
        </div>
        <div class="rating">⭐ 4.5</div>
        <button class="btn-view-menu">View Menu</button>
      `;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading restaurants:", err);
    grid.innerHTML = "<p>Error loading restaurants.</p>";
  }
}

// Handle clicks on "View Menu"
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-view-menu")) {
      const card = e.target.closest(".restaurant-card");
      const restaurantId = card.dataset.id;

      // Correct customer menu page
      window.location.href = `RestaurantView.html?rid=${restaurantId}`;
  }
});

document.addEventListener("DOMContentLoaded", loadRestaurants);
