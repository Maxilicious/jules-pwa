import { createTheme } from '@mui/material/styles';

// Material Design 3 Expressive Theme
// It features larger border radiuses, more vibrant colors, and dynamic spacing
export const theme = createTheme({
    palette: {
        mode: 'dark', // PWA feels native often with dark mode
        primary: {
            main: '#A8C7FA',
            light: '#D3E3FD',
            dark: '#0842A0',
            contrastText: '#041E49',
        },
        secondary: {
            main: '#C2E7FF',
            light: '#D3E3FD',
            dark: '#004A77',
            contrastText: '#001D35',
        },
        background: {
            default: '#131314', // MD3 surface color
            paper: '#1E1F20',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '3.5rem', fontWeight: 400, letterSpacing: '0em' },
        h2: { fontSize: '2.8125rem', fontWeight: 400, letterSpacing: '0em' },
        h3: { fontSize: '2.25rem', fontWeight: 400, letterSpacing: '0em' },
    },
    shape: {
        borderRadius: 16, // MD3 relies heavily on larger corner radii, e.g., 16px, 24px, 28px
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 20, // Fully rounded buttons
                    textTransform: 'none',
                    padding: '10px 24px',
                    fontWeight: 500,
                },
                containedPrimary: {
                    backgroundColor: '#A8C7FA',
                    color: '#041E49',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        backgroundColor: '#D3E3FD',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    },
                    '&:active': {
                        transform: 'translateY(1px)',
                    }
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 24, // Expressive large cards
                    backgroundColor: '#1E1F20',
                    backgroundImage: 'none', // Remove default elevation overlay in dark mode
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                rounded: {
                    borderRadius: 24,
                },
            },
        },
        MuiFab: {
            styleOverrides: {
                root: {
                    borderRadius: 16, // Slightly squared FABs are highly MD3
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 8px 12px rgba(0,0,0,0.3)',
                    },
                    '&:active': {
                        transform: 'scale(0.95)',
                    }
                },
            },
        }
    },
});

export default theme;
