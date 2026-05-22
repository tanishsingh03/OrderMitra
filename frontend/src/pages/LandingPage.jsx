import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import { ShoppingCart, Star, Clock, MapPin, Award } from 'lucide-react';
import '../styles/design-system.css';
import '../styles/enhanced-styles.css';

const LandingPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await api.get('/restaurants');
        if (res.data.success) {
          setRestaurants(res.data.restaurants.slice(0, 4));
        }
      } catch (err) {
        console.error('Error fetching restaurants:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  const defaultRestaurants = [
    {
      id: 1,
      name: 'Urban Foodies',
      cuisine: 'Italian, Pizza, Pasta',
      address: 'Sector 62, Noida',
      rating: 4.6,
      image: 'https://uk.ooni.com/cdn/shop/articles/20220211142645-margherita-9920_e41233d5-dcec-461c-b07e-03245f031dfe.jpg?v=1737105431'
    },
    {
      id: 2,
      name: 'Hotel Raunak',
      cuisine: 'North Indian, Mughlai',
      address: 'Connaught Place, Delhi',
      rating: 4.7,
      image: 'https://lentillovingfamily.com/wp-content/uploads/2025/08/paneer-tikka-2.jpg'
    },
    {
      id: 3,
      name: 'Sindhi Sweets',
      cuisine: 'Sweets, Desserts, Chaat',
      address: 'Sector 17, Chandigarh',
      rating: 4.8,
      image: 'https://b.zmtcdn.com/data/dish_photos/1ac/1de6f639dd25cb6372a28a170fc261ac.jpg'
    },
    {
      id: 4,
      name: 'The Kiltan Cafe',
      cuisine: 'Beverages, Cafe, Fast Food',
      address: 'Kiltan Island, Lakshadweep',
      rating: 4.9,
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSE2jUVThrHjKgTyJWdg8vRP9fo65mNU-uZIg&s'
    }
  ];

  const listToRender = restaurants.length > 0 ? restaurants : defaultRestaurants;

  return (
    <main style={{ minHeight: 'calc(100vh - 150px)', background: 'var(--bg-secondary)' }}>
      {/* Hero Section */}
      <section className="container hero" role="main" aria-label="Delicious food delivered fast" style={{ display: 'flex', alignItems: 'center', padding: '64px 24px', gap: '32px' }}>
        <div className="hero-text" style={{ flex: '1' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--secondary-color)', lineHeight: '1.1' }}>
            Delicious Food<br />
            <span className="highlight" style={{ color: 'var(--primary-color)' }}>Delivered Fast</span>
          </h1>
          <p style={{ margin: '24px 0', fontSize: '18px', color: 'var(--text-secondary)' }}>
            Order from your favorite restaurants and get fresh, hot meals delivered right to your doorstep in minutes.
          </p>

          <div className="hero-buttons" style={{ display: 'flex', gap: '16px', marginBottom: '40px' }}>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-primary btn-icon"
              aria-label="Order now"
              style={{ padding: '16px 32px', fontSize: '16px' }}
            >
              <ShoppingCart size={20} />
              Order Now
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn btn-outline"
              aria-label="Browse menu"
              style={{ padding: '16px 32px', fontSize: '16px' }}
            >
              Browse Menu
            </button>
          </div>

          <div className="stats" aria-label="Statistics" style={{ display: 'flex', gap: '32px' }}>
            <div className="stat-item">
              <span className="stat-number" style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary-color)' }}>500+</span>
              <span className="stat-label" style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)' }}>Restaurants</span>
            </div>
            <div className="stat-item">
              <span className="stat-number" style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary-color)' }}>10k+</span>
              <span className="stat-label" style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)' }}>Happy Customers</span>
            </div>
            <div className="stat-item">
              <span className="stat-number" style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary-color)' }}>4.8</span>
              <span className="stat-label" style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)' }}>Average Rating</span>
            </div>
          </div>
        </div>

        <aside className="hero-image" aria-hidden="true" style={{ flex: '1', display: 'flex', justifyContent: 'center' }}>
          <img
            src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80"
            alt="Delicious food dishes"
            style={{ width: '100%', maxWidth: '500px', borderRadius: '24px', boxShadow: 'var(--shadow-md)' }}
          />
        </aside>
      </section>

      {/* Features Section */}
      <section id="features" className="container features" style={{ padding: '64px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800' }}>Why Choose Us?</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Experience the best food delivery service with amazing features designed for your convenience.</p>
        
        <div className="feature-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <article className="feature-card" style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div className="icon-wrapper" style={{ background: 'var(--primary-color)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Clock style={{ color: 'white' }} size={24} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Fast Delivery</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Get your favorite meals delivered in 30 minutes or less with our express delivery service.</p>
          </article>

          <article className="feature-card" style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div className="icon-wrapper" style={{ background: 'var(--primary-color)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Award style={{ color: 'white' }} size={24} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Wide Selection</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Choose from hundreds of restaurants offering cuisines from around the world.</p>
          </article>
          
          <article className="feature-card" style={{ background: 'white', padding: '32px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div className="icon-wrapper" style={{ background: 'var(--primary-color)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <MapPin style={{ color: 'white' }} size={24} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Live Tracking</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Track your order in real-time from the restaurant to your doorstep with our live tracking.</p>
          </article>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="container how-it-works" style={{ padding: '64px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800' }}>How It Works</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Ordering your favorite food is as easy as 1, 2, 3!</p>
        
        <div className="steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px' }}>
          <div className="step" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
            <div className="number" style={{ background: 'var(--primary-color)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 'bold' }}>1</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Choose Your Meal</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Browse through our wide selection of restaurants and dishes</p>
          </div>
          <div className="step" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
            <div className="number" style={{ background: 'var(--primary-color)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 'bold' }}>2</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Place Your Order</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Add items to cart and complete your order with secure checkout</p>
          </div>
          <div className="step" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
            <div className="number" style={{ background: 'var(--primary-color)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 'bold' }}>3</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Enjoy Your Food</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Sit back and relax while we deliver fresh food to your door</p>
          </div>
        </div>
      </section>

      {/* Popular Restaurants */}
      <section id="restaurants" className="container popular-restaurants" style={{ padding: '64px 24px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '800', textAlign: 'center' }}>Popular Restaurants</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '40px' }}>Order from the most loved restaurants in your area</p>
        
        <div className="restaurant-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          {listToRender.map((r) => {
            const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2YwZjJmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SZXN0YXVyYW50PC90ZXh0Pjwvc3ZnPg==';
            const imageUrl = r.image ? (r.image.startsWith('http') ? r.image : `http://localhost:6789${r.image}`) : placeholderSvg;

            return (
              <article key={r.id} className="restaurant-card" onClick={() => navigate('/login')}>
                <img src={imageUrl} alt={r.name} onError={(e) => { e.target.src = placeholderSvg; }} />
                <div className="rest-info">
                  <h3>{r.name}</h3>
                  <p className="cuisines">{r.cuisine || r.address || 'Special dishes'}</p>
                  <div className="details">
                    <span>20–30 min</span>
                    <span className="delivery">Free delivery</span>
                  </div>
                </div>
                <div className="rating">
                  <Star fill="var(--primary-color)" stroke="none" size={14} />
                  <span>{r.rating ? r.rating.toFixed(1) : '4.5'}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default LandingPage;
