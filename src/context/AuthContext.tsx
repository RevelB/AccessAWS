
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { signIn, signUp, signOut, getCurrentUser, confirmSignUp, resendSignUpCode, fetchAuthSession } from 'aws-amplify/auth';
import type { AuthUser } from 'aws-amplify/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AuthUser | null>;
  signup: (email: string, pass: string) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  resendVerificationEmail: (email: string, pass: string) => Promise<void>;
  confirmEmail: (email: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.tokens) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        // User is not authenticated
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();

    // Set up a simple interval to check auth state periodically
    // This is a basic replacement for Firebase's real-time auth state listener
    const interval = setInterval(checkAuthState, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, pass: string): Promise<AuthUser | null> => {
    setLoading(true);
    try {
      const { isSignedIn, nextStep } = await signIn({ username: email, password: pass });
      
      if (isSignedIn) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        return currentUser;
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        // User needs to confirm their email
        const error = new Error("Email not verified");
        (error as any).code = 'UserNotConfirmedException';
        throw error;
      } else {
        throw new Error('Sign in failed');
      }
    } catch (error) {
      throw error; // Re-throw to be caught in the component
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string): Promise<AuthUser | null> => {
    setLoading(true);
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email,
        password: pass,
        options: {
          userAttributes: {
            email: email,
          },
        },
      });
      
      if (isSignUpComplete) {
        // User is signed up and confirmed
        const currentUser = await getCurrentUser();
        return currentUser;
      } else if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        // User needs to confirm their email
        // Return null to indicate they need to verify
        return null;
      } else {
        throw new Error('Sign up failed');
      }
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string, pass: string): Promise<void> => {
    try {
      // For Amplify, we can resend the confirmation code directly
      await resendSignUpCode({ username: email });
    } catch (error) {
      // Handle specific Amplify errors
      if ((error as any).name === 'NotAuthorizedException') {
        throw new Error('Could not resend email. The password you entered is incorrect.');
      }
      throw new Error('An unexpected error occurred while trying to resend the verification email.');
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmEmail = async (email: string, code: string): Promise<void> => {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (error) {
      console.error("Email confirmation error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, resendVerificationEmail, confirmEmail }}>
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
