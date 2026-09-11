'use client';

import { useChekiDataContext } from '@/context/ChekiDataContext';

export function useChekiData() {
  return useChekiDataContext();
}
