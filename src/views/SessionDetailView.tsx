import { useEffect, useState, useRef } from 'react';
import { Typography, Box, CircularProgress, Button, Stack, Chip, IconButton, LinearProgress, Container, TextField, InputAdornment, Alert, Snackbar, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
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
            const timestamp = sessionRes.updatedAt || sessionRes.createdAt;

            if (needsApprovalNow) {
                notify('Jules Plan Ready', `Session "${sessionRes.title}" requires your approval.`, window.location.href, `approval_${id}`, timestamp);
            }

            if (sessionRes.outputs && sessionRes.outputs.length > 0) {
                isCompletedRef.current = true;
                notify('Jules Session Complete', `Session "${sessionRes.title}" is finished!`, window.location.href, `complete_${id}`, timestamp);
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
            <Box sx={{ pb: 10, px: { xs: 2, sm: 3 }, pt: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton onClick={() => navigate('/')} sx={{ mr: 1, ml: -1 }} size="small">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1, fontSize: '1.25rem' }}>
                        {session.title || 'Session Details'}
                    </Typography>
                </Box>

                {refreshing && (
                    <Box sx={{ width: '100%', position: 'absolute', top: 60, left: 0, zIndex: 1100 }}>
                        <LinearProgress
                            sx={{
                                height: 3,
                                bgcolor: 'rgba(103, 80, 164, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: '#6750A4',
                                    borderRadius: 2
                                }
                            }}
                        />
                    </Box>
                )}

                <Stack spacing={2.5}>
                    {/* Overview Card */}
                    <Box sx={{
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        p: 2.5,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5, lineHeight: 1 }}>
                                Overview
                            </Typography>
                            <Chip
                                label={hasOutputs ? 'Completed' : needsApproval ? 'Needs Approval' : 'In Progress'}
                                color={hasOutputs ? 'success' : needsApproval ? 'warning' : 'primary'}
                                variant={hasOutputs ? 'filled' : 'outlined'}
                                size="small"
                                sx={{ fontWeight: 600, height: 24, fontSize: '0.75rem', borderRadius: 1 }}
                            />
                        </Box>

                        <Typography variant="body2" sx={{
                            whiteSpace: 'pre-wrap',
                            color: 'text.primary',
                            fontWeight: 600,
                            lineHeight: 1.5,
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
                                variant="text"
                                onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                                sx={{ mt: 1.5, p: 0, minWidth: 'auto', textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                                {isPromptExpanded ? 'Show less' : 'Show more'}
                            </Button>
                        )}
                    </Box>

                    {/* Needs Approval Card */}
                    {needsApproval && (
                        <Box sx={{
                            bgcolor: 'warning.light',
                            color: 'warning.contrastText',
                            p: 2.5,
                            borderRadius: 1,
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            justifyContent: 'space-between',
                            gap: 2,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Plan Needs Approval</Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                                    Jules has created a plan and requires your explicit approval to proceed.
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                color="warning"
                                size="small"
                                onClick={handleApprove}
                                disabled={approving}
                                startIcon={approving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon fontSize="small" />}
                                sx={{ whiteSpace: 'nowrap', boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
                            >
                                Approve Plan
                            </Button>
                        </Box>
                    )}

                    {/* Outputs / Ready to Merge Card */}
                    {hasOutputs && (
                        <Box sx={{
                            bgcolor: 'background.paper',
                            p: 2.5,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderLeft: '4px solid',
                            borderLeftColor: 'success.main',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <CheckCircleIcon color="success" fontSize="small" />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>Ready to Merge</Typography>
                            </Box>

                            <Stack spacing={2.5}>
                                {session.outputs.map((out: Record<string, any>, i: number) => {
                                    if (out.pullRequest) {
                                        return (
                                            <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5, lineHeight: 1.3 }}>
                                                    {out.pullRequest.title}
                                                </Typography>
                                                <Box sx={{
                                                    color: 'text.secondary',
                                                    fontSize: '0.85rem',
                                                    lineHeight: 1.6,
                                                    '& p': { mb: 1.5, mt: 0 },
                                                    '& ul, & ol': { pl: 2.5, mt: 0.5, mb: 1.5, '& li': { mb: 0.5 } },
                                                    '& strong': { color: 'text.primary', fontWeight: 600 },
                                                    '& code': { bgcolor: 'action.hover', px: 0.6, py: 0.2, borderRadius: 1, fontSize: '0.75rem', fontFamily: 'monospace' },
                                                    '& hr': { my: 2, borderColor: 'divider', borderStyle: 'dashed' },
                                                    '& h1, & h2, & h3, & h4, & h5, & h6': { color: 'text.primary', fontWeight: 600, mt: 2.5, mb: 1 },
                                                    '& h1': { fontSize: '1.2rem', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 },
                                                    '& h2': { fontSize: '1.1rem', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 },
                                                    '& h3': { fontSize: '1rem' },
                                                }}>
                                                    <ReactMarkdown>{out.pullRequest.description || ''}</ReactMarkdown>
                                                </Box>

                                                <Divider sx={{ my: 0.5, borderColor: 'divider', borderStyle: 'dashed' }} />

                                                <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                                                    <Button
                                                        variant="contained"
                                                        onClick={() => window.open(out.pullRequest.url, '_blank')}
                                                        sx={{
                                                            borderRadius: 1,
                                                            fontWeight: 600,
                                                            textTransform: 'none',
                                                            bgcolor: '#6750A4',
                                                            color: 'white',
                                                            flex: 1,
                                                            py: 1.5,
                                                            boxShadow: 'none',
                                                            '&:hover': { bgcolor: '#553d8f', boxShadow: 'none' }
                                                        }}
                                                    >
                                                        View on Github
                                                    </Button>

                                                    <Button
                                                        variant="contained"
                                                        disabled={merging || mergeSuccess}
                                                        onClick={() => handleMerge(out.pullRequest.url)}
                                                        sx={{
                                                            borderRadius: 1,
                                                            fontWeight: 600,
                                                            textTransform: 'none',
                                                            bgcolor: mergeSuccess ? '#6750A4' : '#2e7d32', // Success green for merge
                                                            color: 'white!important',
                                                            flex: 1,
                                                            py: 1.5,
                                                            boxShadow: 'none',
                                                            '&:hover': {
                                                                bgcolor: mergeSuccess ? '#553d8f' : '#1b5e20',
                                                                boxShadow: 'none'
                                                            },
                                                            '&.Mui-disabled': {
                                                                bgcolor: mergeSuccess ? '#6750A4' : '#2e7d32',
                                                                color: 'white',
                                                                opacity: 0.8
                                                            }
                                                        }}
                                                    >
                                                        {merging ? 'Merging...' : mergeSuccess ? 'Merged' : 'Merge'}
                                                    </Button>
                                                </Stack>

                                                {mergeError && (
                                                    <Alert severity="error" icon={false} sx={{ mt: 1.5, py: 0, px: 1.5, borderRadius: 2, '& .MuiAlert-message': { fontSize: '0.75rem', p: 1 } }}>
                                                        {mergeError}
                                                    </Alert>
                                                )}
                                            </Box>
                                        );
                                    } else {
                                        return (
                                            <Typography key={i} variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                                                Work completed: {out.title || 'Artifact generated'}
                                            </Typography>
                                        );
                                    }
                                })}

                                <Snackbar
                                    open={mergeSuccess}
                                    autoHideDuration={6000}
                                    onClose={() => setMergeSuccess(false)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                                >
                                    <Alert onClose={() => setMergeSuccess(false)} severity="success" sx={{ width: '100%', borderRadius: 2, fontSize: '0.85rem' }}>
                                        Pull request successfully merged!
                                    </Alert>
                                </Snackbar>

                                {!session.outputs.some((o: any) => o.pullRequest) && (
                                    <Box sx={{ mt: 1, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                                        <Typography variant="caption" sx={{ mb: 1.5, display: 'block', color: 'text.secondary' }}>
                                            No pull request was created automatically.
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleRequestPR}
                                            disabled={sending}
                                            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <OpenInNewIcon fontSize="small" />}
                                            sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none', color: 'text.secondary', borderColor: 'divider' }}
                                        >
                                            Request PR
                                        </Button>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    )}

                    {/* Activity Section */}
                    {!hasOutputs && (
                        <Box sx={{ flexGrow: 1, minHeight: 0, mt: 1 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5, mb: 1.5, display: 'block' }}>
                                Activity Log
                            </Typography>
                            <Stack spacing={1.5} sx={{ mb: 12 }}>
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
                                                    bgcolor: item.isUser ? 'primary.main' : (item.planGenerated ? 'warning.50' : 'background.paper'),
                                                    color: item.isUser ? 'primary.contrastText' : (item.planGenerated ? 'warning.dark' : 'text.primary'),
                                                    px: 2,
                                                    py: 1.5,
                                                    borderRadius: item.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                    border: '1px solid',
                                                    borderColor: item.isUser ? 'primary.main' : (item.planGenerated ? 'warning.300' : 'divider'),
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                                    overflowWrap: 'anywhere',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'pre-wrap',
                                                }}>
                                                    <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: (item.planGenerated || item.planApproved) ? 500 : 400, lineHeight: 1.5 }}>
                                                        {item.text}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    }

                                    const showSpinner = item.isLatest && !hasOutputs && !needsApproval;

                                    return (
                                        <Box key={item.id || i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, opacity: 0.7 }}>
                                            {showSpinner ? <CircularProgress size={12} sx={{ color: 'text.secondary' }} /> : <Box sx={{ width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', fontSize: '0.85rem' }}>•</Box>}
                                            <Typography variant="caption" sx={{ color: 'text.secondary', overflowWrap: 'anywhere', wordBreak: 'break-word', lineHeight: 1.3 }}>
                                                {item.text}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                                <div ref={messagesEndRef} />
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
