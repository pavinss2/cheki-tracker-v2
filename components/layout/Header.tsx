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
      <div className="header-left">
        <h1 className="header-page-title">{pageTitle}</h1>
      </div>

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
              <img src={user.photoURL} alt={user.displayName || 'User'} className="user-avatar" />
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

      <style jsx>{`
        .app-header {
          height: var(--header-height);
          background-color: var(--bg-surface-1);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: fixed;
          top: 0;
          left: var(--sidebar-width);
          right: 0;
          z-index: 45;
          box-sizing: border-box;
        }

        .header-left {
          display: flex;
          align-items: center;
          flex: 0 0 220px;
          min-width: 0;
        }

        .header-page-title {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 768px) {
          .app-header {
            left: 0;
            right: 0;
          }
          .header-left {
            flex: 0 0 160px;
          }
        }

        .header-brand {
          display: flex;
          align-items: center;
        }

        .brand-link {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-main);
        }

        .brand-logo {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--bg-surface-3), var(--bg-surface-2));
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .brand-text {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .brand-name {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.15rem;
        }

        .brand-badge {
          background-color: var(--accent-primary-subtle);
          color: var(--accent-primary);
          border: 1px solid rgba(212, 168, 75, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
          margin-left: auto;
        }

        .demo-banner {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: rgba(245, 158, 11, 0.15);
          color: var(--color-warning);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.78rem;
          font-weight: 500;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--bg-surface-2);
          padding: 4px 8px;
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-avatar-placeholder {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-surface-3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .btn-icon {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          border-radius: 4px;
          transition: color var(--transition-fast);
        }

        .btn-icon:hover {
          color: var(--color-danger);
        }
      `}</style>
    </header>
  );
};
