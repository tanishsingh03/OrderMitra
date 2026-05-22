import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { Search, Star, Clock, MapPin, SlidersHorizontal, RefreshCw } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const CustomerDashboard = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // name, rating
  const [cityFilter, setCityFilter] = useState('');

  const navigate = useNavigate();

  const cuisinesList = ['North Indian', 'Italian', 'South Indian', 'Chinese', 'Burgers', 'Desserts', 'Sweets'];

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      let locationFilter = '';
      const addressRes = await api.get('/addresses');
      if (addressRes.data.success && addressRes.data.addresses && addressRes.data.addresses.length > 0) {
        const defaultAddress = addressRes.data.addresses.find((addr) => addr.isDefault) || addressRes.data.addresses[0];
        if (defaultAddress && defaultAddress.city) {
          locationFilter = defaultAddress.city;
          setCityFilter(locationFilter);
        }
      }

      // Build url
      let url = '/restaurants';
      if (locationFilter) {
        url += `?city=${encodeURIComponent(locationFilter)}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        setRestaurants(res.data.restaurants);
        setFilteredRestaurants(res.data.restaurants);
      }
    } catch (err) {
      console.error('Error loading restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  // Filter & Sort Logic
  useEffect(() => {
    let result = [...restaurants];

    const restaurantText = (r) =>
      `${r.name || ''} ${r.address || ''} ${r.cuisine || ''} ${r.description || ''}`.toLowerCase();

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => restaurantText(r).includes(q));
    }

    // Cuisine filter
    if (selectedCuisine) {
      const c = selectedCuisine.toLowerCase();
      result = result.filter((r) => restaurantText(r).includes(c));
    }

    // Sort logic
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
    }

    setFilteredRestaurants(result);
  }, [searchQuery, selectedCuisine, sortBy, restaurants]);

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '80vh' }}>
      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Order Food Online</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Discover the best dining spots near you{' '}
            {cityFilter && (
              <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                in {cityFilter}
              </span>
            )}
          </p>
        </div>
        <button onClick={loadRestaurants} className="btn-secondary btn-icon" style={{ padding: '10px' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Search & Filters Container */}
      <div className="search-filters-container">
        <div className="search-bar-enhanced">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} size={20} />
            <input
              type="text"
              placeholder="Search by restaurant name, cuisine or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '48px', width: '100%' }}
            />
          </div>
        </div>

        {/* Cuisines Categories Slider */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
          <button
            onClick={() => setSelectedCuisine(null)}
            className={`filter-btn ${!selectedCuisine ? 'active' : ''}`}
          >
            All Cuisines
          </button>
          {cuisinesList.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCuisine(c === selectedCuisine ? null : c)}
              className={`filter-btn ${selectedCuisine === c ? 'active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Sorting Controller */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={16} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: '600' }}
            >
              <option value="name">Alphabetical</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
            Showing {filteredRestaurants.length} restaurants
          </span>
        </div>
      </div>

      {/* Restaurants List */}
      {loading ? (
        <div className="loading" style={{ height: '300px' }}>Loading restaurants...</div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="card text-center" style={{ padding: '64px 24px', background: 'white' }}>
          <MapPin size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>No restaurants found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>We couldn't find any restaurants matching your search criteria.</p>
        </div>
      ) : (
        <div className="restaurant-grid">
          {filteredRestaurants.map((r) => {
            const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2YwZjJmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SZXN0YXVyYW50PC90ZXh0Pjwvc3ZnPg==';
            const imageUrl = r.image ? (r.image.startsWith('http') ? r.image : `http://localhost:6789${r.image}`) : placeholderSvg;

            return (
              <article key={r.id} className="restaurant-card" onClick={() => navigate(`/customer/restaurant/${r.id}`)}>
                <img src={imageUrl} alt={r.name} onError={(e) => { e.target.src = placeholderSvg; }} />
                <div className="rest-info">
                  <h3>{r.name}</h3>
                  <p className="cuisines">{r.address || 'Special menus available'}</p>
                  <div className="details">
                    <span>20–30 min</span>
                    <span className="delivery" style={{ color: 'var(--success)' }}>Free Delivery</span>
                  </div>
                </div>
                <div className="rating">
                  <Star fill="var(--primary-color)" stroke="none" size={14} />
                  <span>{r.rating ? r.rating.toFixed(1) : '4.5'}</span>
                </div>
                <div style={{ padding: '0 20px 20px' }}>
                  <button className="btn-primary" style={{ width: '100%', padding: '8px' }}>
                    View Menu
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
