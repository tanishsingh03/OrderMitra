import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Bike, Mail, Lock, User, Phone, FileText } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const DeliverySignup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    licenseNumber: '',
  });
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword, phone, vehicleType, vehicleNumber, licenseNumber } = formData;

    if (!name || !email || !password || !phone || !vehicleNumber || !licenseNumber) {
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
    const result = await signup({
      name,
      email,
      password,
      phone,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      role: 'delivery-partner'
    });
    setLoading(false);

    if (result.success) {
      showNotification('Rider signup successful! Please login.', 'success');
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
      minHeight: '90vh',
      background: 'var(--bg-secondary)',
      padding: '40px 16px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '550px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Bike size={48} style={{ color: 'var(--primary-color)', marginBottom: '8px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Become a Delivery Partner</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Earn money delivering meals on your schedule</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="name">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="email"
                type="email"
                placeholder="rider@example.com"
                value={formData.email}
                onChange={handleChange}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="phone"
                type="text"
                placeholder="10-digit mobile"
                value={formData.phone}
                onChange={handleChange}
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
                placeholder="Minimum 6 chars"
                value={formData.password}
                onChange={handleChange}
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
                value={formData.confirmPassword}
                onChange={handleChange}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="vehicleType">Vehicle Type</label>
            <select id="vehicleType" value={formData.vehicleType} onChange={handleChange}>
              <option value="Bike">Motorcycle / Bike</option>
              <option value="Cycle">Bicycle</option>
              <option value="Car">Car</option>
            </select>
          </div>

          <div>
            <label htmlFor="vehicleNumber">Vehicle Number</label>
            <div style={{ position: 'relative' }}>
              <Bike style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="vehicleNumber"
                type="text"
                placeholder="e.g. DL-3C-AB-1234"
                value={formData.vehicleNumber}
                onChange={handleChange}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="licenseNumber">Driving License Number</label>
            <div style={{ position: 'relative' }}>
              <FileText style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
              <input
                id="licenseNumber"
                type="text"
                placeholder="e.g. DL1420110012345"
                value={formData.licenseNumber}
                onChange={handleChange}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2', marginTop: '16px' }} disabled={loading}>
            {loading ? 'Submitting Application...' : 'Apply as Partner'}
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

export default DeliverySignup;
