'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Table, BarChart2, Trophy } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  const normalizePath = (p: string) => (p && p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p);
  const currentPath = normalizePath(pathname || '/');

  const items = [
    { label: '', href: '/', icon: Home },
    { label: '', href: '/calendar', icon: Calendar },
    { label: '', href: '/analytics', icon: BarChart2 },
    { label: '', href: '/raw', icon: Table },
    { label: '', href: '/tiermaker', icon: Trophy },
  ];

  return (
    <nav className="mobile-nav">
      {items.map(item => {
        const Icon = item.icon;
        const targetPath = normalizePath(item.href);
        const isActive = currentPath === targetPath || (targetPath !== '/' && currentPath.startsWith(targetPath));

        return (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`mobile-item ${isActive ? 'active' : ''}`}
            data-active={isActive ? 'true' : 'false'}
            style={isActive ? {
              color: '#d4a84b',
              fontWeight: 700,
            } : {
              color: '#ffffff',
            }}
          >
            <Icon 
              size={20} 
              style={isActive ? { color: '#d4a84b', stroke: '#d4a84b' } : { color: '#ffffff', stroke: '#ffffff' }}
            />
            <span 
              className="mobile-label"
              style={isActive ? { color: '#d4a84b' } : { color: '#ffffff' }}
            >
              {item.label}
            </span>
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
            z-index: 100;
            justify-content: space-around;
            align-items: center;
            padding: 4px 0;
          }

          .mobile-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            color: #ffffff;
            font-size: 0.72rem;
            padding: 4px 8px;
            text-decoration: none;
            background: none;
            border: none;
            transition: color 0.15s ease;
          }

          .mobile-item :global(svg) {
            color: #ffffff;
            stroke: #ffffff;
            transition: color 0.15s ease, stroke 0.15s ease;
          }

          .mobile-item.active,
          .mobile-item[data-active="true"] {
            color: #d4a84b !important;
            background: none !important;
            font-weight: 700 !important;
          }

          .mobile-item.active :global(svg),
          .mobile-item[data-active="true"] :global(svg) {
            color: #d4a84b !important;
            stroke: #d4a84b !important;
          }

          .mobile-item.active .mobile-label,
          .mobile-item[data-active="true"] .mobile-label {
            color: #d4a84b !important;
          }
        }
      `}</style>
    </nav>
  );
};
