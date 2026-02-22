import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import { theme } from './theme/md3';
import { MainLayout } from './layouts/MainLayout';
import { HomeView } from './views/HomeView';
import { CreateSessionView } from './views/CreateSessionView';
import { SessionDetailView } from './views/SessionDetailView';
import { LoginView } from './views/LoginView';
import { useNotifications } from './hooks/useNotifications';
import { auth, onAuthStateChanged } from './firebase';

const AUTHORIZED_EMAIL = 'wijnbladh.max@gmail.com';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useNotifications(); // Requests permission implicitly on mount

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const isAuthorized = user && user.email === AUTHORIZED_EMAIL;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {!isAuthorized ? (
        <LoginView />
      ) : (
        <BrowserRouter>
          <MainLayout>
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/new" element={<CreateSessionView />} />
              <Route path="/session/:id" element={<SessionDetailView />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      )}
    </ThemeProvider>
  );
}

export default App;
