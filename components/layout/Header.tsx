'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogIn, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/calendar': 'Calendar',
  '/raw': 'Raw Data',
  '/analytics': 'Analytics',
  '/events': 'Events',
  '/admin': 'Admin',
  '/grid-entry': 'Grid Entry',
};

export const Header: React.FC = () => {
  const { user, signInWithGoogle, signOutUser, isDemoUser } = useAuth();
  const pathname = usePathname();

  const pageTitle = ROUTE_TITLES[pathname] || 
    (pathname.startsWith('/admin') ? 'Admin' : 
     pathname.startsWith('/raw') ? 'Raw Data' : 
     pathname.startsWith('/analytics') ? 'Analytics' : 
     pathname.startsWith('/calendar') ? 'Calendar' : 
     pathname.startsWith('/events') ? 'Events' : '');

  return (
    <header className="app-header">
      <div className="header-left-zone">
        <h1 className="header-page-title">{pageTitle}</h1>
      </div>

      <div className="header-right-zone">
        <div className="header-actions">
          {isDemoUser && (
            <div className="demo-banner">
              <ShieldAlert size={14} />
              <span>Demo Mode</span>
            </div>
          )}

          {user ? (
            <div className="user-profile" title={user.displayName || user.email || 'Logged in User'}>
              {user.photoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={user.photoURL} alt={user.displayName || 'User'} className="user-avatar" width={28} height={28} />
              ) : (
                <div className="user-avatar-placeholder">
                  <UserIcon size={16} />
                </div>
              )}
              <button onClick={signOutUser} className="btn-icon" title="Sign Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={signInWithGoogle} className="btn btn-primary btn-sm">
              <LogIn size={16} />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
