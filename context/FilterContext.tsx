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
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const addCellFilter = (col: string, val: string) => {
    setFilters((prev) => ({
      ...prev,
      activeCellFilters: { ...prev.activeCellFilters, [col]: val },
    }));
  };

  const removeCellFilter = (col: string) => {
    setFilters((prev) => {
      const copy = { ...prev.activeCellFilters };
      delete copy[col];
      return { ...prev, activeCellFilters: copy };
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
