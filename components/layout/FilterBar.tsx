'use client';

import React, { useMemo } from 'react';
import { useFilters } from '@/context/FilterContext';
import { Transaction } from '@/types/cheki';
import { X, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  transactions: Transaction[];
}

export const FilterBar: React.FC<FilterBarProps> = ({ transactions }) => {
  const { filters, setFilter, removeCellFilter, clearAllFilters } = useFilters();

  const options = useMemo(() => {
    const years = new Set<string>();
    const groups = new Set<string>();
    const colors = new Set<string>();
    const members = new Set<string>();
    const nats = new Set<string>();
    const companies = new Set<string>();

    transactions.forEach((r) => {
      const matchYear = !filters.year || r.year === filters.year;
      const matchGroup = !filters.group || r.group === filters.group;
      const matchColor = !filters.color || r.color === filters.color;
      const matchMember = !filters.member || r.member === filters.member;
      const matchNat = !filters.nationality || r.nationality === filters.nationality;
      const matchCmp = !filters.company || r.company === filters.company;

      if (matchMember && matchGroup && matchColor && matchNat && matchCmp && r.year) years.add(r.year);
      if (matchYear && matchGroup && matchColor && matchNat && matchCmp && r.member) members.add(r.member);
      if (matchYear && matchMember && matchColor && matchNat && matchCmp && r.group) groups.add(r.group);
      if (matchYear && matchMember && matchGroup && matchNat && matchCmp && r.color) colors.add(r.color);
      if (matchYear && matchMember && matchGroup && matchColor && matchCmp && r.nationality) nats.add(r.nationality);
      if (matchYear && matchMember && matchGroup && matchColor && matchNat && r.company) companies.add(r.company);
    });

    return {
      years: Array.from(years).sort().reverse(),
      groups: Array.from(groups).sort(),
      colors: Array.from(colors).sort(),
      members: Array.from(members).sort(),
      nationalities: Array.from(nats).sort(),
      companies: Array.from(companies).sort(),
    };
  }, [transactions, filters]);

  const activeTokens = Object.entries(filters.activeCellFilters);
  const hasAnyFilter = Boolean(
    filters.year || filters.group || filters.color || filters.member || filters.nationality || filters.company || activeTokens.length > 0
  );

  return (
    <div className="filter-bar">
      <div className="filter-grid">
        <div className="filter-item">
          <label>Year</label>
          <select value={filters.year} onChange={(e) => setFilter('year', e.target.value)}>
            <option value="">-- All Years --</option>
            {options.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Group</label>
          <select value={filters.group} onChange={(e) => setFilter('group', e.target.value)}>
            <option value="">-- All Groups --</option>
            {options.groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Color</label>
          <select value={filters.color} onChange={(e) => setFilter('color', e.target.value)}>
            <option value="">-- All Colors --</option>
            {options.colors.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Member</label>
          <select value={filters.member} onChange={(e) => setFilter('member', e.target.value)}>
            <option value="">-- All Members --</option>
            {options.members.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Nationality</label>
          <select value={filters.nationality} onChange={(e) => setFilter('nationality', e.target.value)}>
            <option value="">-- All Nationalities --</option>
            {options.nationalities.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Company</label>
          <select value={filters.company} onChange={(e) => setFilter('company', e.target.value)}>
            <option value="">-- All Companies --</option>
            {options.companies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {activeTokens.length > 0 && (
        <div className="tokens-bar">
          <span className="tokens-title">Row Drilldowns:</span>
          {activeTokens.map(([col, val]) => (
            <span key={col} className="token-tag">
              <strong>{col}:</strong> &quot;{val}&quot;
              <button onClick={() => removeCellFilter(col)}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {hasAnyFilter && (
        <div className="reset-bar">
          <button onClick={clearAllFilters} className="btn-reset">
            <RotateCcw size={12} />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      <style jsx>{`
        .filter-bar {
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-item label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-subtle);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tokens-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 8px;
          border-top: 1px dashed var(--border-subtle);
        }

        .tokens-title {
          font-size: 0.78rem;
          color: var(--accent-primary);
          font-weight: 600;
        }

        .token-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background-color: var(--accent-primary-subtle);
          color: var(--accent-primary);
          border: 1px solid rgba(212, 168, 75, 0.3);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.78rem;
        }

        .token-tag button {
          background: none;
          border: none;
          color: var(--accent-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .reset-bar {
          display: flex;
          justify-content: flex-end;
        }

        .btn-reset {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.78rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;

          &:hover {
            color: var(--color-warning);
          }
        }

        @media (max-width: 1024px) {
          .filter-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 600px) {
          .filter-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};
