import { useState } from 'react';
import { getApiKey, setApiKey } from './client';

export const useAuth = () => {
    // getApiKey returns synchronously from localStorage, so we set it as the initial state
    const [apiKey, setAuthKey] = useState<string | null>(getApiKey() || null);
    // Because we just read straight from localStorage, it is ready immediately on mount
    const [isReady] = useState(true);

    const saveKey = (key: string) => {
        setApiKey(key);
        setAuthKey(key);
    };

    const clearKey = () => {
        localStorage.removeItem('jules_api_key');
        setAuthKey(null);
    };

    return { apiKey, isReady, saveKey, clearKey };
};
