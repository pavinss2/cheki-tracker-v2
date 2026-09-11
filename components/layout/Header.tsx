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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const pageTitle = ROUTE_TITLES[pathname] || 
    (pathname.startsWith('/admin') ? 'Admin' : 
     pathname.startsWith('/backoffice') ? 'Back Office' : 
     pathname.startsWith('/raw') ? 'Raw Data' : 
     pathname.startsWith('/analytics') ? 'Analytics' : 
     pathname.startsWith('/calendar') ? 'Calendar' : 
     pathname.startsWith('/events') ? 'Events' : 
     pathname.startsWith('/tiermaker') ? 'Tier Maker' : '');

  // Close dropdown menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        {/* Desktop Header Actions */}
        <div className="desktop-header-actions">
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

        {/* Mobile Header Single Menu Button & Dropdown */}
        <div className="mobile-header-nav" ref={menuRef}>
          <button 
            className={`header-nav-btn ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            title="Menu"
          >
            <Settings size={18} />
          </button>

          {isMobileMenuOpen && (
            <div className="mobile-menu-dropdown">
              <Link 
                href="/admin" 
                className={`menu-item ${pathname.startsWith('/admin') ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings size={16} />
                <span>Admin</span>
              </Link>
              {isSuperAdmin && (
                <Link 
                  href="/backoffice" 
                  className={`menu-item ${pathname.startsWith('/backoffice') ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield size={16} />
                  <span>Back Office</span>
                </Link>
              )}
              {user ? (
                <button 
                  className="menu-item danger" 
                  onClick={() => { setIsMobileMenuOpen(false); signOutUser(); }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              ) : (
                <button 
                  className="menu-item primary" 
                  onClick={() => { setIsMobileMenuOpen(false); signInWithGoogle(); }}
                >
                  <LogIn size={16} />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          )}
        </div>
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

        .desktop-header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .mobile-header-nav {
          display: none;
          position: relative;
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
          cursor: pointer;
          transition: all var(--transition-fast);
          text-decoration: none;
        }

        @media (max-width: 768px) {
          .app-header {
            margin-left: 0;
            width: 100%;
            padding: 0 16px;
          }
          .desktop-header-actions {
            display: none !important;
          }
          .mobile-header-nav {
            display: flex !important;
          }
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

        .mobile-menu-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 160px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          z-index: 200;
        }

        .mobile-menu-dropdown :global(.menu-item) {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-main);
          text-decoration: none;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }

        .mobile-menu-dropdown :global(.menu-item:hover),
        .mobile-menu-dropdown :global(.menu-item.active) {
          background-color: var(--bg-surface-2);
          color: #d4a84b;
        }

        .mobile-menu-dropdown :global(.menu-item.danger) {
          color: var(--color-danger, #ef4444);
        }

        .mobile-menu-dropdown :global(.menu-item.danger:hover) {
          background-color: rgba(239, 68, 68, 0.15);
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

