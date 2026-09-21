import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export interface AppUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string;
  isDemo?: boolean;
}

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Event system for Auth domain errors
type AuthErrorListener = (details: { code: string; message: string; hostname: string; projectId: string }) => void;
const authErrorListeners: Set<AuthErrorListener> = new Set();

export function subscribeToAuthErrors(listener: AuthErrorListener) {
  authErrorListeners.add(listener);
  return () => {
    authErrorListeners.delete(listener);
  };
}

function notifyAuthError(code: string, message: string) {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const details = {
    code,
    message,
    hostname,
    projectId: firebaseConfig.projectId
  };
  authErrorListeners.forEach((listener) => {
    try {
      listener(details);
    } catch (e) {
      console.error('Error in auth error listener:', e);
    }
  });
}

// Google Sign-In with Popup
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user) {
      // Upsert profile in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Disaster Coordinator',
          photoURL: user.photoURL || '',
          role: 'Emergency Operations Coordinator',
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }
    return user;
  } catch (error: any) {
    const errorCode = error?.code || '';
    if (errorCode === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      console.warn(
        `Firebase Google Sign-In: Current domain (${typeof window !== 'undefined' ? window.location.hostname : ''}) is not yet authorized in Firebase project "${firebaseConfig.projectId}".`
      );
      notifyAuthError('auth/unauthorized-domain', 'Current domain is not in Firebase Authorized Domains.');
    } else {
      console.warn('Firebase Google Sign-In notice:', error?.message || error);
    }
    throw error;
  }
}

// Create Demo Coordinator User (instant fallback when offline or unauthorized domain)
export function createDemoCoordinatorUser(email = '249xa05219@gmail.com'): AppUserProfile {
  return {
    uid: 'demo-coordinator-' + email.replace(/[^a-zA-Z0-9]/g, '_'),
    email: email,
    displayName: 'Disaster Commander',
    photoURL: '',
    role: 'Disaster Operations Commander',
    isDemo: true
  };
}

// Sign Out
export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Test Connection on boot
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or pending connectivity.');
    }
    return false;
  }
}

