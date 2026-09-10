'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Calendar, 
  Table, 
  BarChart2, 
  Grid, 
  Settings, 
  CalendarDays 
} from 'lucide-react';

const NAV_ITEMS = [
  { label: ' Home', href: '/', icon: Home },
  { label: ' Calendar', href: '/calendar', icon: Calendar },
  { label: ' Raw Data', href: '/raw',  icon: Table },
  { label: ' Analytics', href: '/analytics', icon: BarChart2 },
  { label: ' Events', href: '/events', icon: CalendarDays },
  { label: ' Grid Entry', href: '/grid-entry', icon: Grid },
  { label: ' Back Office', href: '/admin', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        {/* <div className="nav-group-title">MAIN NAVIGATION</div> */}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        .app-sidebar {
          width: var(--sidebar-width);
          background-color: var(--bg-surface-1);
          border-right: 1px solid var(--border-subtle);
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 50;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .nav-group-title {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-subtle);
          letter-spacing: 0.08em;
          padding: 8px 12px 6px 12px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: var(--radius-sm);
          color: #38bdf8;
          font-weight: 500;
          font-size: 0.95rem;
          transition: all var(--transition-fast);
        }

        .nav-item :global(.nav-icon) {
          color: #38bdf8;
          transition: color var(--transition-fast);
        }

        .nav-item:hover {
          background-color: var(--bg-surface-2);
          color: #ffffff;
        }

        .nav-item:hover :global(.nav-icon) {
          color: #ffffff;
        }

        .nav-item.active {
          background-color: rgba(212, 168, 75, 0.12);
          color: #d4a84b;
          font-weight: 700;
        }

        .nav-item.active :global(.nav-icon) {
          color: #d4a84b;
        }

        .nav-badge {
          margin-left: auto;
          background: var(--accent-primary);
          color: #0d0f15;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
        }

        @media (max-width: 768px) {
          .app-sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
};
