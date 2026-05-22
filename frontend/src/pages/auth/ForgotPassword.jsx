import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { useNotification } from '../../context/NotificationContext';
import { ChefHat, Mail, ArrowLeft } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { showNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showNotification('Email is required', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/forgot-password', { email });
      if (response.data.success) {
        showNotification(response.data.message || 'Password reset link sent!', 'success');
        setSubmitted(true);
      } else {
        showNotification(response.data.message || 'Request failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
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
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Reset Password</h2>
          <p style={{ color: 'var(--text-secondary)' }}>We'll send you an email with reset instructions</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
                <input
                  id="email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Sending Request...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontWeight: '600', color: 'var(--success)', marginBottom: '8px' }}>Request Submitted!</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              If an account with <strong>{email}</strong> exists, a password reset URL has been sent. Please check your inbox.
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: 'var(--primary-color)', fontSize: '14px' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
