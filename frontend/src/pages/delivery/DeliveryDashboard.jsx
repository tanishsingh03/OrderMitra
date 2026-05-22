import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { connectSocket, subscribeToEvent, unsubscribeFromEvent, emitEvent } from '../../sockets/socketService';
import { Bike, Navigation, MapPin, DollarSign, List, Shield, ToggleLeft, ToggleRight, Radio, Award } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const toMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [isOnline, setIsOnline] = useState(false);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [earnings, setEarnings] = useState({ balance: 0, totalTrips: 0, transactions: [] });
  
  const [gps, setGps] = useState({ lat: 28.6139, lng: 77.2090 }); // Default New Delhi coords
  const [loading, setLoading] = useState(true);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const [activeTab, setActiveTab] = useState('console'); // console, history, earnings

  const loadData = async () => {
    try {
      // Get active & past jobs
      const myOrdersRes = await api.get('/delivery/orders/my');
      if (myOrdersRes.data.success) {
        const myOrders = myOrdersRes.data.orders || [];
        setActiveJobs(myOrders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'));
        setCompletedJobs(myOrders.filter((o) => o.status === 'DELIVERED' || o.status === 'CANCELLED'));
      }

      // Get available orders
      const availableRes = await api.get('/delivery/orders/available');
      if (availableRes.data.success) {
        setAvailableJobs(availableRes.data.orders || []);
      }

      // Get earnings & wallet details
      const earningsRes = await api.get('/delivery/earnings');
      if (earningsRes.data.success) {
        const earningsPayload = earningsRes.data.earnings || {};
        setEarnings({
          balance: toMoney(earningsPayload.walletBalance ?? earningsPayload.total),
          totalTrips: Number(earningsPayload.ordersCount ?? earningsPayload.breakdown?.lifetime?.orders ?? 0),
          transactions: earningsPayload.recentTransactions || earningsPayload.transactions || [],
          daily: toMoney(earningsPayload.breakdown?.daily?.earnings),
          weekly: toMoney(earningsPayload.breakdown?.weekly?.earnings),
          lifetime: toMoney(earningsPayload.breakdown?.lifetime?.earnings)
        });
      }
    } catch (err) {
      console.error('Error fetching delivery partner dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && user?.role) {
      connectSocket(user.id, user.role);
    }

    loadData();

    // Listen for WebSocket notifications about newly ready orders
    const handleOrderUpdate = (data) => {
      console.log('🚴 WebSocket Order Update in Delivery Dashboard:', data);
      if (data.orderId || data.type === 'NEW_ORDER_READY' || data.type === 'STATUS_UPDATED' || data.type === 'ORDER_CREATED') {
        loadData();
      }
    };

    subscribeToEvent('order_update', handleOrderUpdate);
    subscribeToEvent('new_order_available', handleOrderUpdate);
    subscribeToEvent('order_list_update', handleOrderUpdate);
    return () => {
      unsubscribeFromEvent('order_update', handleOrderUpdate);
      unsubscribeFromEvent('new_order_available', handleOrderUpdate);
      unsubscribeFromEvent('order_list_update', handleOrderUpdate);
    };
  }, []);

  // Online / Offline Status Toggle
  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    try {
      const res = await api.post('/delivery/status', {
        isOnline: nextStatus,
        latitude: gps.lat,
        longitude: gps.lng
      });

      if (res.data.success) {
        setIsOnline(nextStatus);
        showNotification(
          nextStatus ? 'You are now ONLINE and ready for orders' : 'You are now OFFLINE',
          nextStatus ? 'success' : 'info'
        );
        loadData();
      } else {
        showNotification(res.data.message || 'Failed to update online status', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error toggling online availability status', 'error');
    }
  };

  // Simulating GPS Ping movement
  const handleSimulateGPSMove = async () => {
    setUpdatingLocation(true);
    // Random jitter in coordinate values to simulate motion
    const newLat = gps.lat + (Math.random() - 0.5) * 0.005;
    const newLng = gps.lng + (Math.random() - 0.5) * 0.005;
    const nextGps = { lat: parseFloat(newLat.toFixed(6)), lng: parseFloat(newLng.toFixed(6)) };

    try {
      // 1. Save locally
      setGps(nextGps);

      // 2. Call backend location ping API
      await api.post('/delivery/location', {
        latitude: nextGps.lat,
        longitude: nextGps.lng
      });

      // 3. Push to WebSocket stream
      emitEvent('location_update', {
        partnerId: user?.id,
        latitude: nextGps.lat,
        longitude: nextGps.lng
      });

      showNotification(`GPS Simulated Ping: Lat ${nextGps.lat}, Lng ${nextGps.lng}`, 'success');
    } catch (err) {
      console.error('Error updating live gps details:', err);
      showNotification('Failed to broadcast GPS coordinates update', 'error');
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Accept a Delivery order job
  const handleAcceptJob = async (orderId) => {
    try {
      const res = await api.post('/delivery/orders/accept', { orderId });
      if (res.data.success) {
        showNotification('Delivery order claimed successfully! Navigate to restaurant.', 'success');
        loadData();
      } else {
        showNotification(res.data.message || 'Failed to claim delivery job', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error claiming job', 'error');
    }
  };

  // Transition Job state: AT_RESTAURANT ➔ PICKED_UP ➔ DELIVERED
  const handleTransitionStatus = async (orderId, nextStatus) => {
    if (!window.confirm(`Are you sure you want to mark this order status as ${nextStatus}?`)) return;

    try {
      const res = await api.post('/delivery/orders/update-status', {
        orderId,
        status: nextStatus
      });

      if (res.data.success) {
        showNotification(`Order status updated to ${nextStatus}`, 'success');
        loadData();
      } else {
        showNotification(res.data.message || 'Failed to transition order status', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error transitioning delivery status', 'error');
    }
  };

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '85vh' }}>
      
      {/* Title Header with Availability and Coordinates summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ color: 'var(--primary-color)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>
            Rider Console
          </span>
          <h1 style={{ fontSize: '32px', fontWeight: '800' }}>Welcome, {user?.name || 'Partner'}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track your active deliveries, claim new orders, and monitor your earnings ledger.</p>
        </div>

        {/* Online Registration toggle and simulator info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handleToggleOnline}
            className="btn"
            style={{
              background: isOnline ? 'var(--success)' : 'var(--danger)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isOnline ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {isOnline ? 'Registering: ONLINE' : 'Registering: OFFLINE'}
          </button>
        </div>
      </div>

      {/* Tabs navigation list */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('console')}
          className={`btn-outline ${activeTab === 'console' ? 'btn-primary' : ''}`}
          style={{ padding: '8px 16px', border: activeTab === 'console' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }}
        >
          Active Jobs console
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`btn-outline ${activeTab === 'history' ? 'btn-primary' : ''}`}
          style={{ padding: '8px 16px', border: activeTab === 'history' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }}
        >
          Delivery History ({completedJobs.length})
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`btn-outline ${activeTab === 'earnings' ? 'btn-primary' : ''}`}
          style={{ padding: '8px 16px', border: activeTab === 'earnings' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }}
        >
          Earnings & Ledgers
        </button>
      </div>

      {/* Tab components display */}
      {loading ? (
        <div className="loading" style={{ height: '300px' }}>Loading Rider Console data...</div>
      ) : (
        <>
          {/* CONSOLE TAB (Live jobs queue and location simulator) */}
          {activeTab === 'console' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '32px', alignItems: 'flex-start' }}>
              
              {/* Left Column: GPS location tracking simulator panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="card" style={{ padding: '24px', background: 'white' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Navigation size={18} style={{ color: 'var(--primary-color)' }} /> GPS Simulation Ping
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Simulate real-time GPS telemetry broadcasts to let customers track your delivery progress live on the map.
                  </p>

                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div><strong>Latitude:</strong> {gps.lat}</div>
                    <div><strong>Longitude:</strong> {gps.lng}</div>
                  </div>

                  <button
                    onClick={handleSimulateGPSMove}
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    disabled={updatingLocation || !isOnline}
                  >
                    <Radio size={16} className={updatingLocation ? 'animate-pulse' : ''} />
                    {updatingLocation ? 'Transmitting Coords...' : 'Simulate GPS Coordinates Ping'}
                  </button>
                  {!isOnline && (
                    <p style={{ color: 'var(--danger)', fontSize: '11px', textAlign: 'center', marginTop: '8px', fontWeight: 'bold' }}>
                      * You must toggle Online to broadcast coordinates.
                    </p>
                  )}
                </div>

                {/* Earning Overview quick card */}
                <div
                  className="card"
                  style={{
                    padding: '22px',
                    background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
                    color: 'white',
                    minHeight: '0',
                    display: 'grid',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                    <div>
                      <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#cbd5e1', fontWeight: 800 }}>
                        Today's Earnings
                      </span>
                      <h2 style={{ fontSize: '34px', fontWeight: '950', margin: '6px 0 0', color: '#ffffff', lineHeight: 1 }}>
                        ₹{toMoney(earnings.daily || earnings.balance).toFixed(2)}
                      </h2>
                    </div>
                    <span style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                      <Award size={26} />
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Completed</span>
                      <strong style={{ display: 'block', marginTop: '4px', fontSize: '18px', color: '#ffffff' }}>{earnings.totalTrips}</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
                      <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Wallet</span>
                      <strong style={{ display: 'block', marginTop: '4px', fontSize: '18px', color: '#ffffff' }}>₹{toMoney(earnings.balance).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Active Jobs Queue and Available Jobs stream */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* Active Jobs Section */}
                <div className="card" style={{ padding: '24px', background: 'white' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    My Active Deliveries ({activeJobs.length})
                  </h3>

                  {activeJobs.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
                      No active delivery assignments. Accept a job from the stream below!
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeJobs.map((job) => (
                        <div key={job.id} className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--secondary-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div>
                              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>ORDER #{job.orderNumber}</span>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status: <strong>{job.status}</strong></p>
                            </div>
                            <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--primary-color)' }}>
                              Payout: ₹{job.deliveryFee}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '16px' }}>
                            <div>
                              <strong>Pickup Address:</strong> {job.restaurant?.name} - {job.restaurant?.address}
                            </div>
                            <div>
                              <strong>Delivery Address:</strong> {job.address ? `${job.address.street}, ${job.address.city}` : 'No Address provided'}
                            </div>
                            <div>
                              <strong>Customer Phone:</strong> {job.user?.phone || 'N/A'}
                            </div>
                          </div>

                          {/* Action Buttons based on states: ASSIGNED ➔ AT_RESTAURANT ➔ PICKED_UP ➔ DELIVERED */}
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            {job.status === 'ASSIGNED' && (
                              <button
                                onClick={() => handleTransitionStatus(job.id, 'AT_RESTAURANT')}
                                className="btn btn-primary btn-sm"
                              >
                                Arrived at Restaurant
                              </button>
                            )}
                            {job.status === 'AT_RESTAURANT' && (
                              <button
                                onClick={() => handleTransitionStatus(job.id, 'PICKED_UP')}
                                className="btn btn-primary btn-sm"
                              >
                                Food Picked Up
                              </button>
                            )}
                            {job.status === 'PICKED_UP' && (
                              <button
                                onClick={() => handleTransitionStatus(job.id, 'DELIVERED')}
                                className="btn btn-primary btn-sm"
                              >
                                Confirm Order Delivered
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Jobs Stream Section */}
                <div className="card" style={{ padding: '24px', background: 'white' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    Available Jobs Stream ({availableJobs.length})
                  </h3>

                  {!isOnline ? (
                    <div style={{ textAlign: 'center', padding: '24px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', color: '#e53e3e', fontSize: '13px' }}>
                      You must be <strong>ONLINE</strong> to view or accept delivery jobs.
                    </div>
                  ) : availableJobs.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
                      No available pickup requests right now. Updates will arrive automatically.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {availableJobs.map((job) => (
                        <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: '12px' }}>
                          <div>
                            <strong>Order #{job.orderNumber}</strong>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Pickup: {job.restaurant?.name}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              Fee: ₹{job.deliveryFee} | Est. Dist: Near Coords
                            </p>
                          </div>
                          <button
                            onClick={() => handleAcceptJob(job.id)}
                            className="btn btn-primary btn-sm"
                          >
                            Claim Job
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="card" style={{ padding: '24px', background: 'white' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Delivery Ride Logs</h3>
              {completedJobs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No completed delivery logs found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {completedJobs.map((job) => (
                    <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: '10px' }}>
                      <div>
                        <strong>Order #{job.orderNumber}</strong>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Completed on: {new Date(job.deliveredAt || job.updatedAt).toLocaleString()}
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Restaurant: {job.restaurant?.name}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '800', color: 'var(--success)' }}>+₹{job.deliveryFee}</span>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Status: {job.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EARNINGS TAB */}
          {activeTab === 'earnings' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px' }}>Rider Wallet Balance</h3>
                <h2 style={{ fontSize: '32px', fontWeight: '950', color: 'var(--success)' }}>
                  ₹{toMoney(earnings.balance).toFixed(2)}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Earnings are credited automatically to your wallet upon successful delivery verification.
                </p>
              </div>

              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Trip Ledger Logs</h3>
                {earnings.transactions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No settlement logs recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {earnings.transactions.map((tx) => (
                      <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: '8px' }}>
                        <div>
                          <strong>{tx.description}</strong>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                        <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>+₹{toMoney(tx.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeliveryDashboard;
