import React, { useState, useEffect } from 'react';
import {
    Typography, Box, TextField, Button, MenuItem,
    CircularProgress, Stack, FormControlLabel, Switch
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { listSources, createSession } from '../api/client';
import { generateTitle, polishPrompt } from '../utils/gemini';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

export const CreateSessionView = () => {
    const [sources, setSources] = useState<Record<string, any>[]>([]);
    const [loadingSources, setLoadingSources] = useState(true);

    const [selectedSource, setSelectedSource] = useState('');
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [requireApproval, setRequireApproval] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const res = await listSources();
                setSources(res.sources || []);

                const lastSource = localStorage.getItem('last_selected_source');
                if (lastSource && res.sources?.some((s: any) => s.name === lastSource)) {
                    setSelectedSource(lastSource);
                } else if (res.sources?.length > 0) {
                    setSelectedSource(res.sources[0].name);
                }
            } catch {
                setError('Failed to load sources.');
            } finally {
                setLoadingSources(false);
            }
        };
        fetchSources();
    }, []);

    const handlePolish = async () => {
        if (!prompt || isPolishing) return;
        setIsPolishing(true);
        setError('');
        try {
            const polished = await polishPrompt(prompt);
            setPrompt(polished);
        } catch (err: unknown) {
            setError('Failed to polish prompt.');
        } finally {
            setIsPolishing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSource || !prompt) return;

        setIsSubmitting(true);
        setError('');

        try {
            let finalTitle = title;
            if (!finalTitle) {
                finalTitle = await generateTitle(prompt);
            }

            localStorage.setItem('last_selected_source', selectedSource);

            const res = await createSession(selectedSource, prompt, finalTitle || prompt, requireApproval);
            navigate(`/session/${res.id}`);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            }
            setIsSubmitting(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                New Session
            </Typography>

            {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

            <form onSubmit={handleSubmit} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack spacing={3} sx={{ flexGrow: 1, mt: 2 }}>

                    <TextField
                        select
                        label="Source Repository"
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        fullWidth
                        disabled={loadingSources}
                        required
                        helperText={loadingSources ? 'Loading sources...' : ''}
                    >
                        {sources.map((s) => (
                            <MenuItem key={s.name} value={s.name}>
                                {s.githubRepo?.owner}/{s.githubRepo?.repo}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        label="Session Title (Optional)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                    />

                    <Box sx={{ position: 'relative' }}>
                        <TextField
                            label="Prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            multiline
                            rows={6}
                            fullWidth
                            required
                            placeholder="e.g. Implement a new login screen..."
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1
                                }
                            }}
                        />
                        <Button
                            size="small"
                            variant="text"
                            onClick={handlePolish}
                            disabled={!prompt || isPolishing || isSubmitting}
                            startIcon={isPolishing ? <CircularProgress size={16} /> : <AutoFixHighIcon fontSize="small" />}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                textTransform: 'none',
                                fontWeight: 600,
                                color: '#6750A4',
                                borderRadius: 1,
                                '&:hover': { bgcolor: 'rgba(103, 80, 164, 0.04)' }
                            }}
                        >
                            {isPolishing ? 'Polishing...' : 'Polish'}
                        </Button>
                    </Box>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={requireApproval}
                                onChange={(e) => setRequireApproval(e.target.checked)}
                            />
                        }
                        label="Require manual plan approval"
                    />

                </Stack>

                <Box sx={{ mt: 'auto', pt: 4, display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => navigate('/')}
                        disabled={isSubmitting}
                        sx={{
                            borderRadius: 1, // MD3 Rectangular
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={isSubmitting || !selectedSource || !prompt}
                        sx={{
                            height: 56,
                            bgcolor: '#6750A4',
                            color: 'white',
                            borderRadius: 1, // MD3 Rectangular
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': { bgcolor: '#553d8f' },
                            '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
                        }}
                    >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create Session'}
                    </Button>
                </Box>
            </form>
        </Box>
    );
};
