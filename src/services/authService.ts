import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export type UserRole = 'donor' | 'recipient' | 'bank' | 'admin';

export interface AuthSession {
  user: User | null;
  loading: boolean;
}

class FirebaseAuthService {
  subscribeAuth(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  }

  async signUpWithEmail(
    email: string,
    password: string,
    displayName: string,
  ): Promise<User> {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // Verification email is best-effort if rate limited
    }
    return cred.user;
  }

  async resendVerificationEmail(): Promise<void> {
    if (!auth.currentUser) throw new Error('Not signed in.');
    await sendEmailVerification(auth.currentUser);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  async signOutUser(): Promise<void> {
    await signOut(auth);
  }

  async deleteCurrentAuthUser(): Promise<void> {
    if (!auth.currentUser) return;
    await deleteUser(auth.currentUser);
  }

  formatAuthError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication → Sign-in method → Email/Password). Use Google Sign-In or enable it in the console.';
    }
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
      return 'Incorrect email or password. Please check and try again.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Password must be at least 6 characters long.';
    }
    if (msg.includes('auth/popup-closed-by-user')) {
      return 'Sign-in popup was closed before finishing. Tap Google Sign-In to try again.';
    }
    if (msg.includes('auth/requires-recent-login')) {
      return 'For security, please sign out and sign back in right before deleting your account.';
    }
    return msg;
  }
}

export const authService = new FirebaseAuthService();
