import { useEffect, useState, useRef } from 'react';
import { Typography, Box, CircularProgress, Button, Stack, Chip, IconButton, LinearProgress, Container, TextField, InputAdornment, Alert, Snackbar } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import { useParams, useNavigate } from 'react-router-dom';
import { getSession, approvePlan, listSessionActivities, sendMessage, mergePullRequest, getGitHubPat } from '../api/client';
import { useNotifications } from '../hooks/useNotifications';

export const SessionDetailView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { notify } = useNotifications();

    // State
    const [session, setSession] = useState<Record<string, any> | null>(null);
    const [activities, setActivities] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [approving, setApproving] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [sending, setSending] = useState(false);
    const [merging, setMerging] = useState(false);
    const [mergeSuccess, setMergeSuccess] = useState(false);
    const [mergeError, setMergeError] = useState('');
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const notifiedNeedsApproval = useRef(false);
    const notifiedComplete = useRef(false);
    const isCompletedRef = useRef(false);
    const sessionRef = useRef<Record<string, any> | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activities.length]);

    const fetchSessionData = async (isInitial = false) => {
        if (!id) return;

        if (isInitial && !sessionRef.current) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            const [sessionRes, activitiesRes] = await Promise.all([
                getSession(id),
                listSessionActivities(id).catch(() => ({ activities: [] }))
            ]);

            setSession(sessionRes);
            sessionRef.current = sessionRes;

            const acts = activitiesRes.activities || [];

            const needsApprovalNow = sessionRes.requirePlanApproval && sessionRes.outputs?.length === 0 && acts.some((a: any) => a.planGenerated);

            if (needsApprovalNow && !notifiedNeedsApproval.current) {
                notify('Jules Plan Ready', `Session "${sessionRes.title}" requires your approval.`, window.location.href);
                notifiedNeedsApproval.current = true;
            }

            if (sessionRes.outputs && sessionRes.outputs.length > 0) {
                isCompletedRef.current = true;
                if (!notifiedComplete.current) {
                    notify('Jules Session Complete', `Session "${sessionRes.title}" is finished!`, window.location.href);
                    notifiedComplete.current = true;
                }
            }

            setActivities(acts);
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
        fetchSessionData(true);
        const interval = setInterval(() => {
            if (!isCompletedRef.current) {
                fetchSessionData(false); // Call without recreating closure issues
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [id]);

    const handleApprove = async () => {
        if (!id) return;
        setApproving(true);
        try {
            await approvePlan(id);
            await fetchSessionData(false);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Approval failed: ${err.message}`);
            }
        } finally {
            setApproving(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !chatInput.trim() || sending) return;

        setSending(true);
        try {
            await sendMessage(id, chatInput.trim());
            setChatInput('');
            await fetchSessionData(false);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Message failed: ${err.message}`);
            }
        } finally {
            setSending(false);
        }
    };

    const handleRequestPR = async () => {
        if (!id || sending) return;
        setSending(true);
        try {
            await sendMessage(id, "Please create a GitHub pull request for these changes.");
            await fetchSessionData(false);
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(`Request failed: ${err.message}`);
            }
        } finally {
            setSending(false);
        }
    };

    const handleMerge = async (prUrl: string) => {
        if (merging) return;

        const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
        if (!match) {
            setMergeError('Could not parse pull request URL.');
            return;
        }

        const [, owner, repo, pullNumber] = match;
        const pat = getGitHubPat();

        if (!pat) {
            setMergeError('Please set your GitHub PAT in the Home settings first.');
            return;
        }

        setMerging(true);
        setMergeError('');
        try {
            await mergePullRequest(owner, repo, parseInt(pullNumber, 10));
            setMergeSuccess(true);
            await fetchSessionData(false);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setMergeError(err.message);
            }
        } finally {
            setMerging(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Typography color="error">{error}</Typography>;
    if (!session) return <Typography>Session not found</Typography>;

    const hasOutputs = session.outputs && session.outputs.length > 0;
    const needsApproval = session.requirePlanApproval && !hasOutputs;

    return (
        <Container maxWidth="md" disableGutters>
            <Box sx={{ pb: 8, px: { xs: 2, sm: 3 }, pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton onClick={() => navigate('/')} sx={{ mr: 1, ml: -1 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h5" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>
                        {session.title || 'Session Details'}
                    </Typography>
                </Box>

                {refreshing && (
                    <Box sx={{ width: '100%', position: 'absolute', top: 60, left: 0, zIndex: 1100 }}>
                        <LinearProgress
                            sx={{
                                height: 4,
                                bgcolor: 'rgba(103, 80, 164, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: '#6750A4',
                                    borderRadius: 2
                                }
                            }}
                        />
                    </Box>
                )}

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
                        <Box sx={{ position: 'relative', bgcolor: 'background.paper', borderRadius: 2, p: 2 }}>
                            <Typography variant="body1" sx={{
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'anywhere',
                                wordBreak: 'break-word',
                                display: '-webkit-box',
                                WebkitLineClamp: isPromptExpanded ? 'unset' : 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {session.prompt}
                            </Typography>
                            {session.prompt && session.prompt.length > 250 && (
                                <Button
                                    size="small"
                                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                                    sx={{ mt: 1, textTransform: 'none' }}
                                >
                                    {isPromptExpanded ? 'Show less' : 'Show more'}
                                </Button>
                            )}
                        </Box>
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

                    {!hasOutputs && (
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Conversation & Activity
                            </Typography>
                            <Stack spacing={2} sx={{ mb: 10 }}>
                                {activities.reduce((acc: any[], act, i) => {
                                    const isUser = act.originator === 'user';
                                    const isAgentMsg = !!act.agentMessage;
                                    const isUserMsg = !!act.userMessage;

                                    let text = (act.agentMessage || act.userMessage)?.prompt || act.progressUpdated?.title;
                                    let isSystemEvent = !isAgentMsg && !isUserMsg;

                                    if (isSystemEvent && (!text || text === 'System Event' || text === 'System event')) return acc;

                                    if (act.planGenerated) {
                                        text = "Jules generated a plan and is waiting for your approval.";
                                        isSystemEvent = false;
                                    } else if (act.planApproved) {
                                        text = "Plan approved. Jules is proceeding...";
                                        isSystemEvent = false;
                                    }

                                    if (isSystemEvent && acc.length > 0) {
                                        const prev = acc[acc.length - 1];
                                        if (prev.isSystemEvent && prev.text === text) {
                                            return acc;
                                        }
                                    }

                                    acc.push({ ...act, text, isSystemEvent, isUser, isLatest: i === activities.length - 1 });
                                    return acc;
                                }, []).map((item, i) => {
                                    if (!item.isSystemEvent) {
                                        return (
                                            <Box key={item.id || i} sx={{
                                                display: 'flex',
                                                justifyContent: item.isUser ? 'flex-end' : 'flex-start',
                                                width: '100%'
                                            }}>
                                                <Box sx={{
                                                    maxWidth: '85%',
                                                    bgcolor: item.isUser ? 'primary.main' : (item.planGenerated ? 'warning.main' : 'background.paper'),
                                                    color: item.isUser ? 'primary.contrastText' : (item.planGenerated ? 'warning.contrastText' : 'text.primary'),
                                                    p: 2,
                                                    borderRadius: item.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                    boxShadow: 1,
                                                    overflowWrap: 'anywhere',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-wrap',
                                                    border: item.planGenerated ? '2px solid' : 'none',
                                                    borderColor: 'warning.light'
                                                }}>
                                                    <Typography variant="body2" sx={{ fontWeight: (item.planGenerated || item.planApproved) ? 600 : 400 }}>
                                                        {item.text}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    }

                                    const showSpinner = item.isLatest && !hasOutputs && !needsApproval;

                                    return (
                                        <Box key={item.id || i} sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'background.paper', p: 1.5, borderRadius: 2, opacity: 0.8 }}>
                                            {showSpinner ? <CircularProgress size={16} /> : <Box sx={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', fontSize: '1.2rem' }}>•</Box>}
                                            <Typography variant="body2" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                                {item.text}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </Stack>
                        </Box>
                    )}

                    {hasOutputs && (
                        <Box sx={{
                            bgcolor: 'background.paper',
                            p: 3,
                            borderRadius: 4,
                            mb: 2,
                            boxShadow: 2,
                            borderTop: '6px solid',
                            borderColor: 'success.main'
                        }}>
                            <Stack spacing={3}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'success.main' }}>
                                    <CheckCircleIcon fontSize="medium" />
                                    <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 700 }}>Ready to Merge</Typography>
                                </Box>

                                {session.outputs.map((out: Record<string, any>, i: number) => {
                                    if (out.pullRequest) {
                                        return (
                                            <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                    {out.pullRequest.title}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                                                    {out.pullRequest.description}
                                                </Typography>

                                                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                                    <Button
                                                        variant="outlined"
                                                        color="inherit"
                                                        fullWidth
                                                        size="large"
                                                        startIcon={<OpenInNewIcon />}
                                                        onClick={() => window.open(out.pullRequest.url, '_blank')}
                                                        sx={{
                                                            borderRadius: 3,
                                                            fontWeight: 600,
                                                            textTransform: 'none',
                                                            borderColor: 'divider',
                                                            color: 'text.primary'
                                                        }}
                                                    >
                                                        View on GitHub
                                                    </Button>

                                                    <Button
                                                        variant="contained"
                                                        color="success"
                                                        fullWidth
                                                        size="large"
                                                        disabled={merging || mergeSuccess}
                                                        startIcon={merging ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                                                        onClick={() => handleMerge(out.pullRequest.url)}
                                                        sx={{
                                                            borderRadius: 3,
                                                            fontWeight: 600,
                                                            textTransform: 'none',
                                                            boxShadow: 'none',
                                                            '&:hover': { boxShadow: 'none' }
                                                        }}
                                                    >
                                                        {mergeSuccess ? 'Merged!' : 'Merge Now'}
                                                    </Button>
                                                </Stack>

                                                {mergeError && (
                                                    <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                                                        {mergeError}
                                                    </Alert>
                                                )}
                                            </Box>
                                        );
                                    } else {
                                        return (
                                            <Typography key={i} variant="body2" sx={{ color: 'text.secondary' }}>
                                                Work completed: {out.title || 'Artifact generated'}
                                            </Typography>
                                        );
                                    }
                                })}

                                <Snackbar
                                    open={mergeSuccess}
                                    autoHideDuration={6000}
                                    onClose={() => setMergeSuccess(false)}
                                >
                                    <Alert onClose={() => setMergeSuccess(false)} severity="success" sx={{ width: '100%' }}>
                                        Pull request successfully merged!
                                    </Alert>
                                </Snackbar>

                                {!session.outputs.some((o: any) => o.pullRequest) && (
                                    <Box sx={{ mt: 1, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                                            No pull request was created automatically.
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            onClick={handleRequestPR}
                                            disabled={sending}
                                            startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <OpenInNewIcon />}
                                            sx={{ borderRadius: 3, fontWeight: 600, textTransform: 'none' }}
                                        >
                                            Request GitHub PR from Jules
                                        </Button>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    )}
                </Stack>

                {!hasOutputs && (
                    <Box
                        component="form"
                        onSubmit={handleSendMessage}
                        sx={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            p: 2,
                            bgcolor: 'background.default',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            zIndex: 10
                        }}
                    >
                        <Container maxWidth="md" disableGutters>
                            <TextField
                                fullWidth
                                size="medium"
                                placeholder="Type a message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                disabled={sending}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton type="submit" disabled={!chatInput.trim() || sending} color="primary">
                                                    {sending ? <CircularProgress size={24} /> : <SendIcon />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 4,
                                        bgcolor: 'background.paper'
                                    }
                                }}
                            />
                        </Container>
                    </Box>
                )}
            </Box>
        </Container>
    );
};
