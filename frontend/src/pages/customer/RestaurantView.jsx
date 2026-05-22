import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { useCart } from '../../context/CartContext';
import { useNotification } from '../../context/NotificationContext';
import { useDietary } from '../../context/DietaryContext';
import DietaryFilterPanel from '../../components/dietary/DietaryFilterPanel';
import FoodTagBadge from '../../components/dietary/FoodTagBadge';
import ActiveFilters from '../../components/dietary/ActiveFilters';
import FilterSearchBar from '../../components/dietary/FilterSearchBar';
import { subscribeToEvent, unsubscribeFromEvent } from '../../sockets/socketService';
import { Star, Clock, MapPin, ChevronLeft, Plus, Minus, ShoppingBag, Leaf, ShieldAlert } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const RestaurantView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cartItems, addToCart, updateQuantity } = useCart();
  const { showNotification } = useNotification();
  const {
    selectedTags,
    matchType,
    priceMin,
    priceMax,
    isAvailableOnly,
    searchQuery,
    filteredItems,
    setFilteredItems,
    filterMenuItems,
    clearFilters
  } = useDietary();

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  // Unified restaurant detail loading
  const fetchRestaurantDetails = useCallback(async () => {
    try {
      const res = await api.get(`/restaurant/${id}`);
      if (res.data.success && res.data.restaurant) {
        setRestaurant({
          ...res.data.restaurant,
          menu: res.data.restaurant.menu || []
        });
      } else {
        showNotification(res.data.message || 'Restaurant not found', 'error');
        navigate('/customer/dashboard');
      }
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      showNotification('Failed to load restaurant details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showNotification]);

  useEffect(() => {
    fetchRestaurantDetails();
  }, [fetchRestaurantDetails]);

  // Synchronize dietary and search filters
  useEffect(() => {
    if (restaurant) {
      const isAnyFilterActive =
        selectedTags.length > 0 ||
        priceMin !== '' ||
        priceMax !== '' ||
        isAvailableOnly ||
        searchQuery.trim() !== '';

      if (isAnyFilterActive) {
        filterMenuItems(parseInt(id));
      } else {
        // Default list fallback when no tag filters are selected
        setFilteredItems(restaurant.menu || []);
      }
    }
  }, [restaurant, selectedTags, matchType, priceMin, priceMax, isAvailableOnly, searchQuery, filterMenuItems, id, setFilteredItems]);

  // Handle Socket.io real-time menu events
  useEffect(() => {
    const handleMenuUpdate = (data) => {
      if (data.restaurantId === parseInt(id)) {
        showNotification(
          `Menu Update: ${
            data.action === 'TAG_ASSIGNED'
              ? `New tag added to food items!`
              : `Menu metadata updated.`
          }`,
          'info'
        );
        fetchRestaurantDetails();
      }
    };

    subscribeToEvent('menuItemUpdated', handleMenuUpdate);
    return () => {
      unsubscribeFromEvent('menuItemUpdated', handleMenuUpdate);
    };
  }, [id, fetchRestaurantDetails, showNotification]);

  // Cleanup filters when leaving the page
  useEffect(() => {
    return () => {
      clearFilters();
    };
  }, []);

  if (loading) {
    return <div className="loading" style={{ height: '300px' }}>Loading restaurant menu...</div>;
  }

  if (!restaurant) {
    return (
      <div className="container text-center" style={{ padding: '64px' }}>
        <h3>Restaurant not found</h3>
        <button onClick={() => navigate('/customer/dashboard')} className="btn btn-primary mt-2">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Categories resolution
  const restaurantMenu = restaurant.menu || [];
  const hasActiveFilters =
    selectedTags.length > 0 ||
    priceMin !== '' ||
    priceMax !== '' ||
    isAvailableOnly ||
    searchQuery.trim() !== '';
  const baseMenuItems = hasActiveFilters ? filteredItems : restaurantMenu;
  const categories = ['All', ...new Set(restaurantMenu.map((item) => item.category || 'Others'))];

  // Apply active category filter in-memory on the dietary filtered items list
  const displayMenu = activeCategory === 'All'
    ? baseMenuItems
    : baseMenuItems.filter((item) => (item.category || 'Others') === activeCategory);

  const getCartQuantity = (itemId) => {
    const found = cartItems.find((item) => item.id === itemId);
    return found ? found.quantity : 0;
  };

  const handleAddToCart = (item) => {
    if (!item.isAvailable) {
      showNotification('This item is currently out of stock', 'error');
      return;
    }
    
    addToCart(item, {
      id: restaurant.id,
      name: restaurant.name,
      deliveryFee: 40,
    });
    showNotification(`${item.name} added to cart`, 'success');
  };

  const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2YwZjJmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Gb29kPC90ZXh0Pjwvc3ZnPg==';

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '80vh' }}>
      {/* Back button */}
      <button onClick={() => navigate('/customer/dashboard')} className="btn-secondary btn-icon" style={{ marginBottom: '24px', padding: '8px 16px' }}>
        <ChevronLeft size={16} /> Back to Restaurants
      </button>

      {/* Restaurant Header */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', background: 'white', marginBottom: '32px', border: '1.5px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>{restaurant.name}</h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <MapPin size={16} style={{ color: 'var(--primary-color)' }} />
              {restaurant.address || 'Address details not provided'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Phone: {restaurant.phone || 'N/A'}</p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '18px', color: 'var(--primary-color)', justifyContent: 'center' }}>
                <Star fill="var(--primary-color)" stroke="none" size={18} />
                <span>{restaurant.rating ? restaurant.rating.toFixed(1) : '4.5'}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rating</span>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '18px', color: 'var(--primary-color)', justifyContent: 'center' }}>
                <Clock size={18} />
                <span>{restaurant.prepTime || '25'} Min</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Delivery Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar Filter + Menu List */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px', alignItems: 'flex-start' }}>
        
        {/* Left Side Filter Panel */}
        <DietaryFilterPanel />

        {/* Right Side Menu Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Search bar and Category selector row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
            <FilterSearchBar />
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                  style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '700' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Active Chips Row */}
          <ActiveFilters />

          {/* Menu Items Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {displayMenu.length === 0 ? (
              <div
                style={{
                  gridColumn: 'span 3',
                  textAlign: 'center',
                  padding: '64px',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1.5px dashed #E5E7EB',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <ShieldAlert size={48} style={{ color: '#EF4444' }} />
                <h3 style={{ margin: '0', fontWeight: '800', color: 'var(--text-main)' }}>No Matches Found</h3>
                <p style={{ margin: '0', fontSize: '14px', maxWidth: '380px' }}>
                  No dishes match the active dietary tags, price range, or category filter constraints. Try clearing your filters.
                </p>
                <button onClick={clearFilters} className="btn btn-primary" style={{ marginTop: '8px' }}>
                  Reset Filters
                </button>
              </div>
            ) : (
              displayMenu.map((item) => {
                const qty = getCartQuantity(item.id);
                const foodImage = item.image ? (item.image.startsWith('http') ? item.image : `http://localhost:6789${item.image}`) : placeholderSvg;

                // Highlight Jain/Vegetarian/Vegan safe foods instantly with custom color card borders
                const isVegan = item.tags && item.tags.some(t => t.slug === 'vegan');
                const isVeg = item.tags && item.tags.some(t => t.slug === 'vegetarian');
                const isJain = item.tags && item.tags.some(t => t.slug === 'jain');
                const isPremiumSafe = isVegan || isVeg || isJain;

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      padding: '20px',
                      gap: '16px',
                      background: 'white',
                      opacity: item.isAvailable ? 1 : 0.6,
                      border: isPremiumSafe ? '2px solid #10B981' : '1.5px solid #E5E7EB',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Safe Badge Indicator overlay */}
                    {isPremiumSafe && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '0',
                          right: '0',
                          background: '#10B981',
                          color: '#FFFFFF',
                          padding: '3px 8px 3px 12px',
                          borderBottomLeftRadius: '12px',
                          fontSize: '9px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        <Leaf size={10} fill="#FFFFFF" stroke="none" />
                        <span>Green Safe</span>
                      </div>
                    )}

                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-main)' }}>{item.name}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {item.description || 'No description available'}
                        </p>
                      </div>

                      {/* Display dietary tags dynamically */}
                      {item.tags && item.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginBottom: '12px' }}>
                          {item.tags.map((tag) => (
                            <FoodTagBadge key={tag.id} tag={tag} />
                          ))}
                        </div>
                      )}

                      <div>
                        <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--secondary-color)' }}>
                          ₹{item.price}
                        </span>
                        {!item.isAvailable && (
                          <span style={{ marginLeft: '12px', color: 'var(--danger)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <img
                        src={foodImage}
                        alt={item.name}
                        style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '12px' }}
                        onError={(e) => { e.currentTarget.src = placeholderSvg; }}
                      />

                      {item.isAvailable && (
                        qty === 0 ? (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="btn-outline btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', justifyContent: 'center', padding: '6px 12px' }}
                          >
                            <Plus size={14} /> Add
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '8px' }}>
                            <button
                              onClick={() => updateQuantity(item.id, qty - 1)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{qty}</span>
                            <button
                              onClick={() => updateQuantity(item.id, qty + 1)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Floating Cart Button */}
      {cartItems.length > 0 && (
        <div
          onClick={() => navigate('/customer/cart')}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--primary-color)',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '30px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            zIndex: 1000,
            animation: 'pulse 2s infinite'
          }}
        >
          <ShoppingBag size={20} />
          <span style={{ fontWeight: 'bold' }}>
            {cartItems.reduce((sum, item) => sum + item.quantity, 0)} Items | View Cart
          </span>
        </div>
      )}
    </div>
  );
};

export default RestaurantView;
