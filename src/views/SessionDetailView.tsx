import { useEffect, useState } from 'react';
import { Typography, Box, CircularProgress, Button, Stack, Chip, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, approvePlan } from '../api/client';

export const SessionDetailView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [approving, setApproving] = useState(false);

    const fetchSession = async () => {
        if (!id) return;
        try {
            const res = await getSession(id);
            setSession(res);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSession();
        // Simple polling every 5s if not completed and we are on this view
        const interval = setInterval(() => {
            if (session && session.outputs?.length === 0) {
                fetchSession();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [id, session?.outputs?.length]);

    const handleApprove = async () => {
        if (!id) return;
        setApproving(true);
        try {
            await approvePlan(id);
            await fetchSession();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Approval failed: ${err.message}`);
            }
        } finally {
            setApproving(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!session) return <Typography>Session not found</Typography>;

    const hasOutputs = session.outputs && session.outputs.length > 0;
    // This depends on how Jules API marks 'needs approval'. 
    // Assuming a field `state` or `planPendingApproval` exists. Fallback heuristic:
    const needsApproval = session.requirePlanApproval && !hasOutputs;

    return (
        <Box sx={{ pb: 8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={() => navigate('/')} sx={{ mr: 1, ml: -1 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" sx={{ fontWeight: 500 }} noWrap>
                    {session.title || 'Session Details'}
                </Typography>
            </Box>

            <Stack spacing={3}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Status
                    </Typography>
                    <Chip
                        label={hasOutputs ? 'Completed' : needsApproval ? 'Needs Approval' : 'In Progress'}
                        color={hasOutputs ? 'success' : needsApproval ? 'warning' : 'primary'}
                        variant={hasOutputs ? 'filled' : 'outlined'}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Prompt
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'background.paper', p: 2, borderRadius: 2 }}>
                        {session.prompt}
                    </Typography>
                </Box>

                {needsApproval && (
                    <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 3, textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>Plan Needs Approval</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Jules has created a plan and requires your explicit approval to proceed.
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleApprove}
                            disabled={approving}
                            startIcon={approving ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                        >
                            Approve Plan
                        </Button>
                    </Box>
                )}

                {hasOutputs && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Outputs
                        </Typography>
                        <Stack spacing={2}>
                            {session.outputs.map((out: Record<string, any>, i: number) => (
                                out.pullRequest ? (
                                    <Box key={i} sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography variant="subtitle1">{out.pullRequest.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">{out.pullRequest.description}</Typography>
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            endIcon={<OpenInNewIcon />}
                                            onClick={() => window.open(out.pullRequest.url, '_blank')}
                                            sx={{ mt: 1 }}
                                        >
                                            View Pull Request
                                        </Button>
                                    </Box>
                                ) : null
                            ))}
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Box>
    );
};
