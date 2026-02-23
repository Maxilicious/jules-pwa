import React from 'react';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <AppBar position="static" color="transparent" elevation={0} sx={{ py: 1 }}>
                <Toolbar>
                    <Box
                        component="img"
                        src="/pwa-192x192.png"
                        alt="Jules Logo"
                        sx={{ width: 28, height: 28, mr: 1.5, borderRadius: 1 }}
                    />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                        Jules
                    </Typography>
                </Toolbar>
            </AppBar>
            <Container component="main" sx={{ flexGrow: 1, pb: 10, pt: 2, display: 'flex', flexDirection: 'column' }}>
                {children}
            </Container>
        </Box>
    );
};
