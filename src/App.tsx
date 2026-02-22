import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import { theme } from './theme/md3';
import { useAuth } from './api/useAuth';
import { AuthDialog } from './components/AuthDialog';
import { MainLayout } from './layouts/MainLayout';
import { HomeView } from './views/HomeView';
import { CreateSessionView } from './views/CreateSessionView';
import { SessionDetailView } from './views/SessionDetailView';
import { useNotifications } from './hooks/useNotifications';

function App() {
  const { apiKey, isReady, saveKey } = useAuth();
  useNotifications(); // Requests permission implicitly on mount

  if (!isReady) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthDialog open={!apiKey} onSave={saveKey} />

      {apiKey && (
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
