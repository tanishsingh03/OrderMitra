import React, { createContext, useContext, useState, useCallback } from 'react';
import '../styles/design-system.css';
import '../styles/enhanced-styles.css';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    // Auto-remove notification after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Toast Render Target Container */}
      <div
        style={{
          position: 'fixed',
          top: '90px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none',
        }}
      >
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`notification ${n.type}`}
            style={{
              position: 'relative',
              top: 'auto',
              right: 'auto',
              animation: 'slideIn 0.3s ease',
              pointerEvents: 'auto',
              cursor: 'pointer',
              marginBottom: '0',
            }}
            onClick={() => removeNotification(n.id)}
          >
            <span>
              {n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{n.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
