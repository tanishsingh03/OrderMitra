import { io } from 'socket.io-client';

let socket = null;
const listeners = {};

export const connectSocket = (userId, role) => {
  if (socket) {
    if (userId && role) {
      if (socket.connected) {
        socket.emit('join', { userId, role });
      } else {
        socket.once('connect', () => socket.emit('join', { userId, role }));
      }
    }
    return socket;
  }

  const url = import.meta.env.VITE_WS_URL || 'http://localhost:6789';
  console.log(`🔌 Connecting to WebSocket at ${url}`);

  socket = io(url, {
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket Server');
    if (userId && role) {
      socket.emit('join', { userId, role });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from WebSocket Server');
  });

  // Wire up dynamic listeners to trigger registered callbacks
  socket.onAny((event, ...args) => {
    if (listeners[event]) {
      listeners[event].forEach((cb) => cb(...args));
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const subscribeToEvent = (event, callback) => {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(callback);
};

export const unsubscribeFromEvent = (event, callback) => {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter((cb) => cb !== callback);
};

export const emitEvent = (event, data) => {
  if (socket) {
    socket.emit(event, data);
  } else {
    console.warn('⚠️ Cannot emit event. Socket not connected.');
  }
};

export const getSocket = () => socket;
