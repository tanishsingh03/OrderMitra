import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useNotification } from '../../context/NotificationContext';
import { Shield, Users, Utensils, Bike, ShoppingBag, DollarSign, Check, X, UserCheck, AlertCircle } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const AdminDashboard = () => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('overview'); // overview, restaurants, partners, orders, users

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Entities lists
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);

  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(true);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Manual assignment modal state
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadRestaurants = async () => {
    try {
      const res = await api.get('/admin/restaurants');
      if (res.data.success) {
        setRestaurants(res.data.restaurants);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRestaurantsLoading(false);
    }
  };

  const loadPartners = async () => {
    try {
      const res = await api.get('/admin/delivery-partners');
      if (res.data.success) {
        setPartners(res.data.partners);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPartnersLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.get('/admin/orders');
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadRestaurants();
    loadPartners();
    loadOrders();
    loadUsers();
  }, []);

  // Verify / Approve Restaurant
  const handleVerifyRestaurant = async (id, isVerified) => {
    try {
      const res = await api.put(`/admin/restaurants/${id}/verify`, { isVerified });
      if (res.data.success) {
        showNotification(
          isVerified ? 'Restaurant approved successfully!' : 'Approval revoked',
          'success'
        );
        loadRestaurants();
        loadStats();
      } else {
        showNotification(res.data.message || 'Verification update failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error updating restaurant verification', 'error');
    }
  };

  // Assign Order to Delivery Partner
  const handleAssignOrderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPartnerId) {
      showNotification('Please select a delivery partner', 'error');
      return;
    }

    try {
      const res = await api.post('/admin/orders/assign', {
        orderId: assignModalOrder.id,
        deliveryPartnerId: parseInt(selectedPartnerId)
      });

      if (res.data.success) {
        showNotification('Order assigned successfully!', 'success');
        setAssignModalOrder(null);
        setSelectedPartnerId('');
        loadOrders();
      } else {
        showNotification(res.data.message || 'Failed to assign order', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error assigning order to delivery partner', 'error');
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '85vh' }}>
      <div style={{ marginBottom: '32px' }}>
        <span style={{ color: 'var(--primary-color)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '11px' }}>
          System Administration
        </span>
        <h1 style={{ fontSize: '32px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={28} style={{ color: 'var(--primary-color)' }} /> Admin Control Panel
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Review metrics, approve merchant partners, manage active order logistics, and audit directories.</p>
      </div>

      {/* Tabs list */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {['overview', 'restaurants', 'partners', 'orders', 'users'].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`btn-outline ${activeTab === t ? 'btn-primary' : ''}`}
            style={{
              padding: '8px 16px',
              border: activeTab === t ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
              textTransform: 'capitalize'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {statsLoading ? (
            <p>Loading stats...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <Users size={24} style={{ color: 'var(--primary-color)', marginBottom: '12px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Users</span>
                <h2 style={{ fontSize: '32px', fontWeight: '900', marginTop: '6px' }}>{stats?.totalUsers}</h2>
              </div>
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <Utensils size={24} style={{ color: 'var(--primary-color)', marginBottom: '12px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Restaurants</span>
                <h2 style={{ fontSize: '32px', fontWeight: '900', marginTop: '6px' }}>{stats?.totalRestaurants}</h2>
              </div>
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <Bike size={24} style={{ color: 'var(--primary-color)', marginBottom: '12px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Riders</span>
                <h2 style={{ fontSize: '32px', fontWeight: '900', marginTop: '6px' }}>{stats?.totalDeliveryPartners}</h2>
              </div>
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <ShoppingBag size={24} style={{ color: 'var(--primary-color)', marginBottom: '12px' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orders Placed</span>
                <h2 style={{ fontSize: '32px', fontWeight: '900', marginTop: '6px' }}>{stats?.totalOrders}</h2>
              </div>
              <div className="card" style={{ padding: '24px', background: 'var(--primary-color)', color: 'white' }}>
                <DollarSign size={24} style={{ opacity: 0.9, marginBottom: '12px' }} />
                <span style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase' }}>Total Revenue</span>
                <h2 style={{ fontSize: '32px', fontWeight: '950', marginTop: '6px' }}>₹{stats?.totalRevenue.toFixed(2)}</h2>
              </div>
            </div>
          )}

          {/* Quick Logs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div className="card" style={{ padding: '24px', background: 'white' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Recent Order Submissions</h3>
              {ordersLoading ? (
                <p>Loading...</p>
              ) : orders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No orders placed.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: '8px' }}>
                      <span>#{o.orderNumber} - {o.restaurant?.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: '24px', background: 'white' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Recent Registrations</h3>
              {restaurantsLoading ? (
                <p>Loading...</p>
              ) : restaurants.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No registrations.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {restaurants.slice(0, 5).map((r) => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: '8px' }}>
                      <span>{r.name}</span>
                      <span style={{ color: r.isVerified ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                        {r.isVerified ? 'Verified' : 'Pending Approval'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESTAURANTS TAB */}
      {activeTab === 'restaurants' && (
        <div className="card" style={{ padding: '24px', background: 'white' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>All Registered Restaurants</h3>
          {restaurantsLoading ? (
            <p>Loading restaurants list...</p>
          ) : restaurants.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No restaurants found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {restaurants.map((r) => (
                <div key={r.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                  <div>
                    <h4 style={{ fontWeight: '800', fontSize: '16px' }}>{r.name}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {r.address} | Phone: {r.phone || 'N/A'}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Total orders: {r._count?.orders} | Menu count: {r._count?.menu}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    {r.isVerified ? (
                      <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontWeight: 'bold', fontSize: '13px' }}>
                          <UserCheck size={16} /> Approved
                        </span>
                        <button
                          onClick={() => handleVerifyRestaurant(r.id, false)}
                          className="btn btn-secondary btn-sm"
                        >
                          Revoke Approval
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleVerifyRestaurant(r.id, true)}
                        className="btn btn-primary btn-sm"
                      >
                        Approve Merchant
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DELIVERY PARTNERS TAB */}
      {activeTab === 'partners' && (
        <div className="card" style={{ padding: '24px', background: 'white' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Delivery Partner Directory</h3>
          {partnersLoading ? (
            <p>Loading riders...</p>
          ) : partners.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No delivery partners registered.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {partners.map((p) => (
                <div key={p.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                  <div>
                    <h4 style={{ fontWeight: '800', fontSize: '16px' }}>{p.name}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Email: {p.email} | Phone: {p.phone}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Vehicle: {p.vehicleType} ({p.vehicleNumber}) | License: {p.licenseNumber || 'None'}
                    </p>
                  </div>

                  <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', color: p.isOnline ? 'var(--success)' : 'var(--text-muted)' }}>
                    {p.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACTIVE ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="card" style={{ padding: '24px', background: 'white' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>System-Wide Orders Directory</h3>
          {ordersLoading ? (
            <p>Loading all orders...</p>
          ) : orders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No orders exist in the database.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map((o) => (
                <div key={o.id} className="card" style={{ padding: '16px', background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <strong>Order #{o.orderNumber}</strong>
                      <span style={{ marginLeft: '12px', fontSize: '12px', background: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {o.status}
                      </span>
                    </div>
                    <span style={{ fontWeight: 'bold' }}>Total: ₹{o.totalPrice}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div>
                      <strong>User:</strong> {o.user?.name} ({o.user?.phone || 'N/A'})<br />
                      <strong>Restaurant:</strong> {o.restaurant?.name}
                    </div>
                    <div>
                      <strong>Courier:</strong> {o.deliveryPartner?.name || 'Unassigned'}<br />
                      <strong>Delivery To:</strong> {o.address ? `${o.address.street}, ${o.address.city}` : 'N/A'}
                    </div>
                  </div>

                  {/* Assign courier actions */}
                  {o.status === 'READY_FOR_PICKUP' && !o.deliveryPartnerId && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setAssignModalOrder(o)}
                        className="btn btn-primary btn-sm"
                      >
                        Manually Assign Rider
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '24px', background: 'white' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Customer Directory</h3>
          {usersLoading ? (
            <p>Loading users list...</p>
          ) : usersList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No customers found in database.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {usersList.map((u) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: '10px' }}>
                  <div>
                    <strong>{u.name}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Email: {u.email} | Phone: {u.phone || 'N/A'}</p>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Joined: {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MANUAL RIDER ASSIGNMENT MODAL */}
      {assignModalOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '24px', background: 'white' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Assign Rider to Order #{assignModalOrder.orderNumber}</h3>
            
            <form onSubmit={handleAssignOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="riderSel">Select Online Delivery Partner</label>
                <select
                  id="riderSel"
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Rider --</option>
                  {partners
                    .filter((p) => p.isOnline)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.vehicleType || 'Bike'})
                      </option>
                    ))}
                </select>
                {partners.filter((p) => p.isOnline).length === 0 && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--danger)', marginTop: '6px' }}>
                    <AlertCircle size={14} /> No riders currently ONLINE.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={partners.filter((p) => p.isOnline).length === 0}>
                  Confirm Assignment
                </button>
                <button type="button" onClick={() => setAssignModalOrder(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
