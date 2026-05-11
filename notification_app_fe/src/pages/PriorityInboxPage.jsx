import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import FilterBar from '../components/FilterBar.jsx';
import PriorityInboxPanel from '../components/PriorityInboxPanel.jsx';
import { usePriorityInbox } from '../hooks/usePriorityInbox.js';
import { theme } from '../theme/muiTheme.js';

const viewedStorageKey = 'campus-notification-viewed-ids';

function readViewedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(viewedStorageKey) || '[]'));
  } catch {
    return new Set();
  }
}

export default function PriorityInboxPage() {
  const [topN, setTopN] = useState(10);
  const [type, setType] = useState('All');
  const [viewedIds] = useState(readViewedIds);
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const { error, loading, priorityItems, setError } = usePriorityInbox({ topN, type });

  const unviewedIds = useMemo(() => {
    return new Set(priorityItems.filter((item) => !viewedIds.has(item.id)).map((item) => item.id));
  }, [priorityItems, viewedIds]);

  useEffect(() => {
    if (!priorityItems.length) return;

    const nextViewed = new Set(viewedIds);
    priorityItems.forEach((item) => nextViewed.add(item.id));
    localStorage.setItem(viewedStorageKey, JSON.stringify([...nextViewed]));
    // TODO: track explicit card impressions instead of treating render as viewed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorityItems]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5">Priority Inbox</Typography>
          <Typography color="text.secondary" variant="body2">
            Ranked by campus impact and freshness.
          </Typography>
        </Stack>

        <FormControl size="small" sx={{ minWidth: compact ? '100%' : 160 }}>
          <InputLabel id="top-n-label">Show top N</InputLabel>
          <Select
            labelId="top-n-label"
            label="Show top N"
            value={topN}
            onChange={(event) => setTopN(Number(event.target.value))}
          >
            {[10, 15, 20].map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <FilterBar value={type} onChange={setType} />

      <PriorityInboxPanel
        items={priorityItems.map((item) => ({
          ...item,
          isUnviewed: unviewedIds.has(item.id),
        }))}
        loading={loading}
      />

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={4200}
        message={error}
        onClose={() => setError('')}
      />
    </Stack>
  );
}
