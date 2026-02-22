import { useEffect, useState } from 'react';
import { Typography, CircularProgress, Box, Card, CardContent, Chip, Fab, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { listSessions, listSessionActivities } from '../api/client';
import { useNavigate } from 'react-router-dom';

export const HomeView = () => {
    const [sessions, setSessions] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchSessions = async () => {
        try {
            const res = await listSessions(20);

            // Fetch activities for pending/needs approval sessions to show richer status
            const sessionsWithActivities = await Promise.all(
                (res.sessions || []).map(async (s: any) => {
                    const isCompleted = s.outputs?.length > 0;
                    if (isCompleted) return s;

                    try {
                        const actsRes = await listSessionActivities(s.id);
                        return { ...s, activities: actsRes.activities || [] };
                    } catch (e) {
                        return s;
                    }
                })
            );

            setSessions(sessionsWithActivities);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 10000); // refresh dashboard every 10s
        return () => clearInterval(interval);
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
                                            label={isCompleted ? 'Done' : session.requirePlanApproval && session.activities?.some((a: any) => a.planGenerated) ? 'Needs Approval' : 'In Progress'}
                                            color={isCompleted ? 'success' : session.requirePlanApproval && session.activities?.some((a: any) => a.planGenerated) ? 'warning' : 'primary'}
                                            size="small"
                                            variant={isCompleted ? 'filled' : 'outlined'}
                                        />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
                                        {session.prompt}
                                    </Typography>

                                    {!isCompleted && session.activities && session.activities.length > 0 && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                                            <CircularProgress size={12} />
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {session.activities[session.activities.length - 1].progressUpdated?.title ||
                                                    (session.activities[session.activities.length - 1].planGenerated ? 'Waiting for Plan Approval' : 'Working...')}
                                            </Typography>
                                        </Box>
                                    )}
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
