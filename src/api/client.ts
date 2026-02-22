export const API_BASE = 'https://jules.googleapis.com/v1alpha';

export const getApiKey = () => {
    return localStorage.getItem('jules_api_key') || '';
};

export const setApiKey = (key: string) => {
    localStorage.setItem('jules_api_key', key);
};

export const hasApiKey = () => {
    return !!getApiKey();
};

const fetchJules = async (endpoint: string, options: RequestInit = {}) => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API Key is missing');
    }

    const headers = new Headers(options.headers);
    headers.set('X-Goog-Api-Key', apiKey);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
};

export const listSources = async () => {
    return fetchJules('/sources');
};

export const listSessions = async (pageSize = 10) => {
    return fetchJules(`/sessions?pageSize=${pageSize}`);
};

export const getSession = async (sessionId: string) => {
    return fetchJules(`/sessions/${sessionId}`);
};

export const createSession = async (
    source: string,
    prompt: string,
    title: string,
    requirePlanApproval = false
) => {
    return fetchJules('/sessions', {
        method: 'POST',
        body: JSON.stringify({
            prompt,
            title,
            sourceContext: {
                source,
                githubRepoContext: {
                    startingBranch: 'main',
                },
            },
            requirePlanApproval,
        }),
    });
};

export const approvePlan = async (sessionId: string) => {
    return fetchJules(`/sessions/${sessionId}:approvePlan`, {
        method: 'POST',
    });
};
