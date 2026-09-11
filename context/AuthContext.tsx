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
  isSuperAdmin: boolean;
  enableDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  isDemoUser: false,
  isSuperAdmin: false,
  enableDemoMode: () => {},
});

export const SUPER_ADMIN_EMAIL = 'pavin.ss2@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  const isSuperAdmin = Boolean(user && user.email === SUPER_ADMIN_EMAIL);

  useEffect(() => {
    // Check if demo user flag in localStorage
    const storedDemo = typeof window !== 'undefined' && localStorage.getItem('cheki_demo_user') === 'true';
    if (storedDemo) {
      setIsDemoUser(true);
      setUser({
        uid: 'demo-user-id',
        email: 'pavin.demo@chekitracker.app',
        displayName: 'Pavin (Demo User)',
        photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pavin',
      } as User);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const isDemoStillSet = typeof window !== 'undefined' && localStorage.getItem('cheki_demo_user') === 'true';
      if (isDemoStillSet) {
        setIsDemoUser(true);
        setUser({
          uid: 'demo-user-id',
          email: 'pavin.demo@chekitracker.app',
          displayName: 'Pavin (Demo User)',
          photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=Pavin',
        } as User);
      } else if (currentUser) {
        setUser(currentUser);
        setIsDemoUser(false);
      } else {
        setUser(null);
        setIsDemoUser(false);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Firebase auth listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      // Synchronously clear demo user flag before initiating Google popup
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cheki_demo_user');
      }
      setIsDemoUser(false);
      setUser(null);

      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error("Google sign in failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const enableDemoMode = () => {
    setIsDemoUser(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cheki_demo_user', 'true');
    }
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cheki_demo_user');
      }
      setIsDemoUser(false);
      setUser(null);
      await firebaseSignOut(auth).catch(() => {});
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOutUser, isDemoUser, isSuperAdmin, enableDemoMode }}>
      {loading ? <CircularSpinner fullScreen /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

