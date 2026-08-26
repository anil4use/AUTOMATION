import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCDD8qQCCrN5BG8ME8h2QIcbgy6BxSxtXM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "family-monitor-71849.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "family-monitor-71849",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "family-monitor-71849.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "728116182533",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:728116182533:web:b91910181826281ac4266c",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-D42YZC2GBJ"
};

// Initialize Firebase App singleton for Next.js SSR / Client rendering
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

/**
 * Triggers Google Auth Popup using Firebase Auth.
 * Returns the authenticated user profile and Google ID Token.
 */
export async function signInWithGoogleFirebase(): Promise<{ user: User; idToken: string; accessToken?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    const idToken = await result.user.getIdToken();

    return {
      user: result.user,
      idToken,
      accessToken,
    };
  } catch (error: any) {
    console.error('[Firebase Auth] Error signing in with Google popup:', error);
    throw error;
  }
}
