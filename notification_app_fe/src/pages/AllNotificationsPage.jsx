import React from 'react';
import { useState } from 'react';
import {
  Box,
  Button,
  Pagination,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import FilterBar from '../components/FilterBar.jsx';
import NotificationCard from '../components/NotificationCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { useNotificationContext } from '../context/NotificationContext.jsx';

export default function AllNotificationsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('All');
  const { sessionNewIds } = useNotificationContext();
  const {
    error,
    loading,
    markAllAsRead,
    markAsRead,
    notifications,
    pagination,
    setError,
  } = useNotifications({ page, type });

  const handleTypeChange = (nextType) => {
    setType(nextType);
    setPage(1);
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <Box>
          <Typography variant="h5">All Notifications</Typography>
          <Typography color="text.secondary" variant="body2">
            Placements, events, and results in one live inbox.
          </Typography>
        </Box>
        <Button
          startIcon={<MarkEmailReadIcon />}
          onClick={markAllAsRead}
          variant="contained"
          disabled={!notifications.some((notif) => !notif.isRead)}
          sx={{ minWidth: 152 }}
        >
          Mark All Read
        </Button>
      </Stack>

      <FilterBar value={type} onChange={handleTypeChange} />

      {loading ? (
        <Stack spacing={2}>
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} height={104} variant="rounded" />
          ))}
        </Stack>
      ) : notifications.length ? (
        <Stack spacing={2}>
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              isNewSession={sessionNewIds.has(notification.id)}
              onMarkRead={markAsRead}
            />
          ))}
        </Stack>
      ) : (
        <EmptyState />
      )}

      {pagination.totalPages > 1 ? (
        <Pagination
          color="primary"
          count={pagination.totalPages}
          page={page}
          onChange={(event, nextPage) => setPage(nextPage)}
          sx={{ alignSelf: 'center' }}
        />
      ) : null}

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={4200}
        message={error}
        onClose={() => setError('')}
      />
    </Stack>
  );
}
