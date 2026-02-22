import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    TextField,
    DialogActions,
    Button,
} from '@mui/material';

interface AuthDialogProps {
    open: boolean;
    onSave: (key: string) => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ open, onSave }) => {
    const [apiKey, setApiKey] = useState('');

    const handleSave = () => {
        if (apiKey.trim()) {
            onSave(apiKey.trim());
        }
    };

    return (
        <Dialog open={open} disableEscapeKeyDown>
            <DialogTitle>Welcome to Jules PWA</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    To use this app, you need a Jules API key. It will be stored securely in your browser's local storage.
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    id="apiKey"
                    label="API Key (e.g., AQ...)"
                    type="password"
                    fullWidth
                    variant="outlined"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleSave} variant="contained" disabled={!apiKey.trim()}>
                    Save Key
                </Button>
            </DialogActions>
        </Dialog>
    );
};
