import React, { useMemo, useState } from 'react';
import { useFilters } from '@/context/FilterContext';
import { Transaction } from '@/types/cheki';
import { X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterBarProps {
  transactions: Transaction[];
}

export const FilterBar: React.FC<FilterBarProps> = ({ transactions }) => {
  const { filters, setFilter, removeCellFilter, clearAllFilters } = useFilters();
  const [showMore, setShowMore] = useState(false);

  const options = useMemo(() => {
    const years = new Set<string>();
    const groups = new Set<string>();
    const colors = new Set<string>();
    const members = new Set<string>();
    const nats = new Set<string>();
    const companies = new Set<string>();
    const types = new Set<string>();
    const locations = new Set<string>();

    transactions.forEach((r) => {
      const matchYear = !filters.year || r.year === filters.year;
      const matchGroup = !filters.group || r.group === filters.group;
      const matchColor = !filters.color || r.color === filters.color;
      const matchMember = !filters.member || r.member === filters.member;
      const matchNat = !filters.nationality || r.nationality === filters.nationality;
      const matchCmp = !filters.company || r.company === filters.company;
      const matchType = !filters.type || r.type === filters.type;
      const matchLoc = !filters.location || r.location === filters.location;

      if (matchMember && matchGroup && matchColor && matchNat && matchCmp && matchType && matchLoc && r.year) years.add(r.year);
      if (matchYear && matchGroup && matchColor && matchNat && matchCmp && matchType && matchLoc && r.member) members.add(r.member);
      if (matchYear && matchMember && matchColor && matchNat && matchCmp && matchType && matchLoc && r.group) groups.add(r.group);
      if (matchYear && matchMember && matchGroup && matchNat && matchCmp && matchType && matchLoc && r.color) colors.add(r.color);
      if (matchYear && matchMember && matchGroup && matchColor && matchCmp && matchType && matchLoc && r.nationality) nats.add(r.nationality);
      if (matchYear && matchMember && matchGroup && matchColor && matchNat && matchType && matchLoc && r.company) companies.add(r.company);
      if (matchYear && matchMember && matchGroup && matchColor && matchNat && matchCmp && matchLoc && r.type) types.add(r.type);
      if (matchYear && matchMember && matchGroup && matchColor && matchNat && matchCmp && matchType && r.location) locations.add(r.location);
    });

    return {
      years: Array.from(years).sort().reverse(),
      groups: Array.from(groups).sort(),
      colors: Array.from(colors).sort(),
      members: Array.from(members).sort(),
      nationalities: Array.from(nats).sort(),
      companies: Array.from(companies).sort(),
      types: Array.from(types).sort(),
      locations: Array.from(locations).sort(),
    };
  }, [transactions, filters]);

  const activeTokens = Object.entries(filters.activeCellFilters);
  const secondaryActiveCount = [filters.type, filters.location, filters.company, filters.nationality].filter(Boolean).length;

  const hasAnyFilter = Boolean(
    filters.year || filters.group || filters.color || filters.member || filters.nationality || filters.company || filters.type || filters.location || activeTokens.length > 0
  );

  return (
    <div className="filter-bar">
      <div className="filter-grid">
        {/* Top 4 Primary Filters */}
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
          <label>Member</label>
          <select value={filters.member} onChange={(e) => setFilter('member', e.target.value)}>
            <option value="">-- All Members --</option>
            {options.members.map((m) => (
              <option key={m} value={m}>{m}</option>
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

        {/* Remaining Secondary Filters (Shown when expanded) */}
        {showMore && (
          <>
            <div className="filter-item">
              <label>Type</label>
              <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
                <option value="">-- All Types --</option>
                {options.types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>Location</label>
              <select value={filters.location} onChange={(e) => setFilter('location', e.target.value)}>
                <option value="">-- All Locations --</option>
                {options.locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
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

            <div className="filter-item">
              <label>Nationality</label>
              <select value={filters.nationality} onChange={(e) => setFilter('nationality', e.target.value)}>
                <option value="">-- All Nationalities --</option>
                {options.nationalities.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Row Drilldown Active Tokens */}
      {activeTokens.length > 0 && (
        <div className="tokens-bar">
          <span className="tokens-title">Row Drilldowns:</span>
          {activeTokens.map(([col, val]) => (
            <span key={col} className="token-tag">
              <strong>{col.charAt(0).toUpperCase() + col.slice(1)}:</strong> &quot;{val}&quot;
              <button onClick={() => removeCellFilter(col)}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {/* Action Bar: Show More Toggle & Reset Button */}
      <div className="filter-actions-bar">
        <button
          type="button"
          className="btn-show-more"
          onClick={() => setShowMore(!showMore)}
        >
          <span>{showMore ? 'Show Less Filters' : 'Show More Filters'}</span>
          {secondaryActiveCount > 0 && !showMore && (
            <span className="active-badge">+{secondaryActiveCount} active</span>
          )}
          {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {hasAnyFilter && (
          <button onClick={clearAllFilters} className="btn-reset">
            <RotateCcw size={12} />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <style jsx>{`
        .filter-bar {
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 1px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          width: 100%;
          min-width: 0;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          width: 100%;
        }

        .filter-item select {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          text-overflow: ellipsis;
          box-sizing: border-box;
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

        .filter-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 6px;
          gap: 8px;
          flex-wrap: wrap;
        }

        .btn-show-more {
          background: none;
          border: none;
          color: var(--accent-blue);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 0;
          transition: color var(--transition-fast);
        }

        .btn-show-more:hover {
          color: var(--accent-primary);
        }

        .active-badge {
          background: var(--accent-primary-subtle);
          color: var(--accent-primary);
          font-size: 0.68rem;
          padding: 1px 6px;
          border-radius: 10px;
          font-weight: 700;
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
          margin-left: auto;
        }

        .btn-reset:hover {
          color: var(--color-warning);
        }

        @media (max-width: 1024px) {
          .filter-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 768px) {
          .filter-bar {
            padding: 12px;
          }
          .filter-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};
