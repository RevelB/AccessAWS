
'use client';

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User | null>;
  signup: (email: string, pass: string) => Promise<User | null>;
  logout: () => Promise<void>;
  resendVerificationEmail: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Only set user if they are verified
      if (currentUser && currentUser.emailVerified) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      if (!userCredential.user.emailVerified) {
        await signOut(auth); // Sign out user if email is not verified
        // Create a custom error to be caught in the component
        const error: Partial<FirebaseError> = new Error("Email not verified");
        error.code = 'auth/email-not-verified';
        throw error;
      }
      setUser(userCredential.user);
      return userCredential.user;
    } catch (error) {
      const firebaseError = error as FirebaseError;
      throw firebaseError; // Re-throw to be caught in the component
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string): Promise<User | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await sendEmailVerification(userCredential.user);
      await signOut(auth); // Sign out user immediately after signup to force login after verification
      return userCredential.user;
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error("Signup error:", firebaseError.message);
      throw firebaseError;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string, pass: string): Promise<void> => {
    try {
      // Temporarily sign in the user to get the user object
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      if (userCredential.user && !userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
      }
      // Immediately sign them out again
      await signOut(auth);
    } catch (error) {
      // Don't log them in, just re-throw the error to be handled by the UI
      const firebaseError = error as FirebaseError;
      // You might want to provide more specific error messages here
      if (firebaseError.code === 'auth/invalid-credential') {
        throw new Error('Could not resend email. The password you entered is incorrect.');
      }
      throw new Error('An unexpected error occurred while trying to resend the verification email.');
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error("Logout error:", firebaseError.message);
      throw firebaseError;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, resendVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
