import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { subscribeToEvent, unsubscribeFromEvent } from '../../sockets/socketService';
import { ShoppingBag, Utensils, Tag, User, Plus, Trash2, Edit2, Star, BarChart3, TrendingUp, Clock, RefreshCw, Bot, Sparkles, MessageSquare, Send, Download, AlertTriangle, X } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import '../../styles/design-system.css';
import '../../styles/enhanced-styles.css';

const chartColors = ['#ff6f1e', '#0f172a', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
const quickAIQuestions = [
  'Which dish is performing best this week?',
  'What should I promote tonight?',
  'What are my peak order hours?',
  'Suggest a combo offer.'
];

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const priorityStyles = {
  critical: { background: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  high: { background: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  medium: { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  low: { background: '#f0fdf4', color: '#15803d', border: '#bbf7d0' }
};

const AnalyticsCard = ({ title, value, helper, icon: Icon }) => (
  <div className="card" style={{ padding: '20px', background: 'white' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
      <div>
        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' }}>{title}</span>
        <strong style={{ display: 'block', fontSize: '26px', marginTop: '8px', color: 'var(--text-primary)' }}>{value}</strong>
        {helper && <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px' }}>{helper}</span>}
      </div>
      {Icon && (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '8px', background: '#fff7ed', color: 'var(--primary-color)' }}>
          <Icon size={20} />
        </span>
      )}
    </div>
  </div>
);

const RestaurantDashboard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [activeTab, setActiveTab] = useState('orders'); // orders, analytics, menu, coupons, profile

  // Restaurant details state
  const [restaurant, setRestaurant] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Menu state
  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [allTags, setAllTags] = useState([]);
  const [customTagName, setCustomTagName] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [addItemModal, setAddItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Main Course'
  });
  const [menuImage, setMenuImage] = useState(null);

  // Coupons state
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [addCouponModal, setAddCouponModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrder: '',
    maxDiscount: '',
    validUntil: '',
    usageLimit: ''
  });

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10)
    };
  });

  // AI growth assistant state
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiProvider, setAiProvider] = useState(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  // Profile forms
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  });
  const [profileImage, setProfileImage] = useState(null);

  // Loaders
  const loadProfile = async () => {
    try {
      const res = await api.get('/restaurant/me');
      if (res.data.success && res.data.restaurant) {
        setRestaurant(res.data.restaurant);
        setProfileForm({
          name: res.data.restaurant.name || '',
          email: res.data.restaurant.email || '',
          phone: res.data.restaurant.phone || '',
          address: res.data.restaurant.address || '',
          password: ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await api.get('/restaurant/orders');
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const res = await api.get('/food-tags');
      if (res.data.success) {
        setAllTags(res.data.tags);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMenu = async () => {
    try {
      const res = await api.get('/menu');
      if (res.data.success) {
        setMenu(res.data.menu);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleToggleTag = async (itemId, tagId, isAssigned) => {
    try {
      if (isAssigned) {
        const res = await api.delete(`/menu-items/${itemId}/tags/${tagId}`);
        if (res.data.success) {
          showNotification('Tag removed successfully', 'success');
          loadMenu();
        }
      } else {
        const res = await api.post(`/menu-items/${itemId}/tags`, { tagId });
        if (res.data.success) {
          showNotification('Tag assigned successfully', 'success');
          loadMenu();
        }
      }
    } catch (err) {
      console.error('Failed to toggle tag:', err);
      showNotification('Failed to toggle food tag', 'error');
    }
  };

  const handleCreateCustomTag = async (e) => {
    e.preventDefault();
    if (!customTagName.trim()) return;
    try {
      const res = await api.post('/food-tags', { name: customTagName });
      if (res.data.success) {
        showNotification(`Tag "${customTagName}" created successfully!`, 'success');
        setCustomTagName('');
        loadTags();
      }
    } catch (err) {
      console.error('Failed to create tag:', err);
      showNotification('Failed to create custom tag', 'error');
    }
  };

  const loadCoupons = async () => {
    try {
      const res = await api.get('/coupons/restaurant');
      if (res.data.success) {
        setCoupons(res.data.coupons);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCouponsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.from) params.append('from', dateRange.from);
      if (dateRange.to) params.append('to', dateRange.to);
      const res = await api.get(`/analytics/restaurant/me?${params.toString()}`);
      if (res.data.success) {
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      showNotification('Failed to load analytics dashboard', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadAIRecommendations = async () => {
    try {
      const res = await api.get('/ai/recommendations');
      if (res.data.success) {
        setAiRecommendations(res.data.recommendations || []);
        setAiSummary(res.data.summary || null);
        setAiProvider(res.data.provider || null);
        setAiConfigured(res.data.aiConfigured !== false);
      }
    } catch (err) {
      console.error('Error loading AI recommendations:', err);
      showNotification('Failed to load AI recommendations', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const refreshAIRecommendations = async () => {
    setAiRefreshing(true);
    try {
      const res = await api.post('/ai/recommendations/refresh');
      if (res.data.success) {
        setAiRecommendations(res.data.recommendations || []);
        setAiSummary(res.data.summary || null);
        setAiProvider(res.data.provider || null);
        setAiConfigured(res.data.aiConfigured !== false);
        showNotification(res.data.message || 'AI recommendations refreshed', res.data.aiConfigured === false ? 'info' : 'success');
      }
    } catch (err) {
      console.error('Error refreshing AI recommendations:', err);
      showNotification('Failed to refresh AI recommendations', 'error');
    } finally {
      setAiRefreshing(false);
      setAiLoading(false);
    }
  };

  const loadAIChatHistory = async () => {
    try {
      const res = await api.get('/ai/chat/history');
      if (res.data.success && res.data.history?.length) {
        const historyMessages = res.data.history.flatMap((entry) => [
          { role: 'user', content: entry.message, createdAt: entry.createdAt },
          { role: 'assistant', content: entry.response, createdAt: entry.createdAt }
        ]);
        setAiMessages(historyMessages);
      } else if (res.data.success) {
        setAiMessages([]);
      }
    } catch (err) {
      console.error('Error loading AI chat history:', err);
    }
  };

  const sendAIMessage = async (messageOverride) => {
    const message = (messageOverride || aiInput).trim();
    if (!message || aiTyping) return;

    setAiChatOpen(true);
    setAiInput('');
    setAiMessages((prev) => [...prev, { role: 'user', content: message }]);
    setAiTyping(true);

    try {
      const res = await api.post('/ai/chat', { message });
      if (res.data.success) {
        setAiMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
        loadAIChatHistory();
      } else {
        throw new Error(res.data.message || 'AI chat failed');
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setAiMessages((prev) => [...prev, { role: 'assistant', content: 'I could not generate an AI response right now. Please try again in a moment.' }]);
    } finally {
      setAiTyping(false);
    }
  };

  const exportAIReport = () => {
    const lines = [
      `OrderMitra AI Growth Report - ${restaurant?.name || 'Restaurant'}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Revenue: ${formatCurrency(aiSummary?.counters?.revenue || 0)}`,
      `Orders: ${aiSummary?.counters?.orders || 0}`,
      `Retention: ${aiSummary?.counters?.customerRetention || 0}%`,
      `Delivery efficiency: ${aiSummary?.counters?.deliveryEfficiency || 0}%`,
      '',
      'Recommendations:',
      ...aiRecommendations.map((rec, index) => `${index + 1}. [${rec.priorityLevel}] ${rec.title} (${Math.round(rec.confidenceScore || 0)}% confidence)\n${rec.description}`)
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ordermitra-ai-growth-report.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadProfile();
    loadOrders();
    loadMenu();
    loadTags();
    loadCoupons();
    loadAnalytics();
    loadAIRecommendations();
    loadAIChatHistory();

    // Subscribe to websocket updates for real-time order alerts
    const handleOrderUpdate = (data) => {
      console.log('🔔 Order socket update in restaurant portal:', data);
      showNotification(data.message || 'Orders list updated', 'info');
      loadOrders();
      loadAnalytics();
      if (data?.type === 'AI_RECOMMENDATIONS_UPDATED') {
        loadAIRecommendations();
      }
    };

    subscribeToEvent('order_update', handleOrderUpdate);
    return () => {
      unsubscribeFromEvent('order_update', handleOrderUpdate);
    };
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (aiChatOpen) {
      loadAIChatHistory();
    }
  }, [aiChatOpen]);

  // Update order status: ACCEPTED, READY_FOR_PICKUP, CANCELLED
  const handleUpdateStatus = async (orderId, status) => {
    if (!window.confirm(`Are you sure you want to update order status to ${status}?`)) return;

    try {
      const res = await api.put(`/restaurant/orders/${orderId}/status`, { status });
      if (res.data.success) {
        showNotification(`Order status updated to ${status}`, 'success');
        loadOrders();
      } else {
        showNotification(res.data.message || 'Failed to update order', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error changing order status', 'error');
    }
  };

  // Add menu item
  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    if (!newItemData.name || !newItemData.price) {
      showNotification('Name and Price are required', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newItemData.name);
      formData.append('price', newItemData.price);
      formData.append('description', newItemData.description);
      formData.append('category', newItemData.category);
      if (menuImage) {
        formData.append('image', menuImage);
      }

      const res = await api.post('/restaurant/menu/add', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showNotification('Menu item added successfully!', 'success');
        setAddItemModal(false);
        setNewItemData({ name: '', price: '', description: '', category: 'Main Course' });
        setMenuImage(null);
        loadMenu();
      } else {
        showNotification(res.data.message || 'Failed to add menu item', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error adding menu item', 'error');
    }
  };

  // Edit / Update menu item details
  const handleUpdateMenuItem = async (e) => {
    e.preventDefault();
    if (!editingItem.name || !editingItem.price) {
      showNotification('Name and price are required', 'error');
      return;
    }

    try {
      const res = await api.put(`/menu/update/${editingItem.id}`, {
        name: editingItem.name,
        price: editingItem.price,
        description: editingItem.description,
        category: editingItem.category,
        isAvailable: editingItem.isAvailable
      });

      if (res.data.success) {
        showNotification('Item updated successfully', 'success');
        setEditingItem(null);
        loadMenu();
      } else {
        showNotification(res.data.message || 'Failed to update item', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error updating menu item', 'error');
    }
  };

  // Delete menu item
  const handleDeleteMenuItem = async (id) => {
    if (!window.confirm('Delete this item from your menu?')) return;

    try {
      const res = await api.delete(`/menu/delete/${id}`);
      if (res.data.success) {
        showNotification('Item deleted', 'success');
        loadMenu();
      } else {
        showNotification(res.data.message || 'Failed to delete item', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error deleting item', 'error');
    }
  };

  // Availability switch toggle
  const handleToggleAvailability = async (item) => {
    try {
      const res = await api.put(`/menu/update/${item.id}`, {
        name: item.name,
        price: item.price,
        isAvailable: !item.isAvailable
      });
      if (res.data.success) {
        showNotification(`Availability updated to ${!item.isAvailable ? 'Available' : 'Unavailable'}`, 'success');
        loadMenu();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Coupon code
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    const { code, discountType, discountValue, minOrder, maxDiscount, validUntil, usageLimit } = newCoupon;

    if (!code || !discountValue) {
      showNotification('Code and discount value are required', 'error');
      return;
    }

    try {
      const res = await api.post('/coupons', {
        code: code.toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        minOrder: minOrder ? parseFloat(minOrder) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null
      });

      if (res.data.success) {
        showNotification('Coupon created successfully!', 'success');
        setAddCouponModal(false);
        setNewCoupon({
          code: '',
          discountType: 'percentage',
          discountValue: '',
          minOrder: '',
          maxDiscount: '',
          validUntil: '',
          usageLimit: ''
        });
        loadCoupons();
      } else {
        showNotification(res.data.message || 'Failed to create coupon', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error creating coupon', 'error');
    }
  };

  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', profileForm.name);
      formData.append('email', profileForm.email);
      formData.append('phone', profileForm.phone);
      formData.append('address', profileForm.address);
      if (profileForm.password) {
        formData.append('password', profileForm.password);
      }
      if (profileImage) {
        formData.append('image', profileImage);
      }

      const res = await api.put('/restaurant/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showNotification('Profile updated successfully!', 'success');
        setProfileImage(null);
        loadProfile();
      } else {
        showNotification(res.data.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error saving profile changes', 'error');
    }
  };

  const activeOrders = orders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const pastOrders = orders.filter((o) => o.status === 'DELIVERED' || o.status === 'CANCELLED');

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: '85vh' }}>
      {/* Header Info Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ color: 'var(--primary-color)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>
            Restaurant Console
          </span>
          <h1 style={{ fontSize: '32px', fontWeight: '800' }}>{restaurant?.name || 'Loading Business...'}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your active menu, receive live order notifications, and grow with AI insights.</p>
        </div>
        {restaurant?.rating !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '12px 20px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
            <Star fill="var(--primary-color)" stroke="none" size={20} />
            <div>
              <span style={{ fontWeight: '800', fontSize: '18px', display: 'block' }}>{restaurant.rating.toFixed(1)}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Rating</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs System layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '32px', alignItems: 'flex-start' }}>
        {/* Sidebar Nav */}
        <div className="card" style={{ padding: '12px', background: 'white', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => setActiveTab('orders')}
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', gap: '10px', fontSize: '14px', padding: '12px' }}
          >
            <ShoppingBag size={18} /> Orders
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', gap: '10px', fontSize: '14px', padding: '12px' }}
          >
            <BarChart3 size={18} /> Analytics
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`btn ${activeTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', gap: '10px', fontSize: '14px', padding: '12px' }}
          >
            <Sparkles size={18} /> AI Growth
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`btn ${activeTab === 'menu' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', gap: '10px', fontSize: '14px', padding: '12px' }}
          >
            <Utensils size={18} /> Menu Manager
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`btn ${activeTab === 'coupons' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', gap: '10px', fontSize: '14px', padding: '12px' }}
          >
            <Tag size={18} /> Coupons
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', gap: '10px', fontSize: '14px', padding: '12px' }}
          >
            <User size={18} /> Settings
          </button>
        </div>

        {/* Tab content area */}
        <div>
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  Active Orders Stream
                </h3>

                {ordersLoading ? (
                  <p>Loading active orders stream...</p>
                ) : activeOrders.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No active orders at the moment.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeOrders.map((order) => (
                      <div key={order.id} className="card" style={{ padding: '20px', background: 'var(--bg-secondary)', borderLeft: '4px solid var(--primary-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>ORDER #{order.orderNumber}</span>
                            <h4 style={{ fontWeight: '800', fontSize: '16px', marginTop: '4px' }}>Customer: {order.user.name}</h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Placed: {new Date(order.createdAt).toLocaleString()}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ background: 'white', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px' }}>
                              Status: {order.status}
                            </span>
                            <h4 style={{ fontSize: '18px', fontWeight: '800', marginTop: '8px', color: 'var(--secondary-color)' }}>₹{order.totalPrice}</h4>
                          </div>
                        </div>

                        <div style={{ fontSize: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px' }}>
                          <strong>Ordered Items:</strong> {order.items.map((i) => `${i.menuItem?.name} x${i.quantity}`).join(', ')}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {order.status === 'PLACED' && (
                            <>
                              <button onClick={() => handleUpdateStatus(order.id, 'ACCEPTED')} className="btn btn-primary btn-sm">
                                Accept Order
                              </button>
                              <button onClick={() => handleUpdateStatus(order.id, 'CANCELLED')} className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                Reject
                              </button>
                            </>
                          )}
                          {order.status === 'ACCEPTED' && (
                            <>
                              <button onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP')} className="btn btn-primary btn-sm">
                                Mark Ready
                              </button>
                              <button onClick={() => handleUpdateStatus(order.id, 'CANCELLED')} className="btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                Cancel
                              </button>
                            </>
                          )}
                          {order.status === 'READY_FOR_PICKUP' && (
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                              Waiting for courier pickup...
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past orders list */}
              <div className="card" style={{ padding: '24px', background: 'white' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Past Orders History</h3>
                {ordersLoading ? (
                  <p>Loading order history...</p>
                ) : pastOrders.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No historical orders found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pastOrders.map((order) => (
                      <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: '10px' }}>
                        <div>
                          <span style={{ fontWeight: 'bold' }}>#{order.orderNumber}</span>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(order.createdAt).toLocaleDateString()} | Total: ₹{order.totalPrice}
                          </p>
                        </div>
                        <span style={{ fontWeight: 'bold', color: order.status === 'DELIVERED' ? 'var(--success)' : 'var(--danger)' }}>
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div className="card" style={{ padding: '22px', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '4px' }}>Business Analytics</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Realtime revenue, orders, dishes, customer, and delivery intelligence.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                      style={{ width: '160px' }}
                    />
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                      style={{ width: '160px' }}
                    />
                    <button onClick={loadAnalytics} className="btn btn-secondary btn-sm">
                      <RefreshCw size={16} /> Refresh
                    </button>
                  </div>
                </div>
              </div>

              {analyticsLoading ? (
                <div className="loading">Loading analytics...</div>
              ) : !analytics ? (
                <div className="card text-center" style={{ padding: '48px', background: 'white' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No analytics data available yet.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                    <AnalyticsCard title="Total Revenue" value={formatCurrency(analytics.counters.totalRevenue)} helper="Delivered or paid orders" icon={TrendingUp} />
                    <AnalyticsCard title="Total Orders" value={analytics.counters.totalOrders} helper={`${analytics.counters.activeOrders} active right now`} icon={ShoppingBag} />
                    <AnalyticsCard title="Cancellation Rate" value={`${analytics.counters.cancellationRate}%`} helper={`${analytics.counters.cancelledOrders} cancelled orders`} icon={Clock} />
                    <AnalyticsCard title="Avg Delivery" value={`${analytics.counters.avgDeliveryTime} min`} helper={`${analytics.delivery.delayedOrders} delayed orders`} icon={BarChart3} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
                    <div className="card" style={{ padding: '22px', background: 'white', minHeight: '340px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 900 }}>Revenue Growth Trend</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={analytics.revenue.daily}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="#ff6f1e" strokeWidth={3} dot={false} name="Revenue" />
                          <Line type="monotone" dataKey="orders" stroke="#0f172a" strokeWidth={2} dot={false} name="Orders" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card" style={{ padding: '22px', background: 'white', minHeight: '340px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 900 }}>Order Status Mix</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Active', value: analytics.counters.activeOrders },
                              { name: 'Completed/Paid', value: Math.max(analytics.counters.totalOrders - analytics.counters.activeOrders - analytics.counters.cancelledOrders, 0) },
                              { name: 'Cancelled', value: analytics.counters.cancelledOrders }
                            ]}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={58}
                            outerRadius={92}
                            paddingAngle={4}
                          >
                            {chartColors.slice(0, 3).map((color) => <Cell key={color} fill={color} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                    <div className="card" style={{ padding: '22px', background: 'white', minHeight: '320px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 900 }}>Most Sold Dishes</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={analytics.dishes.topDishes}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="sold" fill="#ff6f1e" radius={[6, 6, 0, 0]} name="Sold" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card" style={{ padding: '22px', background: 'white', minHeight: '320px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 900 }}>Peak Order Timing</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={analytics.orders.hourly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="orders" fill="#0f172a" radius={[6, 6, 0, 0]} name="Orders" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px' }}>
                    <div className="card" style={{ padding: '22px', background: 'white' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 900 }}>Order Heatmap</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(24, minmax(18px, 1fr))', gap: '3px', alignItems: 'center', overflowX: 'auto' }}>
                        <span />
                        {Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center' }}>{hour}</span>)}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
                          <React.Fragment key={day}>
                            <strong style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{day}</strong>
                            {analytics.orders.heatmap.filter((cell) => cell.day === dayIndex).map((cell) => {
                              const intensity = Math.min(1, cell.orders / Math.max(...analytics.orders.heatmap.map((h) => h.orders), 1));
                              return (
                                <span
                                  key={`${day}-${cell.hour}`}
                                  title={`${day} ${cell.hour}:00 - ${cell.orders} orders`}
                                  style={{
                                    height: '18px',
                                    borderRadius: '4px',
                                    background: `rgba(255, 111, 30, ${0.08 + intensity * 0.85})`,
                                    border: '1px solid rgba(255,111,30,0.08)'
                                  }}
                                />
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="card" style={{ padding: '22px', background: 'white' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 900 }}>Customer Analytics</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <AnalyticsCard title="Repeat Customers" value={analytics.customers.repeatCustomers} helper={`${analytics.customers.retentionRate}% retention`} />
                        <AnalyticsCard title="Unique Customers" value={analytics.customers.uniqueCustomers} helper="In selected range" />
                      </div>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {analytics.customers.mostActiveCustomers.slice(0, 5).map((customer) => (
                          <div key={customer.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                            <span style={{ fontWeight: 700 }}>{customer.name}</span>
                            <span style={{ color: 'var(--primary-color)', fontWeight: 800 }}>{customer.orders} orders</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ padding: '22px', background: 'white' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 900 }}>Smart Insights</h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {(analytics.insights || []).map((insight) => (
                        <div key={insight} style={{ padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', fontWeight: 700, color: '#9a3412' }}>
                          {insight}
                        </div>
                      ))}
                      {(!analytics.insights || analytics.insights.length === 0) && (
                        <p style={{ color: 'var(--text-muted)' }}>More insights will appear after your restaurant receives orders.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI GROWTH TAB */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div className="card" style={{ padding: '22px', background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #eff6ff 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--primary-color)', fontWeight: 900, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.6px' }}>
                      AI Restaurant Growth Advisor
                    </span>
                    <h3 style={{ fontSize: '22px', fontWeight: 950, margin: '6px 0' }}>Smart recommendations for sales, retention, delivery, and menu strategy</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      Recommendations are generated by {aiProvider && aiProvider !== 'unconfigured' ? aiProvider : 'your configured AI provider'} from orders, dishes, ratings, cancellations, customers, and delivery timing.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={refreshAIRecommendations} disabled={aiRefreshing} className="btn btn-primary btn-sm">
                      <RefreshCw size={16} /> {aiRefreshing ? 'Refreshing...' : 'Refresh AI'}
                    </button>
                    <button onClick={() => setAiChatOpen(true)} className="btn btn-secondary btn-sm">
                      <MessageSquare size={16} /> Ask AI
                    </button>
                    <button onClick={exportAIReport} className="btn btn-secondary btn-sm">
                      <Download size={16} /> Export Report
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                <AnalyticsCard title="AI Revenue Context" value={formatCurrency(aiSummary?.counters?.revenue || 0)} helper={`${aiSummary?.counters?.revenueGrowth || 0}% vs previous period`} icon={TrendingUp} />
                <AnalyticsCard title="Retention Signal" value={`${aiSummary?.counters?.customerRetention || 0}%`} helper={`${aiSummary?.customers?.repeat || 0} repeat customers`} icon={User} />
                <AnalyticsCard title="Delivery Efficiency" value={`${aiSummary?.counters?.deliveryEfficiency || 0}%`} helper={`${aiSummary?.counters?.avgDeliveryTime || 0} min avg delivery`} icon={Clock} />
                <AnalyticsCard title="Active AI Alerts" value={aiRecommendations.length} helper="Prioritized recommendations" icon={Sparkles} />
              </div>

              {aiLoading ? (
                <div className="loading">Generating AI growth recommendations...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {aiRecommendations.map((rec) => {
                    const style = priorityStyles[rec.priorityLevel] || priorityStyles.medium;
                    return (
                      <div key={rec.id} className="card" style={{ padding: '20px', background: 'white', borderTop: `4px solid ${style.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 9px', borderRadius: '999px', border: `1px solid ${style.border}`, background: style.background, color: style.color, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}>
                            <AlertTriangle size={13} /> {rec.priorityLevel}
                          </span>
                          <strong style={{ color: 'var(--primary-color)', fontSize: '13px' }}>AI Confidence: {Math.round(rec.confidenceScore || 0)}%</strong>
                        </div>
                        <h4 style={{ fontSize: '17px', fontWeight: 900, marginBottom: '8px' }}>{rec.title}</h4>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>{rec.description}</p>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {String(rec.recommendationType || '').replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                  {!aiRecommendations.length && (
                    <div className="card text-center" style={{ gridColumn: '1 / -1', padding: '42px', background: 'white' }}>
                      <Bot size={36} style={{ color: 'var(--primary-color)' }} />
                      <h3 style={{ marginTop: '10px' }}>{aiConfigured ? 'No AI recommendations generated yet' : 'AI provider not configured'}</h3>
                      <p style={{ color: 'var(--text-muted)' }}>
                        {aiConfigured
                          ? 'Only AI-generated recommendations from real restaurant data appear here. Try Refresh AI after orders, ratings, or delivery activity change.'
                          : 'Add GEMINI_API_KEY or OPENAI_API_KEY in the backend .env and restart the server. No local dummy recommendations are shown.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="card" style={{ padding: '22px', background: 'white' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '14px' }}>Ask the AI assistant</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {quickAIQuestions.map((question) => (
                    <button key={question} onClick={() => sendAIMessage(question)} className="btn btn-secondary btn-sm">
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MENU MANAGER TAB */}
          {activeTab === 'menu' && (
            <div className="card" style={{ padding: '24px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Manage Food Menu</h3>
                <button onClick={() => setAddItemModal(true)} className="btn btn-primary btn-sm btn-icon">
                  <Plus size={16} /> Add Food Item
                </button>
              </div>

              {/* Custom Tag Creator */}
              <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '850', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Create Custom Dietary Tag
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Add special categories for menu filtering (e.g. Jain, Low Fat, Organic)
                  </span>
                </div>
                <form onSubmit={handleCreateCustomTag} style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flex: '1', minWidth: '280px', justifyContent: 'flex-end' }}>
                  <input
                    type="text"
                    placeholder="Tag name (e.g. Low Fat)"
                    value={customTagName}
                    onChange={(e) => setCustomTagName(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #D1D5DB', outline: 'none', fontSize: '13px', width: '200px' }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '8px 16px', fontSize: '12px' }}>
                    Create Tag
                  </button>
                </form>
              </div>

              {menuLoading ? (
                <p>Loading menu items...</p>
              ) : menu.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>No items in your menu. Click Add Food Item above.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {menu.map((item) => (
                    <div key={item.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: item.isAvailable ? 'white' : 'var(--bg-secondary)', opacity: item.isAvailable ? 1 : 0.8 }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {item.image && (
                          <img
                            src={item.image.startsWith('http') ? item.image : `http://localhost:6789${item.image}`}
                            alt={item.name}
                            style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <h4 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>{item.name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--secondary-color)' }}>₹{item.price}</span>
                            <span style={{ fontSize: '11px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                              {item.category || 'Main Course'}
                            </span>
                          </div>
                          
                          {/* Toggleable food tag list for restaurant owner */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {allTags.map((tag) => {
                              const isAssigned = item.tags && item.tags.some((t) => t.id === tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  onClick={() => handleToggleTag(item.id, tag.id, isAssigned)}
                                  title={tag.description || ''}
                                  style={{
                                    fontSize: '10px',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    border: isAssigned ? '1.5px solid var(--primary-color)' : '1.5px solid #E5E7EB',
                                    background: isAssigned ? 'var(--bg-secondary)' : '#FFFFFF',
                                    color: isAssigned ? 'var(--primary-color)' : '#4B5563',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {isAssigned ? '✓ ' : '+ '}{tag.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Toggle switch for availability */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            onChange={() => handleToggleAvailability(item)}
                          />
                          {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                        </label>

                        <button onClick={() => setEditingItem(item)} className="btn-outline btn-sm" style={{ padding: '6px' }} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteMenuItem(item.id)} className="btn-outline btn-sm" style={{ padding: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COUPONS TAB */}
          {activeTab === 'coupons' && (
            <div className="card" style={{ padding: '24px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Active Promocodes</h3>
                <button onClick={() => setAddCouponModal(true)} className="btn btn-primary btn-sm btn-icon">
                  <Plus size={16} /> Create Coupon
                </button>
              </div>

              {couponsLoading ? (
                <p>Loading coupons...</p>
              ) : coupons.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>No active coupon campaigns configured.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  {coupons.map((c) => (
                    <div key={c.id} className="card" style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px dashed var(--primary-color)' }}>
                      <span style={{ fontWeight: '950', color: 'var(--primary-color)', fontSize: '16px', display: 'block' }}>{c.code}</span>
                      <p style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '6px' }}>
                        {c.discountType === 'percentage' ? `${c.discountValue}% Off` : `₹${c.discountValue} Off`}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Min order: ₹{c.minOrder || 0}
                      </p>
                      <span style={{ fontSize: '10px', background: c.isActive ? '#e6fffa' : '#fff5f5', color: c.isActive ? 'var(--success)' : 'var(--danger)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginTop: '10px', display: 'inline-block' }}>
                        {c.isActive ? 'Active' : 'Expired'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE SETTINGS TAB */}
          {activeTab === 'profile' && (
            <div className="card" style={{ padding: '24px', background: 'white' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Business Profile settings</h3>
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label htmlFor="pname">Restaurant Name</label>
                  <input
                    id="pname"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="pemail">Email Address</label>
                  <input
                    id="pemail"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="pphone">Phone Number</label>
                  <input
                    id="pphone"
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="paddress">Address</label>
                  <input
                    id="paddress"
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="logo">Upload New Banner/Logo</label>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImage(e.target.files[0])}
                  />
                </div>

                <div>
                  <label htmlFor="ppass">Password (Leave blank to keep current)</label>
                  <input
                    id="ppass"
                    type="password"
                    placeholder="New password"
                    value={profileForm.password}
                    onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                  Save Profile Changes
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setAiChatOpen(true)}
        title="Open AI assistant"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          zIndex: 9000,
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          border: 'none',
          background: 'var(--primary-color)',
          color: 'white',
          boxShadow: '0 18px 40px rgba(255,111,30,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <Bot size={26} />
      </button>

      {aiChatOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 'min(420px, 100vw)',
          height: '100vh',
          background: 'white',
          zIndex: 10000,
          boxShadow: '-18px 0 50px rgba(15,23,42,0.18)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '18px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fff7ed', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} />
              </span>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 950, margin: 0 }}>OrderMitra AI</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Restaurant growth assistant</p>
              </div>
            </div>
            <button onClick={() => setAiChatOpen(false)} className="btn btn-secondary btn-sm" style={{ padding: '8px' }} title="Close assistant">
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-light)' }}>
            {quickAIQuestions.slice(0, 3).map((question) => (
              <button key={question} onClick={() => sendAIMessage(question)} className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '7px 9px' }}>
                {question}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {aiMessages.length === 0 && (
              <div className="card" style={{ padding: '16px', background: 'white' }}>
                <strong style={{ display: 'block', marginBottom: '6px' }}>Ask about your restaurant performance</strong>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>I can explain sales changes, best dishes, weak menu items, peak hours, retention, delivery efficiency, and promotion ideas.</p>
              </div>
            )}
            {aiMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  padding: '11px 13px',
                  borderRadius: '14px',
                  background: message.role === 'user' ? 'var(--primary-color)' : 'white',
                  color: message.role === 'user' ? 'white' : 'var(--text-primary)',
                  boxShadow: message.role === 'assistant' ? 'var(--shadow-sm)' : 'none',
                  lineHeight: 1.5,
                  fontSize: '14px',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {message.content}
              </div>
            ))}
            {aiTyping && (
              <div style={{ alignSelf: 'flex-start', padding: '11px 13px', borderRadius: '14px', background: 'white', boxShadow: 'var(--shadow-sm)', color: 'var(--text-muted)' }}>
                AI is analyzing your restaurant data...
              </div>
            )}
          </div>

          <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendAIMessage();
              }}
              placeholder="Ask about sales, dishes, delivery, customers..."
              style={{ flex: 1 }}
            />
            <button onClick={() => sendAIMessage()} disabled={aiTyping || !aiInput.trim()} className="btn btn-primary" style={{ padding: '11px 14px' }}>
              <Send size={17} />
            </button>
          </div>
        </div>
      )}

      {/* EDIT MENU ITEM MODAL */}
      {editingItem && (
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
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Edit Menu Item</h3>
            <form onSubmit={handleUpdateMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="ename">Item Name</label>
                <input
                  id="ename"
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="eprice">Price (₹)</label>
                <input
                  id="eprice"
                  type="number"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="edesc">Description</label>
                <textarea
                  id="edesc"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="ecat">Category</label>
                <select
                  id="ecat"
                  value={editingItem.category || 'Main Course'}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                >
                  <option value="Starters">Starters</option>
                  <option value="Main Course">Main Course</option>
                  <option value="South Indian">South Indian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Drinks">Drinks</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" onClick={() => setEditingItem(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MENU ITEM MODAL */}
      {addItemModal && (
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
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Add New Item</h3>
            <form onSubmit={handleAddMenuItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="aname">Item Name</label>
                <input
                  id="aname"
                  type="text"
                  placeholder="e.g. Garlic Bread"
                  value={newItemData.name}
                  onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="aprice">Price (₹)</label>
                <input
                  id="aprice"
                  type="number"
                  placeholder="e.g. 199"
                  value={newItemData.price}
                  onChange={(e) => setNewItemData({ ...newItemData, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="adesc">Description</label>
                <textarea
                  id="adesc"
                  placeholder="Details of ingredients, etc."
                  value={newItemData.description}
                  onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <label htmlFor="acat">Category</label>
                <select
                  id="acat"
                  value={newItemData.category}
                  onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                >
                  <option value="Starters">Starters</option>
                  <option value="Main Course">Main Course</option>
                  <option value="South Indian">South Indian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Drinks">Drinks</option>
                </select>
              </div>

              <div>
                <label htmlFor="aimg">Item Image File</label>
                <input
                  id="aimg"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setMenuImage(e.target.files[0])}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Item</button>
                <button type="button" onClick={() => setAddItemModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COUPON MODAL */}
      {addCouponModal && (
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
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Create Coupon Promocode</h3>
            <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="ccode">Promo Code (Uppercase)</label>
                <input
                  id="ccode"
                  type="text"
                  placeholder="e.g. YUMMY30"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="ctype">Discount Type</label>
                <select
                  id="ctype"
                  value={newCoupon.discountType}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label htmlFor="cval">Discount Value</label>
                <input
                  id="cval"
                  type="number"
                  placeholder={newCoupon.discountType === 'percentage' ? 'e.g. 10' : 'e.g. 50'}
                  value={newCoupon.discountValue}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="cmin">Minimum Order Value (₹)</label>
                <input
                  id="cmin"
                  type="number"
                  placeholder="e.g. 299"
                  value={newCoupon.minOrder}
                  onChange={(e) => setNewCoupon({ ...newCoupon, minOrder: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="cmax">Maximum Discount Cap (₹)</label>
                <input
                  id="cmax"
                  type="number"
                  placeholder="e.g. 100"
                  value={newCoupon.maxDiscount}
                  onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscount: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="cuntil">Expiration Date</label>
                <input
                  id="cuntil"
                  type="date"
                  value={newCoupon.validUntil}
                  onChange={(e) => setNewCoupon({ ...newCoupon, validUntil: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Coupon</button>
                <button type="button" onClick={() => setAddCouponModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantDashboard;
