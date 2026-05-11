import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';

const typeColor = {
  Placement: 'success',
  Result: 'info',
  Event: 'warning',
};

export default function NotificationCard({
  notification,
  isNewSession,
  isUnviewed,
  onMarkRead,
  rank,
  showScore = false,
}) {
  const relativeTime = useMemo(() => {
    return formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });
  }, [notification.timestamp]);

  const accentColor = notification.isRead ? 'transparent' : 'primary.main';

  return (
    <Card
      sx={{
        borderLeft: '4px solid',
        borderLeftColor: accentColor,
        opacity: notification.isRead ? 0.72 : 1,
        transition: 'transform 180ms ease, border-color 180ms ease',
        '&:hover': { transform: 'translateY(-2px)' },
      }}
      variant="outlined"
    >
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
          <Stack spacing={1.25} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              {rank ? (
                <Chip size="small" label={`#${rank}`} color="primary" variant="outlined" />
              ) : null}
              <Chip
                size="small"
                label={notification.type}
                color={typeColor[notification.type] || 'default'}
              />
              {showScore ? (
                <Chip size="small" label={`Score: ${notification.score ?? 0}`} variant="outlined" />
              ) : null}
              {isUnviewed ? (
                <Chip size="small" label="New" color="success" variant="outlined" />
              ) : null}
              {isNewSession ? (
                <Box
                  className="new-session-pulse"
                  sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'success.main' }}
                />
              ) : null}
            </Stack>

            <Typography
              variant="body1"
              sx={{
                fontWeight: notification.isRead ? 400 : 600,
                overflowWrap: 'anywhere',
              }}
            >
              {notification.message}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {relativeTime}
            </Typography>
          </Stack>

          {!notification.isRead && onMarkRead ? (
            <Button
              startIcon={<DoneIcon />}
              onClick={() => onMarkRead(notification.id)}
              size="small"
              variant="outlined"
              sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, minWidth: 128 }}
            >
              Mark as Read
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
