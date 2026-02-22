// @ts-nocheck
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const firebaseConfig = {
    projectId: "jules-pwa-firebase-8899",
    appId: "1:118440052913:web:48be8a907b49fae540fa90",
    storageBucket: "jules-pwa-firebase-8899.firebasestorage.app",
    apiKey: "AIzaSyDSBSNXoX5HL3r1F_XeRmRQRfcvXuZV-wg",
    authDomain: "jules-pwa-firebase-8899.firebaseapp.com",
    messagingSenderId: "118440052913",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, onAuthStateChanged, signOut, doc, getDoc, setDoc, onSnapshot };
