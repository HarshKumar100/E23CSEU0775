import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export function usePriorityInbox({ topN, type }) {
  const [priorityItems, setPriorityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPriorityInbox = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = { n: topN };
      if (type !== 'All') params.notification_type = type;

      const res = await api.get('/notifications/priority', { params });
      setPriorityItems(res.data.data.notifications);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load priority inbox');
    } finally {
      setLoading(false);
    }
  }, [topN, type]);

  useEffect(() => {
    loadPriorityInbox();
  }, [loadPriorityInbox]);

  return {
    error,
    loadPriorityInbox,
    loading,
    priorityItems,
    setError,
  };
}
