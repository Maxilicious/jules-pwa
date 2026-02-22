// @ts-nocheck
import { auth, db, doc, getDoc, setDoc, onSnapshot } from '../firebase';
import { setApiKey, setGitHubPat } from './client';

export const syncSettings = async (user) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    // Initial Pull
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.jules_api_key) {
            localStorage.setItem('jules_api_key', data.jules_api_key);
        }
        if (data.github_pat) {
            localStorage.setItem('github_pat', data.github_pat);
        }
    }

    // Subscribe to changes (Sync from Cloud to Local)
    onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.jules_api_key) localStorage.setItem('jules_api_key', data.jules_api_key);
            if (data.github_pat) localStorage.setItem('github_pat', data.github_pat);
        }
    });
};

export const uploadSettings = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
        jules_api_key: localStorage.getItem('jules_api_key') || '',
        github_pat: localStorage.getItem('github_pat') || '',
        updatedAt: new Date().toISOString()
    }, { merge: true });
};
