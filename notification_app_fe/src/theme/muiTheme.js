import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#4fc3f7' },
    secondary: { main: '#81c784' },
    background: { default: '#0d1117', paper: '#161b22' },
    warning: { main: '#ffb74d' },
    info: { main: '#64b5f6' },
    success: { main: '#81c784' },
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});
