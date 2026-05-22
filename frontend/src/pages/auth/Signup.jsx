import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ChefHat, Mail, Lock, User } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer'); // customer, restaurant-owner
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    const result = await signup({ email, password, role });
    setLoading(false);

    if (result.success) {
      showNotification('Signup successful! Please login.', 'success');
      navigate('/login');
    } else {
      showNotification(result.message || 'Registration failed', 'error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '85vh',
      background: 'var(--bg-secondary)',
      padding: '40px 16px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <ChefHat size={48} style={{ color: 'var(--primary-color)', marginBottom: '8px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Create an Account</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Get started with OrderMitra</p>
        </div>

        {/* Role Selector */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-tertiary)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => setRole('customer')}
            style={{
              flex: '1',
              padding: '10px 4px',
              border: 'none',
              background: role === 'customer' ? 'var(--primary-color)' : 'transparent',
              color: role === 'customer' ? 'white' : 'var(--text-secondary)',
              fontWeight: '600',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setRole('restaurant-owner')}
            style={{
              flex: '1',
              padding: '10px 4px',
              border: 'none',
              background: role === 'restaurant-owner' ? 'var(--primary-color)' : 'transparent',
              color: role === 'restaurant-owner' ? 'white' : 'var(--text-secondary)',
              fontWeight: '600',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
          >
            Restaurant Owner
          </button>
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
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
