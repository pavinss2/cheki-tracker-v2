'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFilters } from '@/context/FilterContext';
import { 
  subscribeTransactions, 
  subscribeMergedMetadata, 
  getPriceRules, 
  savePriceRules,
  seedUserDataToFirestore
} from '@/lib/dataStore';
import { 
  DEFAULT_COLORS, 
  DEFAULT_COMPANIES, 
  DEFAULT_COUNTRIES, 
  DEFAULT_GROUPS, 
  DEFAULT_MEMBERS, 
  DEFAULT_TYPES 
} from '@/lib/seedData';
import { 
  DimColor, 
  DimCompany, 
  DimCountry, 
  DimGroup, 
  DimMember, 
  DimType, 
  PriceRule, 
  Transaction 
} from '@/types/cheki';

interface ChekiDataContextType {
  allTransactions: Transaction[];
  filteredTransactions: Transaction[];
  members: DimMember[];
  companies: DimCompany[];
  groups: DimGroup[];
  colors: DimColor[];
  types: DimType[];
  countries: DimCountry[];
  priceRules: PriceRule[];
  updateRules: (newRules: PriceRule[]) => void;
  loading: boolean;
  userId: string;
  isDemoUser: boolean;
}

const ChekiDataContext = createContext<ChekiDataContextType | undefined>(undefined);

export function ChekiDataProvider({ children }: { children: React.ReactNode }) {
  const { user, isDemoUser } = useAuth();
  const { filters } = useFilters();
  const userId = user?.uid || (isDemoUser ? 'demo-user-id' : '');
  const userEmail = user?.email || (isDemoUser ? 'pavin.ss2@gmail.com' : '');

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<DimMember[]>([]);
  const [companies, setCompanies] = useState<DimCompany[]>([]);
  const [groups, setGroups] = useState<DimGroup[]>([]);
  const [colors, setColors] = useState<DimColor[]>([]);
  const [types, setTypes] = useState<DimType[]>([]);
  const [countries, setCountries] = useState<DimCountry[]>([]);
  const [priceRules, setPriceRulesState] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setAllTransactions([]);
      setMembers([]);
      setCompanies([]);
      setGroups([]);
      setColors([]);
      setTypes([]);
      setCountries([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!isDemoUser && userId) {
      seedUserDataToFirestore(userId, userEmail).catch(console.warn);
    }

    let transLoaded = false;
    let memLoaded = false;
    let cmpLoaded = false;
    let grpLoaded = false;

    const checkAllLoaded = () => {
      if (transLoaded && memLoaded && cmpLoaded && grpLoaded) {
        setLoading(false);
      }
    };

    const unsubTrans = subscribeTransactions(userId, userEmail, (items) => {
      setAllTransactions(items);
      transLoaded = true;
      checkAllLoaded();
    }, isDemoUser);

    const unsubMem = subscribeMergedMetadata<DimMember>('dim_member', userId, DEFAULT_MEMBERS, (items) => {
      setMembers(items);
      memLoaded = true;
      checkAllLoaded();
    }, isDemoUser);

    const unsubCmp = subscribeMergedMetadata<DimCompany>('dim_company', userId, DEFAULT_COMPANIES, (items) => {
      setCompanies(items);
      cmpLoaded = true;
      checkAllLoaded();
    }, isDemoUser);

    const unsubGrp = subscribeMergedMetadata<DimGroup>('dim_group', userId, DEFAULT_GROUPS, (items) => {
      setGroups(items);
      grpLoaded = true;
      checkAllLoaded();
    }, isDemoUser);

    const unsubClr = subscribeMergedMetadata<DimColor>('dim_color', userId, DEFAULT_COLORS, setColors, isDemoUser);
    const unsubTyp = subscribeMergedMetadata<DimType>('dim_type', userId, DEFAULT_TYPES, setTypes, isDemoUser);
    const unsubCnt = subscribeMergedMetadata<DimCountry>('dim_country', userId, DEFAULT_COUNTRIES, setCountries, isDemoUser);

    setPriceRulesState(getPriceRules(userId));

    return () => {
      unsubTrans();
      unsubMem();
      unsubCmp();
      unsubGrp();
      unsubClr();
      unsubTyp();
      unsubCnt();
    };
  }, [userId, isDemoUser, userEmail]);

  const updateRules = (newRules: PriceRule[]) => {
    setPriceRulesState(newRules);
    savePriceRules(userId, newRules);
  };

  const filteredTransactions = useMemo(() => {
    const activeKeys = Object.keys(filters.activeCellFilters);
    const hasCellFilters = activeKeys.length > 0;

    return allTransactions.filter((row) => {
      if (filters.year && String(row.year) !== String(filters.year)) return false;
      if (filters.member && row.member !== filters.member) return false;
      if (filters.group && row.group !== filters.group) return false;
      if (filters.color && row.color !== filters.color) return false;
      if (filters.nationality && row.nationality !== filters.nationality) return false;
      if (filters.company && row.company !== filters.company) return false;
      if (filters.type && row.type !== filters.type) return false;
      if (filters.location && row.location !== filters.location) return false;

      if (hasCellFilters) {
        for (const colKey of activeKeys) {
          const expected = String(filters.activeCellFilters[colKey]).toLowerCase();
          const actual = String((row as unknown as Record<string, unknown>)[colKey] || '').toLowerCase();
          if (actual !== expected) return false;
        }
      }
      return true;
    });
  }, [allTransactions, filters]);

  const value = useMemo(() => ({
    allTransactions,
    filteredTransactions,
    members,
    companies,
    groups,
    colors,
    types,
    countries,
    priceRules,
    updateRules,
    loading,
    userId,
    isDemoUser,
  }), [
    allTransactions,
    filteredTransactions,
    members,
    companies,
    groups,
    colors,
    types,
    countries,
    priceRules,
    loading,
    userId,
    isDemoUser,
  ]);

  return (
    <ChekiDataContext.Provider value={value}>
      {children}
    </ChekiDataContext.Provider>
  );
}

export function useChekiDataContext() {
  const context = useContext(ChekiDataContext);
  if (!context) {
    throw new Error('useChekiDataContext must be used within a ChekiDataProvider');
  }
  return context;
}
