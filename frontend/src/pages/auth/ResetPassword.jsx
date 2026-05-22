import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { useNotification } from '../../context/NotificationContext';
import { ChefHat, Lock, ArrowLeft } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { showNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      showNotification('Missing or invalid reset token. Please request a new link.', 'error');
    }
  }, [token, showNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      showNotification('Cannot submit without reset token', 'error');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/reset-password', { token, newPassword });
      if (response.data.success) {
        showNotification('Password reset successful! You can now login.', 'success');
        navigate('/login');
      } else {
        showNotification(response.data.message || 'Reset failed', 'error');
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
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Choose New Password</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Set a strong and secure password for your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="newPassword">New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="newPassword"
                type="password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                disabled={!token}
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
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                disabled={!token}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading || !token}>
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: 'var(--primary-color)', fontSize: '14px' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
