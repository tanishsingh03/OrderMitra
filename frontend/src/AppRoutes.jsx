import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public pages
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import DeliverySignup from './pages/auth/DeliverySignup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Customer pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import RestaurantView from './pages/customer/RestaurantView';
import CartPage from './pages/customer/CartPage';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerWallet from './pages/customer/CustomerWallet';
import CustomerProfile from './pages/customer/CustomerProfile';

// Restaurant pages
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';

// Delivery pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/delivery-signup" element={<DeliverySignup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Customer Routes */}
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/restaurant/:id"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <RestaurantView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/cart"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CartPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/orders"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/wallet"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerWallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/profile"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerProfile />
          </ProtectedRoute>
        }
      />

      {/* Restaurant Owner Routes */}
      <Route
        path="/restaurant/dashboard"
        element={
          <ProtectedRoute allowedRoles={['restaurant-owner']}>
            <RestaurantDashboard />
          </ProtectedRoute>
        }
      />
      {/* Redirect menu, coupons, profile links from Header to consolidated Dashboard */}
      <Route
        path="/restaurant/menu"
        element={<Navigate to="/restaurant/dashboard" replace />}
      />
      <Route
        path="/restaurant/coupons"
        element={<Navigate to="/restaurant/dashboard" replace />}
      />
      <Route
        path="/restaurant/profile"
        element={<Navigate to="/restaurant/dashboard" replace />}
      />

      {/* Delivery Partner Routes */}
      <Route
        path="/delivery/dashboard"
        element={
          <ProtectedRoute allowedRoles={['delivery-partner']}>
            <DeliveryDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery/orders"
        element={<Navigate to="/delivery/dashboard" replace />}
      />
      <Route
        path="/delivery/profile"
        element={<Navigate to="/delivery/dashboard" replace />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={<Navigate to="/admin/dashboard" replace />}
      />

      {/* Fallback Unauthorized */}
      <Route
        path="/unauthorized"
        element={
          <div className="container text-center" style={{ padding: '64px' }}>
            <h2 style={{ fontSize: '32px', color: 'var(--danger)' }}>Access Denied</h2>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>You do not have permissions to access this dashboard view.</p>
          </div>
        }
      />

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
