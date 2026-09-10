'use client';

import React, { createContext, useContext, useState } from 'react';
import { FilterState } from '@/types/cheki';

interface FilterContextType {
  filters: FilterState;
  setFilter: (key: keyof Omit<FilterState, 'activeCellFilters'>, value: string) => void;
  addCellFilter: (col: string, val: string) => void;
  removeCellFilter: (col: string) => void;
  clearAllFilters: () => void;
}

const initialFilters: FilterState = {
  year: new Date().getFullYear().toString(),
  group: '',
  color: '',
  member: '',
  nationality: '',
  company: '',
  activeCellFilters: {},
};

const FilterContext = createContext<FilterContextType>({
  filters: initialFilters,
  setFilter: () => {},
  addCellFilter: () => {},
  removeCellFilter: () => {},
  clearAllFilters: () => {},
});

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const setFilter = (key: keyof Omit<FilterState, 'activeCellFilters'>, value: string) => {
    setFilters((prev) => {
      const nextActive = { ...prev.activeCellFilters };
      if (value) {
        nextActive[key] = value;
      } else {
        delete nextActive[key];
      }
      return {
        ...prev,
        [key]: value,
        activeCellFilters: nextActive,
      };
    });
  };

  const addCellFilter = (col: string, val: string) => {
    if (!col || !val) return;
    const colKey = col.toLowerCase();
    setFilters((prev) => {
      const nextActive = { ...prev.activeCellFilters, [colKey]: val };
      const nextFilters: FilterState = {
        ...prev,
        activeCellFilters: nextActive,
      };
      if (colKey in prev && colKey !== 'activeCellFilters') {
        (nextFilters as unknown as Record<string, string>)[colKey] = val;
      }
      return nextFilters;
    });
  };

  const removeCellFilter = (col: string) => {
    const colKey = col.toLowerCase();
    setFilters((prev) => {
      const nextActive = { ...prev.activeCellFilters };
      delete nextActive[colKey];
      const nextFilters: FilterState = {
        ...prev,
        activeCellFilters: nextActive,
      };
      if (colKey in prev && colKey !== 'activeCellFilters') {
        (nextFilters as unknown as Record<string, string>)[colKey] = '';
      }
      return nextFilters;
    });
  };

  const clearAllFilters = () => setFilters(initialFilters);

  return (
    <FilterContext.Provider value={{ filters, setFilter, addCellFilter, removeCellFilter, clearAllFilters }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => useContext(FilterContext);
