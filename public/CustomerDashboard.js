let allRestaurants = [];
let socket = null;
let userLocation = null;
let favoriteRestaurants = JSON.parse(localStorage.getItem('favorites') || '[]');
let currentFilters = {
  cuisine: null,
  minRating: null,
  sortBy: 'rating' // rating, deliveryTime, name
};

// Initialize WebSocket for real-time updates
function initWebSocket() {
  const token = localStorage.getItem("token");
  if (!token) return;

  socket = io("http://localhost:6789");

  socket.on("connect", () => {
    console.log("✅ Connected to WebSocket");
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id;
      const role = payload.role || "customer";
      socket.emit("join", { userId, role });
    } catch (err) {
      console.error("Error parsing token:", err);
    }
  });

  socket.on("order_update", (data) => {
    console.log("📦 Order update received:", data);
    // Refresh orders if on MyOrders page
    if (window.location.pathname.includes("MyOrders")) {
      window.location.reload();
    }
  });

  socket.on("order_list_update", (data) => {
    console.log("📋 Order list updated:", data);
  });

  // NEW: Listen for menu updates
  socket.on("MENU_UPDATED", (data) => {
    console.log("🍽️ Menu update received:", data);
    // Refresh restaurant list to show updated menu
    if (window.location.pathname.includes("CustomerDashboard")) {
      console.log(`Restaurant ${data.restaurantId} menu was ${data.action}`);
      loadRestaurants(); // Refresh the restaurant list
      showNotification(`Restaurant menu was updated! Refreshing list...`);
    }
  });
}

// Helper function to show notifications
function showNotification(message) {
  // Create a simple notification
  const notification = document.createElement("div");
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}


// Get user location
async function getUserLocation() {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          resolve(userLocation);
        },
        () => {
          // Fallback: try to get from user's default address or use IP-based location
          console.log("Location access denied, using default");
          resolve(null);
        }
      );
    } else {
      resolve(null);
    }
  });
}

// Load restaurants from backend and render cards
async function loadRestaurants() {
  const grid = document.getElementById("restaurantGrid");
  grid.innerHTML = "<p>Loading restaurants...</p>";

  try {
    // Get user's location from their default address
    let locationFilter = "";
    const token = localStorage.getItem("token");

    // Try to get user's default address from API
    if (token) {
      try {
        const addressRes = await fetch("http://localhost:6789/api/addresses", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const addressData = await addressRes.json();

        if (addressData.success && addressData.addresses && addressData.addresses.length > 0) {
          // Get default address or first address
          const defaultAddress = addressData.addresses.find(addr => addr.isDefault) || addressData.addresses[0];
          if (defaultAddress && defaultAddress.city) {
            locationFilter = defaultAddress.city;
          }
        }
      } catch (err) {
        console.log("Could not fetch user address, showing all restaurants:", err);
      }
    }

    // Build API URL with location filter
    let apiUrl = "http://localhost:6789/api/restaurants";
    if (locationFilter) {
      apiUrl += `?city=${encodeURIComponent(locationFilter)}`;
    }

    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data.success) {
      grid.innerHTML = "<p>Failed to load restaurants</p>";
      return;
    }

    allRestaurants = data.restaurants;

    if (allRestaurants.length === 0) {
      grid.innerHTML = "<p>No restaurants found.</p>";
      return;
    }

    renderRestaurants(allRestaurants);

  } catch (err) {
    console.error("Error loading restaurants:", err);
    grid.innerHTML = "<p>Error loading restaurants.</p>";
  }
}

function renderRestaurants(restaurants) {
  const grid = document.getElementById("restaurantGrid");
  grid.innerHTML = "";

  if (restaurants.length === 0) {
    grid.innerHTML = "<p>No restaurants found matching your search.</p>";
    return;
  }

  restaurants.forEach(r => {
    const card = document.createElement("article");
    card.className = "restaurant-card";
    card.dataset.id = r.id;

    // Use local placeholder if image not available
    const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2YwZjJmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SZXN0YXVyYW50PC90ZXh0Pjwvc3ZnPg==';
    const imageUrl = r.image ? `http://localhost:6789${r.image}` : placeholderSvg;

    card.innerHTML = `
      <img src="${imageUrl}" alt="${r.name}" onerror="this.src='${placeholderSvg}'" />
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
}

// Enhanced search and filter functionality
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.querySelector(".btn-search");

  const performSearch = () => {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    let filtered = [...allRestaurants];

    // Text search
    if (query) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.address && r.address.toLowerCase().includes(query)) ||
        (r.cuisine && r.cuisine.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (currentFilters.minRating) {
      filtered = filtered.filter(r => (r.rating || 0) >= currentFilters.minRating);
    }

    if (currentFilters.cuisine) {
      filtered = filtered.filter(r => r.cuisine === currentFilters.cuisine);
    }

    renderRestaurants(filtered);
  };

  if (searchButton) {
    searchButton.addEventListener("click", performSearch);
  }

  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        performSearch();
      }
    });

    searchInput.addEventListener("input", () => {
      if (searchInput.value === "") {
        performSearch();
      }
    });
  }

  // Setup filter buttons
  setupFilters();
}

function setupFilters() {
  // Rating filter
  document.querySelectorAll('[data-filter="rating"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter="rating"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.minRating = btn.dataset.value ? parseFloat(btn.dataset.value) : null;
      applyFilters();
    });
  });

  // Sort filter
  document.querySelectorAll('[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilters.sortBy = btn.dataset.sort;
      applyFilters();
    });
  });

  // Cuisine filter
  document.querySelectorAll('[data-filter="cuisine"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        currentFilters.cuisine = null;
      } else {
        document.querySelectorAll('[data-filter="cuisine"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilters.cuisine = btn.dataset.value;
      }
      applyFilters();
    });
  });
}

function applyFilters() {
  let filtered = [...allRestaurants];

  // Apply rating filter
  if (currentFilters.minRating) {
    filtered = filtered.filter(r => (r.rating || 0) >= currentFilters.minRating);
  }

  // Apply cuisine filter
  if (currentFilters.cuisine) {
    filtered = filtered.filter(r => r.cuisine === currentFilters.cuisine);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    if (currentFilters.sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    } else if (currentFilters.sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  renderRestaurants(filtered);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
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

document.addEventListener("DOMContentLoaded", () => {
  initWebSocket();
  getUserLocation();
  loadRestaurants();
  setupSearch();

  // Setup enhanced search if element exists
  const enhancedSearch = document.getElementById("searchInputEnhanced");
  if (enhancedSearch) {
    enhancedSearch.addEventListener('input', () => {
      const query = enhancedSearch.value.toLowerCase().trim();
      if (query === "") {
        renderRestaurants(allRestaurants);
        return;
      }
      const filtered = allRestaurants.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.address && r.address.toLowerCase().includes(query)) ||
        (r.cuisine && r.cuisine.toLowerCase().includes(query))
      );
      renderRestaurants(filtered);
    });
  }
});
