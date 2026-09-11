'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useChekiData } from '@/hooks/useChekiData';
import { useAuth } from '@/context/AuthContext';

export function MetadataGuard({ children }: { children: React.ReactNode }) {
  const { user, isDemoUser } = useAuth();
  const { members, groups, companies, loading } = useChekiData();
  const pathname = usePathname();
  const router = useRouter();
  const userId = user?.uid || (isDemoUser ? 'demo-user-id' : '');

  useEffect(() => {
    // Demo Mode users are exempt from auto-redirection to /admin
    if (!loading && userId && !isDemoUser) {
      const hasNoMetadata = members.length === 0 && groups.length === 0 && companies.length === 0;
      if (hasNoMetadata && pathname !== '/admin') {
        router.push('/admin?autoSubscribe=true');
      }
    }
  }, [loading, userId, isDemoUser, members.length, groups.length, companies.length, pathname, router]);

  return <>{children}</>;
}
