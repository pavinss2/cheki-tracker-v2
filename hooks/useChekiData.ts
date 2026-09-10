'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFilters } from '@/context/FilterContext';
import { 
  subscribeTransactions, 
  subscribeMetadata, 
  DEFAULT_PRICE_RULES, 
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
  DimLocation,
  DimMember, 
  DimType, 
  PriceRule, 
  Transaction 
} from '@/types/cheki';


export function useChekiData() {
  const { user, isDemoUser } = useAuth();
  const { filters } = useFilters();
  const userId = user?.uid || (isDemoUser ? 'demo-user-id' : '');

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<DimMember[]>([]);
  const [companies, setCompanies] = useState<DimCompany[]>([]);
  const [groups, setGroups] = useState<DimGroup[]>([]);
  const [colors, setColors] = useState<DimColor[]>([]);
  const [types, setTypes] = useState<DimType[]>([]);
  const [countries, setCountries] = useState<DimCountry[]>([]);
  const [locations, setLocations] = useState<DimLocation[]>([]);
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
      setLocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!isDemoUser && userId) {
      seedUserDataToFirestore(userId).catch(console.warn);
    }

    const unsubTrans = subscribeTransactions(userId, (items) => {
      setAllTransactions(items);
      setLoading(false);
    }, isDemoUser);


    const unsubMem = subscribeMetadata<DimMember>('dim_member', userId, DEFAULT_MEMBERS, setMembers, isDemoUser);
    const unsubCmp = subscribeMetadata<DimCompany>('dim_company', userId, DEFAULT_COMPANIES, setCompanies, isDemoUser);
    const unsubGrp = subscribeMetadata<DimGroup>('dim_group', userId, DEFAULT_GROUPS, setGroups, isDemoUser);
    const unsubClr = subscribeMetadata<DimColor>('dim_color', userId, DEFAULT_COLORS, setColors, isDemoUser);
    const unsubTyp = subscribeMetadata<DimType>('dim_type', userId, DEFAULT_TYPES, setTypes, isDemoUser);
    const unsubCnt = subscribeMetadata<DimCountry>('dim_country', userId, DEFAULT_COUNTRIES, setCountries, isDemoUser);
    const unsubLoc = subscribeMetadata<DimLocation>('dim_location', userId, [
      { location: 'Bangkok' },
      { location: 'Tokyo' },
      { location: 'Seoul' },
      { location: 'Taipei' }
    ], setLocations, isDemoUser);

    // Price rules
    setPriceRulesState(getPriceRules(userId));

    return () => {
      unsubTrans();
      unsubMem();
      unsubCmp();
      unsubGrp();
      unsubClr();
      unsubTyp();
      unsubCnt();
      unsubLoc();
    };
  }, [userId, isDemoUser]);

  const updateRules = (newRules: PriceRule[]) => {
    setPriceRulesState(newRules);
    savePriceRules(userId, newRules);
  };

  // Filtered transactions computed seamlessly
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

  return {
    allTransactions,
    filteredTransactions,
    members,
    companies,
    groups,
    colors,
    types,
    countries,
    locations,
    priceRules,
    updateRules,
    loading,
    userId,
    isDemoUser,
  };
}

