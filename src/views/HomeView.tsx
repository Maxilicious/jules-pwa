import { useEffect, useState } from 'react';
import { Typography, CircularProgress, Box, Card, CardContent, Chip, Fab, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { listSessions } from '../api/client';
import { useNavigate } from 'react-router-dom';

export const HomeView = () => {
    const [sessions, setSessions] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await listSessions();
                setSessions(res.sessions || []);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSessions();
    }, []);

    return (
        <Box sx={{ flexGrow: 1, position: 'relative' }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                My Sessions
            </Typography>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Typography color="error">{error}</Typography>
            ) : sessions.length === 0 ? (
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    No sessions found. Create one!
                </Typography>
            ) : (
                <Stack spacing={2} sx={{ pb: 8 }}>
                    {sessions.map((session) => {
                        const isCompleted = session.outputs?.length > 0;
                        return (
                            <Card
                                key={session.id}
                                onClick={() => navigate(`/session/${session.id}`)}
                                sx={{
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    '&:active': { transform: 'scale(0.98)' }
                                }}
                            >
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="h6" noWrap sx={{ pr: 2 }}>
                                            {session.title || 'Untitled Session'}
                                        </Typography>
                                        <Chip
                                            label={isCompleted ? 'Done' : 'In Progress'}
                                            color={isCompleted ? 'success' : 'primary'}
                                            size="small"
                                            variant={isCompleted ? 'filled' : 'outlined'}
                                        />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {session.prompt}
                                    </Typography>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>
            )}

            <Fab
                color="primary"
                aria-label="add"
                onClick={() => navigate('/new')}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    boxShadow: 3
                }}
            >
                <AddIcon />
            </Fab>
        </Box>
    );
};
