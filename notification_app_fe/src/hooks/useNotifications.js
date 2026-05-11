import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useNotificationContext } from '../context/NotificationContext.jsx';

export function useNotifications({ page, type }) {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { latestSocketNotification, refreshUnreadCount } = useNotificationContext();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = { page, limit: 20 };
      if (type !== 'All') params.notification_type = type;

      const res = await api.get('/notifications', { params });
      setNotifications(res.data.data.notifications);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [page, type]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!latestSocketNotification || page !== 1) return;
    if (type !== 'All' && latestSocketNotification.type !== type) return;

    setNotifications((current) => {
      const alreadyExists = current.some((notif) => notif.id === latestSocketNotification.id);
      if (alreadyExists) return current;
      return [latestSocketNotification, ...current].slice(0, pagination.limit || 20);
    });
  }, [latestSocketNotification, page, pagination.limit, type]);

  const markAsRead = useCallback(async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((current) => current.map((notif) => (
      notif.id === id ? { ...notif, isRead: true } : notif
    )));
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    await api.patch('/notifications/read-all');
    setNotifications((current) => current.map((notif) => ({ ...notif, isRead: true })));
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  return {
    error,
    loadNotifications,
    loading,
    markAllAsRead,
    markAsRead,
    notifications,
    pagination,
    setError,
  };
}
