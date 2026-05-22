import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { LogOut, ShoppingCart, Wallet, User as UserIcon, ChefHat, Bike, ShieldAlert } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const navigate = useNavigate();
  const role = user?.role || null;
  const dashboardRole = role ? role.replace('-owner', '') : null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="header" role="banner">
      <div className="header-container">
        <Link to={dashboardRole ? `/${dashboardRole}/dashboard` : '/'} className="logo" aria-label="OrderMitra homepage">
          <ChefHat style={{ color: 'var(--primary-color)' }} size={28} />
          <span>OrderMitra</span>
        </Link>

        <nav aria-label="Primary menu" className="navbar">
          {role ? (
            <ul>
              {role === 'customer' && (
                <>
                  <li><Link to="/customer/dashboard">Dashboard</Link></li>
                  <li><Link to="/customer/orders">My Orders</Link></li>
                  <li><Link to="/customer/wallet">Wallet</Link></li>
                </>
              )}
              {role === 'restaurant-owner' && (
                <>
                  <li><Link to="/restaurant/dashboard">Incoming Orders</Link></li>
                  <li><Link to="/restaurant/menu">Manage Menu</Link></li>
                  <li><Link to="/restaurant/coupons">Coupons</Link></li>
                </>
              )}
              {role === 'delivery-partner' && (
                <>
                  <li><Link to="/delivery/dashboard">Console</Link></li>
                  <li><Link to="/delivery/orders">Earnings & History</Link></li>
                </>
              )}
              {role === 'admin' && (
                <>
                  <li><Link to="/admin/dashboard">System Panel</Link></li>
                </>
              )}
            </ul>
          ) : (
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#restaurants">Popular Restaurants</a></li>
            </ul>
          )}
        </nav>

        <div className="header-actions">
          {role ? (
            <div style={{ display: 'flex', alignProperties: 'center', alignItems: 'center', gap: '16px' }}>
              {role === 'customer' && (
                <>
                  <Link to="/customer/cart" className="btn-icon" style={{ position: 'relative', color: 'var(--secondary-color)' }}>
                    <ShoppingCart size={22} />
                    {totalCartCount > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: 'var(--primary-color)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {totalCartCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/customer/wallet" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary-color)', fontWeight: '600' }}>
                    <Wallet size={18} />
                  </Link>
                </>
              )}

              {role === 'delivery-partner' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold', color: 'var(--success)' }}>
                  <Bike size={18} />
                  <span>online</span>
                </div>
              )}

              <Link to={`/${dashboardRole}/profile`} style={{ color: 'var(--secondary-color)', display: 'flex', alignItems: 'center' }} title="Profile Settings">
                <UserIcon size={20} />
              </Link>

              <button onClick={handleLogout} className="btn-secondary btn-icon btn-sm" style={{ padding: '8px 12px' }} title="Logout">
                <LogOut size={16} />
                <span className="navbar-text" style={{ marginLeft: '4px' }}>Logout</span>
              </button>
            </div>
          ) : (
            <>
              <Link to="/signup" className="btn-secondary btn-sm">Sign Up</Link>
              <Link to="/delivery-signup" className="btn-outline btn-sm">🚴 Deliver</Link>
              <Link to="/login" className="btn-primary btn-sm">Sign In</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
