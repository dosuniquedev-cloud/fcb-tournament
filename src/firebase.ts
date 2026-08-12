import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  type User 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { PlayerRegistration } from './types';

// Read from Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY"
);

// Initialize Firebase if configured
const app = isFirebaseConfigured 
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const googleProvider = new GoogleAuthProvider();

// LOCAL STORAGE FALLBACK HELPERS FOR ZERO-CONFIG DEMO
const LOCAL_STORAGE_KEY = 'fcb_tournament_players_v1';
const MOCK_USER_KEY = 'fcb_mock_user_v1';

export const getStoredPlayersLocal = (): PlayerRegistration[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const savePlayerLocal = (player: PlayerRegistration) => {
  const current = getStoredPlayersLocal();
  const updated = [player, ...current.filter(p => p.id !== player.id)];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const updatePlayerStatusLocal = (id: string, status: 'pending' | 'approved' | 'rejected') => {
  const current = getStoredPlayersLocal();
  const updated = current.map(p => p.id === id ? { ...p, status } : p);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

// AUTH HELPERS
export const signInWithGoogle = async () => {
  if (isFirebaseConfigured && auth) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error: any) {
      console.warn("Firebase Auth popup notice:", error);
      // Fallback if Google Auth provider is not enabled yet in Firebase Console
      if (error?.code === 'auth/configuration-not-found' || error?.code === 'auth/operation-not-allowed') {
        const userName = prompt("Google Auth is pending enable in Firebase Console. Enter your name to register:") || "FCB Footballer";
        const userEmail = prompt("Enter your email address:") || "player@example.com";
        const mockUser = {
          uid: 'player_' + Date.now(),
          displayName: userName,
          email: userEmail,
          photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
        };
        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
        return mockUser as unknown as User;
      }
      throw error;
    }
  } else {
    // Mock Google User for immediate local preview
    const mockUser = {
      uid: 'mock_user_' + Date.now(),
      displayName: 'Demo Footballer',
      email: 'player@example.com',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
    };
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(mockUser));
    return mockUser as unknown as User;
  }
};

export const logoutUser = async () => {
  if (isFirebaseConfigured && auth) {
    await firebaseSignOut(auth);
  } else {
    localStorage.removeItem(MOCK_USER_KEY);
  }
};

export const getInitialUser = (): { uid: string; displayName: string | null; email: string | null; photoURL: string | null } | null => {
  if (!isFirebaseConfigured) {
    const mock = localStorage.getItem(MOCK_USER_KEY);
    return mock ? JSON.parse(mock) : null;
  }
  return auth?.currentUser ? {
    uid: auth.currentUser.uid,
    displayName: auth.currentUser.displayName,
    email: auth.currentUser.email,
    photoURL: auth.currentUser.photoURL
  } : null;
};
