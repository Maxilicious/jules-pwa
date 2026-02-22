export const API_BASE = 'https://jules.googleapis.com/v1alpha';

export const getApiKey = () => {
    return import.meta.env.VITE_JULES_API_KEY || '';
};

export const getGitHubPat = () => {
    return import.meta.env.VITE_GITHUB_PAT || '';
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
            automationMode: 'AUTO_CREATE_PR',
        }),
    });
};

export const approvePlan = async (sessionId: string) => {
    return fetchJules(`/sessions/${sessionId}:approvePlan`, {
        method: 'POST',
    });
};

export const listSessionActivities = async (sessionId: string) => {
    return fetchJules(`/sessions/${sessionId}/activities`);
};

export const sendMessage = async (sessionId: string, prompt: string) => {
    return fetchJules(`/sessions/${sessionId}:sendMessage`, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
    });
};

export const mergePullRequest = async (owner: string, repo: string, pullNumber: number) => {
    const pat = getGitHubPat();
    if (!pat) throw new Error('GitHub PAT is missing');

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${pat}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            merge_method: 'squash', // Default to squash merge for cleaner history
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub Error: ${response.status} - ${errorText}`);
    }

    return response.json();
};
