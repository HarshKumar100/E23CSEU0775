import React from 'react';
import { Skeleton, Stack } from '@mui/material';
import EmptyState from './EmptyState.jsx';
import NotificationCard from './NotificationCard.jsx';
import { useNotificationContext } from '../context/NotificationContext.jsx';

export default function PriorityInboxPanel({ items, loading }) {
  const { sessionNewIds } = useNotificationContext();

  if (loading) {
    return (
      <Stack spacing={2}>
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} height={104} variant="rounded" />
        ))}
      </Stack>
    );
  }

  if (!items.length) return <EmptyState title="Priority inbox is clear" />;

  return (
    <Stack spacing={2}>
      {items.map((notification, index) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          isNewSession={sessionNewIds.has(notification.id)}
          isUnviewed={notification.isUnviewed}
          rank={index + 1}
          showScore
        />
      ))}
    </Stack>
  );
}
