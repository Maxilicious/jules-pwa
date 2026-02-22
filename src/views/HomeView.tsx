import { useEffect, useState } from 'react';
import { Typography, CircularProgress, Box, Card, CardContent, Chip, Fab, Stack, LinearProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { listSessions, listSessionActivities, approvePlan, mergePullRequest } from '../api/client';
import { useNavigate } from 'react-router-dom';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { IconButton, Tooltip, Container, Button } from '@mui/material';
import { useNotifications } from '../hooks/useNotifications';
import { getGitHubPat } from '../api/client';
import { auth, onAuthStateChanged, signOut } from '../firebase';
import LogoutIcon from '@mui/icons-material/Logout';

export const HomeView = () => {
    const [sessions, setSessions] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const navigate = useNavigate();
    const { notify } = useNotifications();

    const fetchSessions = async (isInitial = false) => {
        if (isInitial && sessions.length === 0) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

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

            // Trigger notifications safely outside state setter
            sessionsWithActivities.forEach((s: any) => {
                const isCompleted = s.outputs?.length > 0;
                const needsApproval = s.requirePlanApproval && s.activities?.some((a: any) => a.planGenerated);
                const timestamp = s.updatedAt || s.createdAt;

                if (isCompleted) {
                    notify('Pull Request Ready!', `Jules finished the task: "${s.title || 'Untitled'}".`, `${window.location.origin}/session/${s.id}`, `complete_${s.id}`, timestamp);
                } else if (needsApproval) {
                    notify('Plan Awaiting Approval', `Jules needs your input for session: "${s.title || 'Untitled'}".`, `${window.location.origin}/session/${s.id}`, `approval_${s.id}`, timestamp);
                }
            });
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u: any) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (err: unknown) {
            console.error('Logout failed', err);
        }
    };

    const handleApprove = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        setActionLoading(`approve-${sessionId}`);
        try {
            await approvePlan(sessionId);
            await fetchSessions(false);
        } catch (err: unknown) {
            if (err instanceof Error) alert(`Approval failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleMerge = async (e: React.MouseEvent, sessionId: string, prUrl: string) => {
        e.stopPropagation();
        const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
        if (!match) return alert('Could not parse pull request URL.');

        const [, owner, repo, pullNumber] = match;
        const pat = getGitHubPat();

        if (!pat) {
            return alert('GitHub PAT not found in .env.local');
        }

        setActionLoading(`merge-${sessionId}`);
        try {
            await mergePullRequest(owner, repo, parseInt(pullNumber, 10));
            await fetchSessions(false);
        } catch (err: unknown) {
            if (err instanceof Error) alert(`Merge failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    useEffect(() => {
        fetchSessions(true);
        const interval = setInterval(() => fetchSessions(false), 10000); // refresh dashboard every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <Container maxWidth="md" disableGutters>
            <Box sx={{ pb: 8, px: { xs: 2, sm: 3 }, pt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box
                            component="img"
                            src="/pwa-192x192.png"
                            alt="Jules Logo"
                            sx={{ width: 32, height: 32, mr: 1, borderRadius: 1 }}
                        />
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>
                            Sessions
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title={`Logged in as ${user?.email || 'User'}`}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconButton
                                    color="inherit"
                                    onClick={handleLogout}
                                    sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                                    aria-label="logout"
                                >
                                    <LogoutIcon />
                                </IconButton>
                            </Box>
                        </Tooltip>
                        <Tooltip title="Test Notification">
                            <IconButton
                                color="primary"
                                onClick={() => notify('Notification Test', 'If you see this, Jules notifications are working!', window.location.href)}
                                sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                            >
                                <NotificationsActiveIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>

                {refreshing && (
                    <Box sx={{ width: '100%', position: 'absolute', top: 60, left: 0, zIndex: 1100 }}>
                        <LinearProgress
                            sx={{
                                height: 4,
                                bgcolor: 'rgba(103, 80, 164, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: '#6750A4', // Material Design 3 Primary Purple
                                    borderRadius: 2
                                }
                            }}
                        />
                    </Box>
                )}



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
                            const needsApproval = session.requirePlanApproval && session.activities?.some((a: any) => a.planGenerated);
                            const prOutput = session.outputs?.find((o: any) => o.pullRequest);
                            return (
                                <Card
                                    key={session.id}
                                    onClick={() => navigate(`/session/${session.id}`)}
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s',
                                        '&:active': { transform: 'scale(0.98)' },
                                        maxWidth: '100%',
                                        width: '100%'
                                    }}
                                >
                                    <CardContent sx={{ overflow: 'hidden' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, overflow: 'hidden' }}>
                                            <Typography variant="h6" sx={{ pr: 2, flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {session.title || 'Untitled Session'}
                                            </Typography>
                                            <Chip
                                                label={isCompleted ? 'Done' : needsApproval ? 'Needs Approval' : 'In Progress'}
                                                color={isCompleted ? 'success' : needsApproval ? 'warning' : 'primary'}
                                                size="small"
                                                variant={isCompleted ? 'filled' : 'outlined'}
                                            />
                                        </Box>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 1,
                                                overflowWrap: 'anywhere',
                                                wordBreak: 'break-word',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 1,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {session.prompt}
                                        </Typography>

                                        {(needsApproval || prOutput) && !isCompleted && (
                                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                                                {needsApproval && (
                                                    <Button
                                                        variant="contained"
                                                        color="warning"
                                                        size="small"
                                                        onClick={(e) => handleApprove(e, session.id)}
                                                        disabled={actionLoading === `approve-${session.id}`}
                                                    >
                                                        {actionLoading === `approve-${session.id}` ? 'Approving...' : 'Approve Plan'}
                                                    </Button>
                                                )}
                                                {prOutput && (
                                                    <Button
                                                        variant="contained"
                                                        color="success"
                                                        size="small"
                                                        onClick={(e) => handleMerge(e, session.id, prOutput.pullRequest.url)}
                                                        disabled={actionLoading === `merge-${session.id}`}
                                                    >
                                                        {actionLoading === `merge-${session.id}` ? 'Merging...' : 'Merge PR'}
                                                    </Button>
                                                )}
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
        </Container >
    );
};
