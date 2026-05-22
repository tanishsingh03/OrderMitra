import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { User, Phone, MapPin, Trash2, Check, Star } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const CustomerProfile = () => {
  const { user, reloadUser } = useAuth();
  const { showNotification } = useNotification();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Address fields
  const [addresses, setAddresses] = useState([]);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [label, setLabel] = useState('Home'); // Home, Work, Other
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      if (res.data.success) {
        setAddresses(res.data.addresses);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showNotification('Name and Phone are required', 'error');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await api.put('/customer/update', { name, phone });
      if (res.data.success) {
        showNotification('Profile updated successfully!', 'success');
        reloadUser();
      } else {
        showNotification(res.data.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error updating profile information', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!street.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
      showNotification('Please fill in all address fields', 'error');
      return;
    }

    setAddressLoading(true);
    try {
      const res = await api.post('/addresses', {
        street,
        city,
        state,
        zipCode,
        label
      });

      if (res.data.success) {
        showNotification('Address added successfully!', 'success');
        setStreet('');
        setCity('');
        setState('');
        setZipCode('');
        setLabel('Home');
        loadAddresses();
      } else {
        showNotification(res.data.message || 'Failed to add address', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error adding address', 'error');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      const res = await api.delete(`/addresses/${id}`);
      if (res.data.success) {
        showNotification('Address deleted successfully', 'success');
        loadAddresses();
      } else {
        showNotification(res.data.message || 'Failed to delete address', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error deleting address', 'error');
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      const res = await api.post(`/addresses/${id}/default`);
      if (res.data.success) {
        showNotification('Default address set', 'success');
        loadAddresses();
      } else {
        showNotification(res.data.message || 'Failed to set default address', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error setting default address', 'error');
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '80vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px' }}>My Account</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'flex-start' }}>
        {/* Profile Settings Card */}
        <div className="card" style={{ padding: '24px', background: 'white' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Profile Settings
          </h3>
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="email">Email Address (Read-only)</label>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
              />
            </div>

            <div>
              <label htmlFor="name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '12px', top: '15px', color: 'var(--text-muted)' }} size={16} />
                <input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={profileLoading}>
              {profileLoading ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Addresses Management Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* List of existing Addresses */}
          <div className="card" style={{ padding: '24px', background: 'white' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              My Addresses
            </h3>
            {addresses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
                No addresses added yet. Add one below to enable checkout.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="card"
                    style={{
                      padding: '16px',
                      background: 'white',
                      border: addr.isDefault ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', color: 'var(--primary-color)' }}>
                          {addr.label}
                        </span>
                        {addr.isDefault && (
                          <span style={{ fontSize: '10px', background: '#e6fffa', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            Default
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {addr.street}, {addr.city}, {addr.state} - {addr.zipCode}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="btn-outline btn-sm"
                          style={{ padding: '6px' }}
                          title="Set Default"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="btn-outline btn-sm"
                        style={{ padding: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        title="Delete Address"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to add address */}
          <div className="card" style={{ padding: '24px', background: 'white' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Add New Address</h3>
            <form onSubmit={handleAddAddress} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label htmlFor="street">Street Address</label>
                <input
                  id="street"
                  type="text"
                  placeholder="Apartment, Lane, Street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  type="text"
                  placeholder="e.g. New Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  type="text"
                  placeholder="e.g. Delhi"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="zipCode">Zip/Postal Code</label>
                <input
                  id="zipCode"
                  type="text"
                  placeholder="110001"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="label">Address Label</label>
                <select id="label" value={label} onChange={(e) => setLabel(e.target.value)}>
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2', marginTop: '8px' }} disabled={addressLoading}>
                {addressLoading ? 'Adding...' : 'Add Address'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
