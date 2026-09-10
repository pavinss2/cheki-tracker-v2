'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GridEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/raw');
  }, [router]);

  return null;
}
