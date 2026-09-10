'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Table, BarChart2, Grid, Settings } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  const items = [
    { label: ' Home', href: '/', icon: Home },
    { label: ' Cal', href: '/calendar', icon: Calendar },
    { label: ' Raw', href: '/raw', icon: Table },
    { label: ' Analytics', href: '/analytics', icon: BarChart2 },
    { label: ' Admin', href: '/admin', icon: Settings },
  ];

  return (
    <nav className="mobile-nav">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link key={item.href} href={item.href} className={`mobile-item ${isActive ? 'active' : ''}`}>
            <Icon size={20} />
            <span className="mobile-label">{item.label}</span>
          </Link>
        );
      })}

      <style jsx>{`
        .mobile-nav {
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background-color: var(--bg-surface-1);
            border-top: 1px solid var(--border-subtle);
            z-index: 50;
            justify-content: space-around;
            align-items: center;
          }

          .mobile-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            color: var(--text-muted);
            font-size: 0.7rem;
            padding: 6px;
          }

          .mobile-item.active {
            color: var(--accent-primary);
          }
        }
      `}</style>
    </nav>
  );
};
