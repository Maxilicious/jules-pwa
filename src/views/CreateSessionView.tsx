import React, { useState, useEffect } from 'react';
import {
    Typography, Box, TextField, Button, MenuItem,
    CircularProgress, Stack, FormControlLabel, Switch
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { listSources, createSession } from '../api/client';

export const CreateSessionView = () => {
    const [sources, setSources] = useState<Record<string, any>[]>([]);
    const [loadingSources, setLoadingSources] = useState(true);

    const [selectedSource, setSelectedSource] = useState('');
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [requireApproval, setRequireApproval] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const res = await listSources();
                setSources(res.sources || []);
                if (res.sources?.length > 0) {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSource || !prompt) return;

        setIsSubmitting(true);
        setError('');

        try {
            const res = await createSession(selectedSource, prompt, title, requireApproval);
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

                    <TextField
                        label="Prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        multiline
                        rows={4}
                        fullWidth
                        required
                        placeholder="e.g. Implement a new login screen..."
                    />

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
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={isSubmitting || !selectedSource || !prompt}
                    >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create'}
                    </Button>
                </Box>
            </form>
        </Box>
    );
};
