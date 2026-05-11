import React from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotificationContext } from '../context/NotificationContext.jsx';

export default function NotificationBadge() {
  const { unreadCount } = useNotificationContext();

  return (
    <Tooltip title="Unread notifications">
      <IconButton color="inherit" aria-label="Unread notifications">
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
