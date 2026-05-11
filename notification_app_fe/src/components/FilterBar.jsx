import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

const filters = ['All', 'Event', 'Result', 'Placement'];

export default function FilterBar({ value, onChange }) {
  return (
    <ToggleButtonGroup
      color="primary"
      exclusive
      size="small"
      value={value}
      onChange={(event, nextValue) => {
        if (nextValue) onChange(nextValue);
      }}
      sx={{ flexWrap: 'wrap', gap: 1 }}
    >
      {filters.map((filter) => (
        <ToggleButton key={filter} value={filter} sx={{ minWidth: 88 }}>
          {filter}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
