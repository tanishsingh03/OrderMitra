import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../api/axiosInstance';
import { ShoppingBag, Trash2, MapPin, Wallet, Tag, ArrowRight, Notebook } from 'lucide-react';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const CartPage = () => {
  const { cartItems, restaurant, totals, updateQuantity, updateNotes, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Address and Wallet data loading
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const addressRes = await api.get('/addresses');
        if (addressRes.data.success) {
          setAddresses(addressRes.data.addresses);
          const def = addressRes.data.addresses.find((a) => a.isDefault) || addressRes.data.addresses[0];
          if (def) setSelectedAddressId(def.id);
        }

        // Load Wallet
        const walletRes = await api.get('/wallet');
        if (walletRes.data.success) {
          setWalletBalance(walletRes.data.wallet?.balance || walletRes.data.balance || 0);
        }
      } catch (err) {
        console.error('Error loading cart dependencies:', err);
      }
    };
    loadData();
  }, [user]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      showNotification('Please enter a coupon code', 'error');
      return;
    }

    try {
      // Fetch restaurant coupons
      const res = await api.get(`/coupons/valid?restaurantId=${restaurant.id}`);
      if (res.data.success) {
        const found = res.data.coupons.find((c) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
        if (found) {
          if (!found.isActive) {
            showNotification('This coupon is no longer active', 'error');
            return;
          }
          if (totals.subtotal < found.minOrder) {
            showNotification(`Minimum order value to apply this coupon is ₹${found.minOrder}`, 'error');
            return;
          }
          setActiveCoupon(found);
          showNotification('Coupon applied successfully!', 'success');
        } else {
          showNotification('Invalid coupon code', 'error');
        }
      } else {
        showNotification('Failed to fetch coupons', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error validating coupon', 'error');
    }
  };

  // Place Order Checkout trigger
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showNotification('Your cart is empty', 'error');
      return;
    }

    if (!selectedAddressId) {
      showNotification('Please add and select a delivery address in your profile first', 'error');
      navigate('/customer/profile');
      return;
    }

    // Dynamic Wallet Balance Verification
    const orderTotal = totals.total - (activeCoupon ? (activeCoupon.discountType === 'percentage' ? Math.min((totals.subtotal * activeCoupon.discountValue) / 100, activeCoupon.maxDiscount || Infinity) : activeCoupon.discountValue) : 0);
    if (walletBalance < orderTotal) {
      showNotification(`Insufficient wallet balance. Please add at least ₹${Math.ceil(orderTotal - walletBalance)} to your wallet.`, 'error');
      navigate('/customer/wallet');
      return;
    }

    setPlacingOrder(true);
    try {
      const itemsPayload = cartItems.map((item) => ({
        id: item.id,
        qty: item.quantity,
      }));

      // Set default address on backend (to bypass verification check)
      await api.post(`/addresses/${selectedAddressId}/default`);

      const res = await api.post('/orders/place', {
        restaurantId: restaurant.id,
        items: itemsPayload,
      });

      if (res.data.success) {
        showNotification('Order placed and paid successfully!', 'success');
        clearCart();
        navigate('/customer/orders');
      } else {
        // Handle incomplete profile error codes
        if (res.data.code === 'INCOMPLETE_PROFILE') {
          showNotification(res.data.message, 'error');
          navigate('/customer/profile');
        } else {
          showNotification(res.data.message || 'Failed to place order', 'error');
        }
      }
    } catch (err) {
      console.error('Checkout error:', err);
      showNotification('An error occurred during checkout', 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const finalDiscount = activeCoupon
    ? activeCoupon.discountType === 'percentage'
      ? Math.min((totals.subtotal * activeCoupon.discountValue) / 100, activeCoupon.maxDiscount || Infinity)
      : activeCoupon.discountValue
    : 0;

  const finalTotal = Math.max(0, totals.subtotal + totals.deliveryFee + totals.tax - finalDiscount);

  if (cartItems.length === 0) {
    return (
      <div className="container text-center" style={{ padding: '64px 24px', minHeight: '80vh' }}>
        <ShoppingBag size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 24px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Your Cart is Empty</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Add delicious items from a restaurant to place an order.</p>
        <button onClick={() => navigate('/customer/dashboard')} className="btn btn-primary">
          Browse Restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '80vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px' }}>Review Your Order</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Cart items list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px', background: 'white' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Items from {restaurant?.name}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cartItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: '700', fontSize: '16px' }}>{item.name}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0' }}>₹{item.price} each</p>
                    
                    {/* Notes item editor */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <Notebook size={14} style={{ color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Add cooking notes (optional)..."
                        value={item.notes || ''}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '12px', border: '1px dashed var(--border-color)', borderRadius: '4px', width: '200px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '8px' }}>
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                      <span style={{ fontWeight: 'bold' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                    </div>
                    <span style={{ fontWeight: '800', minWidth: '60px', textAlign: 'right' }}>₹{item.price * item.quantity}</span>
                    <button onClick={() => removeFromCart(item.id)} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address Selector */}
          <div className="card" style={{ padding: '24px', background: 'white' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Delivery Address
            </h3>
            {addresses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>No address found. Please setup an address first.</p>
                <button onClick={() => navigate('/customer/profile')} className="btn btn-secondary btn-sm">
                  Add Address
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      border: selectedAddressId === addr.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: 'white'
                    }}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                    />
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'capitalize', color: 'var(--primary-color)' }}>
                        {addr.label}
                      </span>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {addr.street}, {addr.city}, {addr.state} - {addr.zipCode}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Totals Summary Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Coupon applying card */}
          <div className="card" style={{ padding: '20px', background: 'white' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={16} /> Apply Coupon
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="PROMOCODE"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                style={{ textTransform: 'uppercase' }}
              />
              <button onClick={handleApplyCoupon} className="btn-outline btn-sm">Apply</button>
            </div>
            {activeCoupon && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', marginTop: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--success)' }}>
                  {activeCoupon.code} Applied (₹{finalDiscount} off)
                </span>
                <button onClick={() => setActiveCoupon(null)} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
              </div>
            )}
          </div>

          {/* Wallet check card */}
          <div className="card" style={{ padding: '20px', background: 'white' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wallet size={16} /> Wallet Settlement
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px' }}>
              <span>Available Balance:</span>
              <span style={{ fontWeight: 'bold' }}>₹{walletBalance}</span>
            </div>
            {walletBalance < finalTotal && (
              <div style={{ background: '#fff5f5', color: '#e53e3e', padding: '12px', borderRadius: '8px', fontSize: '13px', border: '1px solid #fed7d7' }}>
                Low balance. Need ₹{Math.ceil(finalTotal - walletBalance)} more.
              </div>
            )}
          </div>

          {/* Checkout final total card */}
          <div className="card" style={{ padding: '24px', background: 'white' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Order Total</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>₹{totals.subtotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Delivery Fee:</span>
                <span>₹{totals.deliveryFee}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tax & Handling (5% GST):</span>
                <span>₹{totals.tax}</span>
              </div>
              {finalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Coupon Discount:</span>
                  <span>-₹{finalDiscount}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '900', color: 'var(--secondary-color)', marginBottom: '24px' }}>
              <span>Total Price:</span>
              <span>₹{finalTotal}</span>
            </div>

            <button
              onClick={handleCheckout}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={placingOrder}
            >
              {placingOrder ? 'Processing...' : 'Place & Pay Order'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
