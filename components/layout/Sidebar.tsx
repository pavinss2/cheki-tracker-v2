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
          top: var(--header-height);
          bottom: 0;
          left: 0;
          z-index: 40;
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
          padding: 20px 24px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.9rem;
          transition: all var(--transition-fast);
        }

        .nav-item:hover {
          background-color: var(--bg-surface-2);
          color: var(--text-main);
        }

        .nav-item.active {
          background-color: var(--accent-primary-subtle);
          color: var(--accent-primary);
          font-weight: 600;
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
