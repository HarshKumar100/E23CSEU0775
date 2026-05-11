import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { api, studentId } from '../services/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionNewIds, setSessionNewIds] = useState(() => new Set());
  const [latestSocketNotification, setLatestSocketNotification] = useState(null);

  const refreshUnreadCount = useCallback(() => {
    return api.get('/notifications/unread-count')
      .then((res) => setUnreadCount(res.data.data.count))
      .catch(() => setUnreadCount((count) => count));
  }, []);

  useEffect(() => {
    refreshUnreadCount();

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });

    socket.emit('student:join', { studentId });

    socket.on('notification:new', (notification) => {
      setLatestSocketNotification(notification);
      setSessionNewIds((existing) => new Set(existing).add(notification.id));
      setUnreadCount((count) => count + 1);
    });

    socket.on('notification:read', () => {
      refreshUnreadCount();
    });

    socket.on('notification:readAll', () => {
      setUnreadCount(0);
    });

    return () => socket.disconnect();
  }, [refreshUnreadCount]);

  const value = useMemo(() => ({
    latestSocketNotification,
    refreshUnreadCount,
    sessionNewIds,
    setUnreadCount,
    unreadCount,
  }), [latestSocketNotification, refreshUnreadCount, sessionNewIds, unreadCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationContext must be used inside NotificationProvider');
  return context;
}
