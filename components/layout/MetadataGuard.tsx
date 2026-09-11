'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useChekiData } from '@/hooks/useChekiData';
import { useAuth } from '@/context/AuthContext';
import { hasUserConfiguredSubscriptions } from '@/lib/dataStore';

export function MetadataGuard({ children }: { children: React.ReactNode }) {
  const { user, isDemoUser } = useAuth();
  const { members, groups, companies, loading } = useChekiData();
  const pathname = usePathname();
  const router = useRouter();
  const userId = user?.uid || (isDemoUser ? 'demo-user-id' : '');

  useEffect(() => {
    // Only brand new users who have zero configured subscriptions and zero metadata get prompted
    if (!loading && userId && !isDemoUser) {
      const hasConfigured = hasUserConfiguredSubscriptions(userId);
      const hasNoMetadata = members.length === 0 && groups.length === 0 && companies.length === 0;
      if (!hasConfigured && hasNoMetadata && pathname !== '/admin') {
        router.push('/admin?autoSubscribe=true');
      }
    }
  }, [loading, userId, isDemoUser, members.length, groups.length, companies.length, pathname, router]);

  return <>{children}</>;
}
