import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { connectSocket, disconnectSocket } from '../sockets/socketService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser?.role) {
        setToken(savedToken);
        setUser(parsedUser);
        connectSocket(parsedUser.id, parsedUser.role);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    try {
      let endpoint = '/login';
      if (role === 'delivery-partner') {
        endpoint = '/delivery/login';
      } else if (role === 'admin') {
        endpoint = '/admin/login';
      }

      const response = await api.post(endpoint, { email, password, role });
      let responseData = response.data;

      if (
        role === 'customer' &&
        responseData &&
        responseData.success === false &&
        typeof responseData.message === 'string' &&
        responseData.message.toLowerCase().includes('no customer account')
      ) {
        const [deliveryAttempt, restaurantAttempt] = await Promise.allSettled([
          api.post('/delivery/login', { email, password }),
          api.post('/login', { email, password, role: 'restaurant-owner' })
        ]);

        const successfulFallback = [deliveryAttempt, restaurantAttempt].find(
          (attempt) => attempt.status === 'fulfilled' && attempt.value.data?.success
        );

        if (successfulFallback) {
          responseData = successfulFallback.value.data;
        }
      }

      const { success, token: receivedToken, user: receivedUser, admin, partner, message } = responseData;

      if (!success) {
        throw new Error(message || 'Login failed');
      }

      const activeToken = receivedToken;
      // Re-map the user based on response fields
      let activeUser = receivedUser || admin || partner;

      if (!activeUser) {
        throw new Error('User details missing in login response');
      }

      // Ensure role is mapped for security routing
      if (admin) activeUser.role = 'admin';
      else if (partner) activeUser.role = 'delivery-partner';
      else if (!activeUser.role) activeUser.role = role || 'customer';

      setToken(activeToken);
      setUser(activeUser);

      localStorage.setItem('token', activeToken);
      localStorage.setItem('user', JSON.stringify(activeUser));

      // Connect real-time websockets
      connectSocket(activeUser.id, activeUser.role);

      return { success: true, user: activeUser };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: err.message || 'Server error' };
    }
  };

  const signup = async (userData) => {
    try {
      let endpoint = '/signup';
      if (userData.role === 'delivery-partner') {
        endpoint = '/delivery/signup';
      }

      const response = await api.post(endpoint, userData);
      const { success, message } = response.data;

      if (!success) {
        throw new Error(message || 'Registration failed');
      }

      return { success: true, message };
    } catch (err) {
      console.error('Signup error:', err);
      return { success: false, message: err.message || 'Server error' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
  };

  const reloadUser = async () => {
    try {
      const response = await api.get('/customer/me');
      const { success, user: refreshedUser } = response.data;

      if (!success || !refreshedUser) {
        throw new Error(response.data.message || 'Failed to reload user');
      }

      setUser(refreshedUser);
      localStorage.setItem('user', JSON.stringify(refreshedUser));
      return { success: true, user: refreshedUser };
    } catch (err) {
      console.error('Reload user error:', err);
      return { success: false, message: err.message || 'Server error' };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/customer/update', profileData);
      const { success, user: updatedUser, message } = response.data;

      if (!success) {
        throw new Error(message || 'Failed to update profile');
      }

      const newUserData = { ...user, ...updatedUser };
      setUser(newUserData);
      localStorage.setItem('user', JSON.stringify(newUserData));
      return { success: true };
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false, message: err.message || 'Server error' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, reloadUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
