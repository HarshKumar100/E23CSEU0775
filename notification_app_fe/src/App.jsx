import React from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import BoltIcon from '@mui/icons-material/Bolt';
import NotificationBadge from './components/NotificationBadge.jsx';
import AllNotificationsPage from './pages/AllNotificationsPage.jsx';
import PriorityInboxPage from './pages/PriorityInboxPage.jsx';
import { theme } from './theme/muiTheme.js';

function NavButton({ to, icon, children }) {
  return (
    <Button
      component={NavLink}
      to={to}
      startIcon={icon}
      sx={{
        color: 'text.primary',
        '&.active': {
          bgcolor: 'rgba(79, 195, 247, 0.14)',
          color: 'primary.main',
        },
      }}
    >
      {children}
    </Button>
  );
}

export default function App() {
  const compact = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', backdropFilter: 'blur(12px)' }}>
          <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
            <Stack
              component={Link}
              to="/"
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ color: 'text.primary', textDecoration: 'none', minWidth: 0 }}
            >
              <InboxIcon color="primary" />
              <Typography variant="h6" noWrap>
                Campus Notify
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {!compact ? (
                <>
                  <NavButton to="/" icon={<InboxIcon />}>Inbox</NavButton>
                  <NavButton to="/priority" icon={<BoltIcon />}>Priority</NavButton>
                </>
              ) : null}
              <NotificationBadge />
            </Stack>
          </Toolbar>
          {compact ? (
            <Toolbar variant="dense" sx={{ gap: 1 }}>
              <NavButton to="/" icon={<InboxIcon />}>Inbox</NavButton>
              <NavButton to="/priority" icon={<BoltIcon />}>Priority</NavButton>
            </Toolbar>
          ) : null}
        </AppBar>

        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
          <Routes>
            <Route path="/" element={<AllNotificationsPage />} />
            <Route path="/priority" element={<PriorityInboxPage />} />
          </Routes>
        </Container>
      </Box>
    </BrowserRouter>
  );
}
