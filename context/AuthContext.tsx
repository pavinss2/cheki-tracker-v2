'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

import { CircularSpinner } from '@/components/common/CircularSpinner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  isDemoUser: boolean;
  enableDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  isDemoUser: false,
  enableDemoMode: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  useEffect(() => {
    // Check if demo user flag in localStorage
    const storedDemo = typeof window !== 'undefined' && localStorage.getItem('cheki_demo_user') === 'true';
    if (storedDemo) {
      setIsDemoUser(true);
      setUser({
        uid: 'demo-user-id',
        email: 'demo.user@chekitracker.app',
        displayName: 'Pavin (Demo User)',
        photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pavin',
      } as User);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsDemoUser(false);
      } else if (!isDemoUser) {
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Firebase auth listener error (using fallback):", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoUser]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      localStorage.removeItem('cheki_demo_user');
      setIsDemoUser(false);
    } catch (err: unknown) {
      console.error("Google sign in failed:", err);
      // If Firebase config is missing or invalid in local dev, allow falling back to demo mode gracefully
      enableDemoMode();
    } finally {
      setLoading(false);
    }
  };

  const enableDemoMode = () => {
    setIsDemoUser(true);
    localStorage.setItem('cheki_demo_user', 'true');
    setUser({
      uid: 'demo-user-id',
      email: 'pavin.demo@chekitracker.app',
      displayName: 'Pavin (Demo User)',
      photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pavin',
    } as User);
    setLoading(false);
  };

  const signOutUser = async () => {
    try {
      setLoading(true);
      if (isDemoUser) {
        localStorage.removeItem('cheki_demo_user');
        setIsDemoUser(false);
        setUser(null);
      } else {
        await firebaseSignOut(auth);
        setUser(null);
      }
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOutUser, isDemoUser, enableDemoMode }}>
      {loading ? <CircularSpinner fullScreen /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
