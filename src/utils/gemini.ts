const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const AI_MODEL = "gemini-3-flash-preview";

export async function generateTitle(prompt: string): Promise<string> {
    if (!API_KEY) {
        console.warn("Gemini API Key missing");
        return "";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${API_KEY}`;
    const payload = {
        "contents": [{
            "parts": [{
                "text": `Generate a very short, descriptive title (maximum 5-6 words) for a coding session based on this user prompt: "${prompt}". Return ONLY the title, no quotes or prefix.`
            }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const json = await response.json();
            const title = json.candidates[0].content.parts[0].text.trim();
            // Remove any potential quotes that Gemini might add
            return title.replace(/^["']|["']$/g, '');
        } else {
            console.warn("Gemini API Error:", response.status);
            return "";
        }
    } catch (e) {
        console.warn("Gemini Exception:", e);
        return "";
    }
}

export async function polishPrompt(prompt: string): Promise<string> {
    if (!API_KEY) {
        console.warn("Gemini API Key missing");
        return prompt;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${API_KEY}`;
    const payload = {
        "contents": [{
            "parts": [{
                "text": `You are an expert prompt engineer for Jules, an AI coding assistant. Rephrase the following user prompt to be more structured, clear, and detailed so that another AI can act on it perfectly. Keep the core intent but improve the formulation. Return ONLY the polished prompt text, no quotes or prefix. Prompt: "${prompt}"`
            }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const json = await response.json();
            const polishedText = json.candidates[0].content.parts[0].text.trim();
            return polishedText.replace(/^["']|["']$/g, '');
        } else {
            console.warn("Gemini API Error:", response.status);
            return prompt;
        }
    } catch (e) {
        console.warn("Gemini Exception:", e);
        return prompt;
    }
}
