'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogIn, LogOut, User as UserIcon, ShieldAlert, Settings, Shield } from 'lucide-react';
import { usePathname } from 'next/navigation';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/calendar': 'Calendar',
  '/raw': 'Raw Data',
  '/analytics': 'Analytics',
  '/events': 'Events',
  '/tiermaker': 'Tier Maker',
  '/admin': 'Admin',
  '/backoffice': 'Back Office',
  '/grid-entry': 'Grid Entry',
};

export const Header: React.FC = () => {
  const { user, signInWithGoogle, signOutUser, isDemoUser, isSuperAdmin } = useAuth();
  const pathname = usePathname();

  const pageTitle = ROUTE_TITLES[pathname] || 
    (pathname.startsWith('/admin') ? 'Admin' : 
     pathname.startsWith('/backoffice') ? 'Back Office' : 
     pathname.startsWith('/raw') ? 'Raw Data' : 
     pathname.startsWith('/analytics') ? 'Analytics' : 
     pathname.startsWith('/calendar') ? 'Calendar' : 
     pathname.startsWith('/events') ? 'Events' : 
     pathname.startsWith('/tiermaker') ? 'Tier Maker' : '');

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-page-title">{pageTitle}</h1>
      </div>

      <div className="header-actions">
        <div className="header-mobile-nav">
          <Link 
            href="/admin" 
            className={`header-nav-btn ${pathname.startsWith('/admin') ? 'active' : ''}`}
            title="Admin"
          >
            <Settings size={18} />
          </Link>
          {isSuperAdmin && (
            <Link 
              href="/backoffice" 
              className={`header-nav-btn ${pathname.startsWith('/backoffice') ? 'active' : ''}`}
              title="Back Office"
            >
              <Shield size={18} />
            </Link>
          )}
        </div>

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

      <style jsx>{`
        .app-header {
          height: var(--header-height);
          background-color: var(--bg-surface-1);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 45;
          margin-left: var(--sidebar-width);
          width: calc(100% - var(--sidebar-width));
          box-sizing: border-box;
        }

        .header-left {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .header-page-title {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 768px) {
          .app-header {
            margin-left: 0;
            width: 100%;
            padding: 0 16px;
          }
          .header-mobile-nav {
            display: flex !important;
          }
        }

        .header-mobile-nav {
          display: none;
          align-items: center;
          gap: 16px;
        }

        .header-nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          color: var(--text-muted);
          background-color: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
          text-decoration: none;
        }

        .header-nav-btn:hover {
          color: var(--text-main);
          border-color: var(--border-strong);
        }

        .header-nav-btn.active {
          color: #d4a84b;
          border-color: rgba(212, 168, 75, 0.4);
          background-color: rgba(212, 168, 75, 0.15);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
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

