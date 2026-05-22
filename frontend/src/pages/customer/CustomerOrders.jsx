import React, { useEffect, useState, useRef } from 'react';
import api from '../../api/axiosInstance';
import { useNotification } from '../../context/NotificationContext';
import { subscribeToEvent, unsubscribeFromEvent } from '../../sockets/socketService';
import { Clock, MapPin, Star, Bike, ShoppingBag, X, CheckCircle, Navigation } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Rating Modal state
  const [ratingOrder, setRatingOrder] = useState(null); // order object
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [restaurantComment, setRestaurantComment] = useState('');
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [deliveryComment, setDeliveryComment] = useState('');
  const [foodRatings, setFoodRatings] = useState({}); // { menuItemId: rating }

  // GPS Tracking Modal state
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [riderCoords, setRiderCoords] = useState({ lat: null, lng: null });

  const { showNotification } = useNotification();
  const socketRef = useRef(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/my-orders');
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Listen to real-time order status updates via WebSockets
    const handleOrderUpdate = (data) => {
      console.log('🔔 Order update in customer portal:', data);
      
      // Update local orders list state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === data.orderId ? { ...order, status: data.status } : order
        )
      );

      showNotification(data.message || `Order #${data.orderNumber} status updated to ${data.status}`, 'info');

      if (data.status === 'DELIVERED') {
        showNotification('Your order has been delivered! Please rate your experience.', 'success');
        fetchOrders(); // Refresh order ratings metadata
      }
    };

    const handleLocationUpdate = (data) => {
      // Listen to delivery partner GPS updates
      console.log('📍 GPS location ping in customer portal:', data);
      if (trackingOrder && trackingOrder.deliveryPartnerId === data.partnerId) {
        setRiderCoords({ lat: data.latitude, lng: data.longitude });
      }
    };

    subscribeToEvent('order_update', handleOrderUpdate);
    subscribeToEvent('location_update', handleLocationUpdate);

    return () => {
      unsubscribeFromEvent('order_update', handleOrderUpdate);
      unsubscribeFromEvent('location_update', handleLocationUpdate);
    };
  }, [trackingOrder, showNotification]);

  // Order status configuration helpers
  const getStatusText = (status) => {
    const textMap = {
      'PLACED': 'Placed',
      'ACCEPTED': 'Preparing',
      'READY_FOR_PICKUP': 'Ready for Pickup',
      'ASSIGNED': 'Rider Assigned',
      'AT_RESTAURANT': 'Rider at Restaurant',
      'PICKED_UP': 'On the Way',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled',
    };
    return textMap[status] || status;
  };

  const getStatusColor = (status) => {
    if (status === 'DELIVERED') return '#10b981';
    if (status === 'CANCELLED') return '#ef4444';
    return 'var(--primary-color)';
  };

  // Submit Multi-Target ratings
  const handleSubmitRatings = async () => {
    if (!ratingOrder) return;

    const payload = [];

    // Restaurant rating
    if (restaurantRating > 0) {
      payload.push({
        restaurantId: ratingOrder.restaurantId,
        orderId: ratingOrder.id,
        rating: restaurantRating,
        comment: restaurantComment,
        ratingType: 'restaurant'
      });
    }

    // Delivery rider rating
    if (ratingOrder.deliveryPartnerId && deliveryRating > 0) {
      payload.push({
        deliveryPartnerId: ratingOrder.deliveryPartnerId,
        orderId: ratingOrder.id,
        rating: deliveryRating,
        comment: deliveryComment,
        ratingType: 'delivery'
      });
    }

    // Food ratings
    Object.keys(foodRatings).forEach((itemId) => {
      if (foodRatings[itemId] > 0) {
        payload.push({
          menuItemId: parseInt(itemId),
          orderId: ratingOrder.id,
          rating: foodRatings[itemId],
          ratingType: 'food'
        });
      }
    });

    if (payload.length === 0) {
      showNotification('Please provide at least one rating', 'error');
      return;
    }

    try {
      for (const item of payload) {
        await api.post('/ratings', item);
      }
      showNotification('Thank you for rating!', 'success');
      setRatingOrder(null);
      // Reset ratings
      setRestaurantRating(0);
      setRestaurantComment('');
      setDeliveryRating(0);
      setDeliveryComment('');
      setFoodRatings({});
      fetchOrders();
    } catch (err) {
      console.error(err);
      showNotification('Failed to submit ratings', 'error');
    }
  };

  const handleOpenTracking = (order) => {
    setTrackingOrder(order);
    setRiderCoords({
      lat: order.deliveryPartner?.latitude || null,
      lng: order.deliveryPartner?.longitude || null,
    });
  };

  const activeOrders = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const pastOrders = orders.filter((o) => o.status === 'DELIVERED' || o.status === 'CANCELLED');

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '80vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px' }}>My Orders</h1>

      {loading ? (
        <div className="loading" style={{ height: '200px' }}>Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="card text-center" style={{ padding: '64px 24px', background: 'white' }}>
          <ShoppingBag size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3>No Orders Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Active Orders Section */}
          {activeOrders.length > 0 && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px', color: 'var(--primary-color)' }}>
                Active Deliveries
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {activeOrders.map((order) => (
                  <div key={order.id} className="card" style={{ padding: '24px', background: 'white', borderLeft: '4px solid var(--primary-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                          ORDER #{order.orderNumber}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: '4px' }}>
                          {order.restaurant.name}
                        </h3>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Placed on: {new Date(order.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          background: 'var(--bg-secondary)',
                          color: getStatusColor(order.status),
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          display: 'inline-block'
                        }}>
                          {getStatusText(order.status)}
                        </span>
                        <h4 style={{ fontSize: '18px', fontWeight: '800', marginTop: '8px' }}>₹{order.totalPrice}</h4>
                      </div>
                    </div>

                    <div style={{ fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                      <strong>Items: </strong>
                      {order.items.map((item) => `${item.menuItem.name} x${item.quantity}`).join(', ')}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Delivery Address: {order.address?.street || 'Not provided'}
                      </span>
                      {['ASSIGNED', 'AT_RESTAURANT', 'PICKED_UP'].includes(order.status) && (
                        <button
                          onClick={() => handleOpenTracking(order)}
                          className="btn btn-primary btn-sm btn-icon"
                        >
                          <Navigation size={14} />
                          Track Rider
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Orders Section */}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Past Orders</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pastOrders.map((order) => {
                const existingRatings = order.ratings || [];
                const rated = existingRatings.length > 0;

                return (
                  <div key={order.id} className="card" style={{ padding: '20px', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontWeight: '800', fontSize: '16px' }}>{order.restaurant.name}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            #{order.orderNumber}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {new Date(order.createdAt).toLocaleDateString()} | Total: ₹{order.totalPrice}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          color: order.status === 'DELIVERED' ? 'var(--success)' : 'var(--danger)',
                          fontWeight: 'bold',
                          fontSize: '13px'
                        }}>
                          {getStatusText(order.status)}
                        </span>
                        {order.status === 'DELIVERED' && (
                          rated ? (
                            <span style={{
                              fontSize: '12px',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-muted)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              Rated ⭐
                            </span>
                          ) : (
                            <button
                              onClick={() => setRatingOrder(order)}
                              className="btn-outline btn-sm btn-icon"
                              style={{ padding: '6px 12px' }}
                            >
                              <Star size={14} /> Rate
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GPS LIVE TRACKING MODAL */}
      {trackingOrder && (
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
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px', background: 'white', position: 'relative' }}>
            <button
              onClick={() => setTrackingOrder(null)}
              style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Live Order Tracking</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Order Number: #{trackingOrder.orderNumber}
            </p>

            {/* Simulated Live Location Map Panel */}
            <div style={{
              background: '#e3f2fd',
              height: '180px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '20px',
              border: '1px solid #bbdefb'
            }}>
              {/* Pulsing signal animation */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(33, 150, 243, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s infinite'
              }}>
                <Bike size={32} style={{ color: '#1e88e5' }} />
              </div>
              <p style={{ fontWeight: 'bold', color: '#1e88e5', marginTop: '12px', fontSize: '14px' }}>
                Simulating GPS Updates
              </p>
              {riderCoords.lat && riderCoords.lng ? (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                  Coordinates: {riderCoords.lat.toFixed(6)}, {riderCoords.lng.toFixed(6)}
                </span>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Waiting for Rider to send GPS ping...
                </span>
              )}
            </div>

            {/* Rider details */}
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <h4 style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>Your Delivery Partner</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 'bold', display: 'block' }}>{trackingOrder.deliveryPartner?.name || 'Assigned Agent'}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Phone: {trackingOrder.deliveryPartner?.phone || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                  <Star fill="var(--primary-color)" stroke="none" size={14} />
                  <span>{trackingOrder.deliveryPartner?.rating ? trackingOrder.deliveryPartner.rating.toFixed(1) : '4.8'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setTrackingOrder(null)}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* RATING SUBMISSION MODAL */}
      {ratingOrder && (
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
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: 'white', position: 'relative' }}>
            <button
              onClick={() => setRatingOrder(null)}
              style={{ position: 'absolute', right: '16px', top: '16px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Rate Your Order Experience</h3>

            {/* Restaurant rating */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <h4 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>Rate Restaurant: {ratingOrder.restaurant.name}</h4>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRestaurantRating(star)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px' }}
                  >
                    <Star
                      fill={star <= restaurantRating ? 'var(--primary-color)' : 'none'}
                      stroke={star <= restaurantRating ? 'var(--primary-color)' : '#ccc'}
                    />
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Write a comment for the restaurant..."
                value={restaurantComment}
                onChange={(e) => setRestaurantComment(e.target.value)}
                rows={2}
                style={{ width: '100%' }}
              />
            </div>

            {/* Rider rating */}
            {ratingOrder.deliveryPartnerId && (
              <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <h4 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '8px' }}>Rate Delivery Partner</h4>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setDeliveryRating(star)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px' }}
                    >
                      <Star
                        fill={star <= deliveryRating ? 'var(--primary-color)' : 'none'}
                        stroke={star <= deliveryRating ? 'var(--primary-color)' : '#ccc'}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Write a comment for the delivery partner..."
                  value={deliveryComment}
                  onChange={(e) => setDeliveryComment(e.target.value)}
                  rows={2}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {/* Food item ratings */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>Rate Food Items</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ratingOrder.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.menuItem?.name || 'Item'}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setFoodRatings((prev) => ({ ...prev, [item.menuItemId]: star }))}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '2px' }}
                        >
                          <Star
                            size={18}
                            fill={star <= (foodRatings[item.menuItemId] || 0) ? 'var(--primary-color)' : 'none'}
                            stroke={star <= (foodRatings[item.menuItemId] || 0) ? 'var(--primary-color)' : '#ccc'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmitRatings}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Submit Ratings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrders;
