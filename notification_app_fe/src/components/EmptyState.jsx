import React from 'react';
import { Box, Typography } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export default function EmptyState({ title = 'No notifications' }) {
  return (
    <Box
      sx={{
        alignItems: 'center',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        py: 8,
      }}
    >
      <InboxIcon color="disabled" fontSize="large" />
      <Typography color="text.secondary">{title}</Typography>
    </Box>
  );
}
