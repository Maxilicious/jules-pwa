import { Box, Button, Typography, Container, Paper } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { signInWithPopup } from '../firebase';
import { auth, googleProvider } from '../firebase';

export const LoginView = () => {
    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err: unknown) {
            if (err instanceof Error) alert(`Login failed: ${err.message}`);
        }
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 4, width: '100%' }}>
                <Box
                    component="img"
                    src="/pwa-192x192.png"
                    alt="Jules PWA Logo"
                    sx={{ width: 80, height: 80, mb: 2, borderRadius: 2 }}
                />
                <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    Welcome to Jules
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
                    Sign in with your authorized Google account to continue.
                </Typography>

                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<GoogleIcon />}
                    onClick={handleLogin}
                    sx={{
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 600,
                        textTransform: 'none',
                        fontSize: '1rem'
                    }}
                >
                    Sign in with Google
                </Button>
            </Paper>
        </Container>
    );
};
