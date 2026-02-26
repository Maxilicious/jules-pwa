import { useEffect, useState } from 'react';
import { Typography, CircularProgress, Box, Card, CardContent, Chip, Stack, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import {
    IconButton, Tooltip, Container, Button,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { useNotifications } from '../hooks/useNotifications';
import {
    listSessions, listSessionActivities, approvePlan,
    mergePullRequest, checkPullRequestMerged, getGitHubPat, deleteSession
} from '../api/client';
import { auth, onAuthStateChanged, signOut } from '../firebase';
import LogoutIcon from '@mui/icons-material/Logout';

const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const HomeView = () => {
    const [sessions, setSessions] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
    const [longPressTimer, setLongPressTimer] = useState<any>(null);
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
                    let isMerged = false;
                    const prOutput = s.outputs?.find((o: any) => o.pullRequest);

                    if (prOutput) {
                        const match = prOutput.pullRequest.url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
                        if (match) {
                            const [, owner, repo, pullNumber] = match;
                            try {
                                isMerged = await checkPullRequestMerged(owner, repo, parseInt(pullNumber, 10));
                            } catch (e) { }
                        }
                    }

                    if (isCompleted) return { ...s, isMerged };

                    try {
                        const actsRes = await listSessionActivities(s.id);
                        return { ...s, activities: actsRes.activities || [], isMerged };
                    } catch (e) {
                        return { ...s, isMerged };
                    }
                })
            );

            setSessions(sessionsWithActivities);

            // Trigger notifications safely outside state setter
            sessionsWithActivities.forEach((s: any) => {
                const isCompleted = s.outputs?.length > 0;
                const needsApproval = s.requirePlanApproval && s.activities?.some((a: any) => a.planGenerated);
                const timestamp = s.updateTime || s.createTime;

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

    const handleDeleteSession = async () => {
        if (!sessionToDelete) return;

        setActionLoading(`delete-${sessionToDelete}`);
        try {
            await deleteSession(sessionToDelete);
            setSessions(sessions.filter(s => s.id !== sessionToDelete));
            setDeleteConfirmOpen(false);
            setSessionToDelete(null);
        } catch (err: unknown) {
            if (err instanceof Error) alert(`Delete failed: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const startLongPress = (sessionId: string) => {
        const timer = setTimeout(() => {
            if ('vibrate' in navigator) navigator.vibrate(50);
            setSessionToDelete(sessionId);
            setDeleteConfirmOpen(true);
        }, 600);
        setLongPressTimer(timer);
    };

    const stopLongPress = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
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
                    <Stack spacing={2} sx={{ pb: 12 }}> {/* Increased padding for sticky floor */}
                        {sessions.map((session) => {
                            const isCompleted = session.outputs?.length > 0;
                            const needsApproval = session.requirePlanApproval && session.activities?.some((a: any) => a.planGenerated);
                            const prOutput = session.outputs?.find((o: any) => o.pullRequest);
                            return (
                                <Card
                                    key={session.id}
                                    onClick={() => navigate(`/session/${session.id}`)}
                                    onMouseDown={() => startLongPress(session.id)}
                                    onMouseUp={stopLongPress}
                                    onMouseLeave={stopLongPress}
                                    onTouchStart={() => startLongPress(session.id)}
                                    onTouchEnd={stopLongPress}
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s',
                                        '&:active': { transform: 'scale(0.98)' },
                                        maxWidth: '100%',
                                        width: '100%',
                                        borderRadius: 1,
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <CardContent sx={{ pb: '16px !important', display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography
                                                variant="body2"
                                                color="text.primary"
                                                sx={{
                                                    overflowWrap: 'anywhere',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-wrap',
                                                    lineHeight: 1.5,
                                                    fontWeight: 600,
                                                    mb: 0.25
                                                }}
                                            >
                                                {session.title || session.prompt || 'Untitled Session'}
                                            </Typography>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.8 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                    {session.sourceContext?.source ? session.sourceContext.source.split('/').pop() : 'Unknown Repo'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                    •
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatRelativeTime(session.createTime)}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                        <Box onClick={(e) => e.stopPropagation()} sx={{ flexShrink: 0 }}>
                                            {isCompleted ? (
                                                prOutput ? (
                                                    session.isMerged ? (
                                                        <Button
                                                            variant="contained"
                                                            disabled
                                                            sx={{ borderRadius: 1, textTransform: 'none', bgcolor: '#6750A4', color: 'white!important', '&.Mui-disabled': { bgcolor: '#6750A4', color: 'white', opacity: 0.8 } }}
                                                        >
                                                            Merged
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="contained"
                                                            onClick={(e) => handleMerge(e, session.id, prOutput.pullRequest.url)}
                                                            disabled={actionLoading === `merge-${session.id}`}
                                                            sx={{
                                                                borderRadius: 1,
                                                                textTransform: 'none',
                                                                bgcolor: '#2e7d32',
                                                                color: 'white!important',
                                                                fontWeight: 600,
                                                                '&:hover': { bgcolor: '#1b5e20' },
                                                                '&.Mui-disabled': { bgcolor: '#2e7d32', opacity: 0.6, color: 'white' }
                                                            }}
                                                        >
                                                            {actionLoading === `merge-${session.id}` ? 'Merging...' : 'Merge'}
                                                        </Button>
                                                    )
                                                ) : (
                                                    <Button variant="contained" disabled sx={{ borderRadius: 1, textTransform: 'none' }}>Done</Button>
                                                )
                                            ) : needsApproval ? (
                                                <Button
                                                    variant="contained"
                                                    color="warning"
                                                    onClick={(e) => handleApprove(e, session.id)}
                                                    disabled={actionLoading === `approve-${session.id}`}
                                                    sx={{ borderRadius: 1, textTransform: 'none' }}
                                                >
                                                    {actionLoading === `approve-${session.id}` ? 'Approving...' : 'Approve'}
                                                </Button>
                                            ) : (
                                                <Chip label="In Progress" color="primary" variant="outlined" size="small" sx={{ borderRadius: '4px' }} />
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Stack>
                )}

                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 2,
                        bgcolor: 'background.default',
                        zIndex: 1000
                    }}
                >
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => navigate('/new')}
                        sx={{
                            height: 60,
                            bgcolor: '#6750A4',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 600,
                            borderRadius: 1,
                            textTransform: 'none',
                            '&:hover': {
                                bgcolor: '#553d8f'
                            }
                        }}
                    >
                        + New Session
                    </Button>
                </Box>
            </Box>

            <Dialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                PaperProps={{
                    sx: { borderRadius: 1 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Session?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will permanently delete this session. This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button
                        onClick={() => setDeleteConfirmOpen(false)}
                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteSession}
                        color="error"
                        variant="contained"
                        disabled={actionLoading?.startsWith('delete-')}
                        sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
                    >
                        {actionLoading?.startsWith('delete-') ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container >
    );
};
