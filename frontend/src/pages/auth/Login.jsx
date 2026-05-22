import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ChefHat, Lock, Mail, Users } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer'); // customer, restaurant-owner, delivery-partner, admin
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    const result = await login(email, password, role);
    setLoading(false);

    if (result.success) {
      showNotification('Logged in successfully!', 'success');
      // Redirect based on user role
      const userRole = result.user.role;
      if (userRole === 'admin') navigate('/admin/dashboard');
      else if (userRole === 'delivery-partner') navigate('/delivery/dashboard');
      else if (userRole === 'restaurant-owner') navigate('/restaurant/dashboard');
      else navigate('/customer/dashboard');
    } else {
      showNotification(result.message || 'Invalid email or password', 'error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      background: 'var(--bg-secondary)',
      padding: '40px 16px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <ChefHat size={48} style={{ color: 'var(--primary-color)', marginBottom: '8px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Welcome back!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Sign in to continue to OrderMitra</p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-tertiary)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px'
        }}>
          {[
            { id: 'customer', label: 'User' },
            { id: 'restaurant-owner', label: 'Partner' },
            { id: 'delivery-partner', label: 'Rider' },
            { id: 'admin', label: 'Admin' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRole(tab.id)}
              style={{
                flex: '1',
                padding: '8px 4px',
                border: 'none',
                background: role === tab.id ? 'var(--primary-color)' : 'transparent',
                color: role === tab.id ? 'white' : 'var(--text-secondary)',
                fontWeight: '600',
                fontSize: '13px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary-color)' }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
