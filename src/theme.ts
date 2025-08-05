// src/theme.ts
import { createTheme } from '@mui/material/styles';

import type { Color } from '@mui/material';

// Extend the palette to include your custom color names if you want to use them directly
declare module '@mui/material/styles' {
  interface Palette {
    blue: Palette['primary'];
    cyan: Palette['primary'];
    grey: Color;
  }
  interface PaletteOptions {
    blue?: PaletteOptions['primary'];
    cyan?: PaletteOptions['primary'];
    grey?: Partial<Color>;
  }
}

const Theme = createTheme({
  palette: {
    mode: 'dark', // Set the overall theme to dark
    primary: {
      main: '#0891b2', // Your existing cyan-like color for primary actions
      light: '#22d3ee',
      dark: '#0e7490',
      contrastText: '#fff',
    },
    secondary: {
      main: '#a21caf', // Your existing "Funnier" button color
      light: '#c026d9',
      dark: '#86198f',
      contrastText: '#fff',
    },
    error: {
      main: '#dc2626', // Your existing "Remove Screenshot" button color
      light: '#ef4444',
      dark: '#b91c1c',
      contrastText: '#fff',
    },
    warning: {
      main: '#f59e0b', // Your existing "Auto-generation enabled" button color
      light: '#facc15',
      dark: '#b45309',
      contrastText: '#fff',
    },
    info: {
      main: '#38bdf8', // Your existing "Save All" / "Paste" button color
      light: '#60a5fa',
      dark: '#0ea5e9',
      contrastText: '#fff',
    },
    success: {
      main: '#22c55e', // Your existing "Custom Action" / "Save" button color
      light: '#4ade80',
      dark: '#16a34a',
      contrastText: '#fff',
    },
    background: {
      default: '#111827', // Matches your body background from index.css
      paper: '#1f2937', // Matches your common Paper background
    },
    text: {
      primary: '#e5e7eb', // Matches your body text color
      secondary: '#9ca3af',
    },
    // Custom color definitions to map your specific shades
    blue: {
      main: '#031b6b', // Used in AppBar gradient
      '200': '#bfdbfe', // Used in hotkey hints box
      '900': '#031b6b', // Explicitly define for clarity
    },
    cyan: {
      main: '#0891b2',
      '100': '#cffafe',
      '200': '#a5f3fc',
      '300': '#67e8f9',
      '400': '#22d3ee',
      '700': '#0e7490',
      '900': '#083344', // Used for generated message background
    },
    grey: {
      '400': '#9ca3af',
      '700': '#374151',
      '800': '#1f2937', // Used for hotkey kbd background, select background
      '900': '#111827', // Used for footer background, inner drag/drop area
    },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h6: {
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: 1,
    },
    caption: {
      fontSize: 12,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: '0 6px 24px rgba(6,182,212,0.18)', // Adjusted from boxShadow: 6
          background: 'linear-gradient(90deg, #031b6b71 0%, #0891b2 80%, #0891b2 100%)',
          zIndex: 140,
          height: '80px',
          minHeight: 24,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 24,
          paddingLeft: '16px', // px: 2
          paddingRight: '16px', // px: 2
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px', // gap: 2
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1f2937', // Default paper background (grey.800)
          borderColor: '#0891b2', // Default border color (primary.main)
          border: '2px solid',
          boxShadow: '0 6px 24px rgba(6,182,212,0.18)', // Default shadow
        },
      },
      variants: [
        {
          props: { elevation: 8 }, // For the main upload area
          style: {
            borderColor: '#0e7490', // cyan.700
            boxShadow: '0 8px 32px rgba(6,182,212,0.25)', // Stronger shadow
          },
        },
        {
          props: { elevation: 2 }, // For the inner drag/drop area
          style: {
            backgroundColor: '#111827', // grey.900
            borderColor: '#0e7490', // cyan.700
            boxShadow: '0 2px 8px rgba(6,182,212,0.10)',
          },
        },
        {
          props: { elevation: 0 }, // For the button box
          style: {
            backgroundColor: '#1f2937', // grey.800
            borderColor: '#0891b2',
            boxShadow: 'none',
          },
        },
        {
          props: { elevation: 6 }, // For the generated messages box
          style: {
            borderColor: '#0e7490', // cyan.700
            boxShadow: '0 8px 32px rgba(6,182,212,0.25)', // Stronger shadow
          },
        },
        {
          props: { elevation: 3 }, // For the error message box
          style: {
            backgroundColor: '#dc2626', // error.main
            color: '#fff',
            border: 'none', // No border for error box
            boxShadow: '0 4px 16px rgba(220,38,38,0.25)',
          },
        },
      ],
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: 24, // Matches 1.5rem from .material-nav-btn
          padding: '0.5rem 1.1rem',
          minWidth: 120,
          fontSize: 15,
          boxShadow: '0 2px 8px rgba(6,182,212,0.10), 0 1.5px 4px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.2s, background 0.2s, color 0.2s',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(6,182,212,0.18), 0 2px 8px rgba(0,0,0,0.12)',
          },
        },
        // Styles for specific button variants/colors
        containedPrimary: {
          backgroundColor: '#0891b2', // primary.main
          color: '#fff',
          '&:hover': {
            backgroundColor: '#0e7490', // primary.dark
          },
        },
        containedSecondary: {
          backgroundColor: '#a21caf', // secondary.main
          color: '#fff',
          '&:hover': {
            backgroundColor: '#86198f', // secondary.dark
          },
        },
        containedError: {
          backgroundColor: '#dc2626', // error.main
          color: '#fff',
          '&:hover': {
            backgroundColor: '#b91c1c', // error.dark
          },
        },
        containedSuccess: {
          backgroundColor: '#22c55e', // success.main
          color: '#fff',
          '&:hover': {
            backgroundColor: '#16a34a', // success.dark
          },
        },
        containedInfo: {
          backgroundColor: '#38bdf8', // info.main
          color: '#fff',
          '&:hover': {
            backgroundColor: '#0ea5e9', // info.dark
          },
        },
        outlinedWarning: {
          borderColor: '#f59e0b', // warning.main
          color: '#f59e0b',
          '&:hover': {
            backgroundColor: 'rgba(245, 158, 11, 0.08)', // warning.main with opacity
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'color 0.2s, background 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(34,197,94,0.08)', // Example from screenshot button
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#1f2937', // grey.800
          color: '#a5f3fc', // cyan.200
          padding: '4px 8px', // px: 1, py: 0.5
          borderRadius: 8, // borderRadius: 2
          fontWeight: 700,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent', // Remove default border
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent',
          },
        },
        icon: {
          color: '#a5f3fc', // cyan.200
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          backgroundColor: '#1f2937', // grey.800
          color: '#a5f3fc', // cyan.200
          '&:hover': {
            backgroundColor: '#0891b2', // primary.main
            color: '#fff',
          },
          '&.Mui-selected': {
            backgroundColor: '#0e7490', // primary.dark
            color: '#fff',
            '&:hover': {
              backgroundColor: '#0891b2',
            },
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#f59e0b', // warning.main
          '&.Mui-checked': {
            color: '#f59e0b', // warning.main
          },
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          zIndex: 1600, // Ensure it's above modals
        },
        anchorOriginTopCenter: {
          top: '96px', // Below AppBar
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
          zIndex: 1500, // Ensure modals are above main content but below snackbar
        },
      },
    },
    MuiList: { // For the ul in generated messages
      styleOverrides: {
        root: {
          listStyle: 'none',
          padding: 0,
          margin: 0,
        },
      },
    },
    MuiListItem: { // For the li in generated messages
      styleOverrides: {
        root: {
          backgroundColor: '#083344', // cyan.900
          color: '#fff',
          borderRadius: 12, // 3 from p: 2.5
          padding: '10px 20px', // p: 2.5
          marginBottom: 16, // mb: 2
          boxShadow: '0 4px 16px rgba(6,182,212,0.15)', // boxShadow: 4
          border: '2px solid #0e7490', // cyan.700
          display: 'flex',
          flexDirection: 'column',
          gap: 8, // gap: 1
          transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s, color 0.2s',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(6,182,212,0.25)', // boxShadow: 8
            borderColor: '#38bdf8', // info.main
            background: 'linear-gradient(90deg, #0891b2 0%, #22d3ee 100%)',
            color: '#111827', // grey.900
          },
        },
      },
    },
  },
});

export default Theme;