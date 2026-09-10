'use client';

import React, { useState, useMemo } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { FilterBar } from '@/components/layout/FilterBar';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Award, Calendar, ImageIcon, RotateCcw, X } from 'lucide-react';

const COLOR_HEX_MAP: Record<string, string> = {
  white: '#ffffff',
  red: '#e74c3c',
  green: '#27ae60',
  pink: '#ff69b4',
  blue: '#3498db',
  yellow: '#f1c40f',
  purple: '#9b59b6',
  orange: '#e67e22',
  black: '#aaaaaa',
  'n/a': '#7f8c8d',
};

function getItemColor(name: string, isColorCard: boolean): string | undefined {
  if (isColorCard) {
    return COLOR_HEX_MAP[name.toLowerCase()] || '#f4f4f7';
  }
  return undefined;
}

export default function HomePage() {
  const { user, isDemoUser } = useAuth();
  const { allTransactions, filteredTransactions, loading } = useChekiData();
  const [granularity, setGranularity] = useState<'DAILY' | 'MONTHLY' | 'YEARLY'>('DAILY');
  
  // Requirement 1: Selected card defaults to null so extension card ONLY opens on click!
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);

  // KPI Calculations
  const kpis = useMemo(() => {
    let totalQty = 0;
    let totalPrice = 0;
    const memberMap: Record<string, number> = {};
    const groupMap: Record<string, number> = {};
    const colorMap: Record<string, number> = {};
    const companyMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    const locationMap: Record<string, number> = {};
    const natMap: Record<string, number> = {};
    const dateQtyMap: Record<string, number> = {};
    const dateSpendMap: Record<string, number> = {};

    filteredTransactions.forEach((r) => {
      const q = r.quantity || 1;
      const p = r.totalPrice || 0;
      totalQty += q;
      totalPrice += p;

      if (r.member) memberMap[r.member] = (memberMap[r.member] || 0) + q;
      if (r.group) groupMap[r.group] = (groupMap[r.group] || 0) + q;
      if (r.color) colorMap[r.color] = (colorMap[r.color] || 0) + q;
      if (r.company) companyMap[r.company] = (companyMap[r.company] || 0) + q;
      if (r.type) typeMap[r.type] = (typeMap[r.type] || 0) + q;
      if (r.location) locationMap[r.location] = (locationMap[r.location] || 0) + q;
      if (r.nationality) natMap[r.nationality] = (natMap[r.nationality] || 0) + q;

      if (r.date) {
        dateQtyMap[r.date] = (dateQtyMap[r.date] || 0) + q;
        dateSpendMap[r.date] = (dateSpendMap[r.date] || 0) + p;
      }
    });

    let maxDayDate = '-';
    let maxDayQty = 0;
    Object.entries(dateQtyMap).forEach(([d, q]) => {
      if (q > maxDayQty) {
        maxDayQty = q;
        maxDayDate = d;
      }
    });

    return {
      totalQty,
      totalPrice,
      uniqueMembers: Object.keys(memberMap).length,
      uniqueGroups: Object.keys(groupMap).length,
      memberMap,
      groupMap,
      colorMap,
      companyMap,
      typeMap,
      locationMap,
      natMap,
      maxDayDate,
      maxDayQty,
      maxDaySpend: maxDayDate !== '-' ? dateSpendMap[maxDayDate] || 0 : 0,
    };
  }, [filteredTransactions]);

  // Timeline dataset for Bar Chart
  const timelineData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach((r) => {
      let key = r.date;
      if (granularity === 'MONTHLY') key = r.month || r.date.substring(0, 7);
      if (granularity === 'YEARLY') key = r.year || r.date.substring(0, 4);

      if (key) {
        map[key] = (map[key] || 0) + (r.quantity || 1);
      }
    });

    const sortedKeys = Object.keys(map).sort();
    return sortedKeys.map((k) => ({
      label: k,
      quantity: map[k],
    }));
  }, [filteredTransactions, granularity]);

  const cardsMap: Record<string, { title: string; map: Record<string, number> }> = {
    colors: { title: 'TOP COLOR', map: kpis.colorMap },
    members: { title: 'TOP MEMBERS', map: kpis.memberMap },
    groups: { title: 'TOP GROUPS', map: kpis.groupMap },
    companies: { title: 'TOP COMPANY', map: kpis.companyMap },
    nationalities: { title: 'TOP NATIONALITY', map: kpis.natMap },
  };

  const handleCardClick = (cardKey: string) => {
    setSelectedCardKey(prev => prev === cardKey ? null : cardKey);
  };

  const renderSubColumn = (cardKey: string) => {
    const cardInfo = cardsMap[cardKey];
    if (!cardInfo) return null;

    const sorted = Object.entries(cardInfo.map).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);
    const isSelected = selectedCardKey === cardKey;
    const isColorCard = cardKey === 'colors';

    return (
      <div 
        className={`sub-column clickable-subcol ${isSelected ? 'selected' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleCardClick(cardKey);
        }}
        title={`Click to toggle breakdown for ${cardInfo.title}`}
      >
        <div className="kpi-header">
          <span>{cardInfo.title}</span>
          <RotateCcw size={13} className="kpi-cycle-icon" />
        </div>

        <div className="top-list">
          {top3.map(([name, val], idx) => {
            const pct = kpis.totalQty > 0 ? ((val / kpis.totalQty) * 100).toFixed(1) : '0';
            const textColor = getItemColor(name, isColorCard);

            return (
              <div key={name} className="top-item-container">
                <div className="top-item">
                  <div className="item-left">
                    <span className={`rank-circle rank-${idx + 1}`}>{idx + 1}</span>
                    <span className="name" style={{ color: textColor }}>{name}</span>
                  </div>
                  <span className="val">{val} <span className="pct-small">({pct}%)</span></span>
                </div>
              </div>
            );
          })}

          {top3.length === 0 && (
            <div className="empty-top-list">No records found</div>
          )}
        </div>
      </div>
    );
  };

  if (!user && !isDemoUser) {
    return <LoginPrompt />;
  }

  if (loading) {
    return <div className="loading-state">Loading Analytics Dashboard...</div>;
  }

  // Active breakdown list calculation
  const activeBreakdown = selectedCardKey ? cardsMap[selectedCardKey] : null;
  const activeSortedList = activeBreakdown 
    ? Object.entries(activeBreakdown.map).sort((a, b) => b[1] - a[1]).slice(0, 20)
    : [];

  return (
    <div className="home-page">
      <h1 className="page-title">Home</h1>

      <FilterBar transactions={allTransactions} />

      {/* KPI Cards Container - Structured into 2 Rows matching attached screenshot */}
      <div className="kpi-container">
        {/* Row 1: Total Cheki | Unique Count | TOP MEMBERS & TOP GROUPS */}
        <div className="kpi-row row-1">
          {/* Total Cheki */}
          <div className="kpi-card highlight flex-1">
            <div className="kpi-header">
              <span>Total Cheki</span>
              <ImageIcon size={18} className="kpi-icon" />
            </div>
            <div className="kpi-big-value">{kpis.totalQty.toLocaleString()}</div>
            <div className="kpi-subtext">฿ {kpis.totalPrice.toLocaleString()} THB</div>
          </div>

          {/* Unique Count */}
          <div className="kpi-card highlight flex-1">
            <div className="kpi-header">
              <span>Unique Count</span>
              <Award size={18} className="kpi-icon" />
            </div>
            <div className="kpi-split">
              <div className="split-col">
                <span className="split-val">{kpis.uniqueMembers}</span>
                <span className="split-lbl">Members</span>
              </div>
              <div className="split-divider" />
              <div className="split-col">
                <span className="split-val">{kpis.uniqueGroups}</span>
                <span className="split-lbl">Groups</span>
              </div>
            </div>
          </div>

          {/* Grouped Card: TOP MEMBERS & TOP GROUPS */}
          <div className="kpi-card grouped-card flex-2">
            <div className="sub-columns-container cols-2">
              {renderSubColumn('members')}
              <div className="sub-col-divider" />
              {renderSubColumn('groups')}
            </div>
          </div>
        </div>

        {/* Row 2: TOP COLOR & TOP COMPANY & TOP NATIONALITY | Most Cheki Day */}
        <div className="kpi-row row-2">
          {/* Grouped Card: TOP COLOR & TOP COMPANY & TOP NATIONALITY */}
          <div className="kpi-card grouped-card flex-3">
            <div className="sub-columns-container cols-3">
              {renderSubColumn('colors')}
              <div className="sub-col-divider" />
              {renderSubColumn('companies')}
              <div className="sub-col-divider" />
              {renderSubColumn('nationalities')}
            </div>
          </div>

          {/* Most Cheki Day */}
          <div className="kpi-card flex-1">
            <div className="kpi-header">
              <span>Most Cheki Day</span>
              <Calendar size={18} className="kpi-icon" />
            </div>
            <div className="kpi-big-value">{kpis.maxDayQty} <span className="unit">pcs</span></div>
            <div className="kpi-subtext">
              {kpis.maxDayDate} • ฿{kpis.maxDaySpend.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Separate Extension Breakdown Card (Triggered ON CLICK ONLY) */}
      {selectedCardKey && activeBreakdown && (
        <div className="breakdown-extension-card card">
          <div className="breakdown-header">
            <div className="breakdown-title-group">
              <span className="breakdown-title">TOP 20 - {activeBreakdown.title}</span>
              <span className="breakdown-count-badge">{activeSortedList.length} ITEMS</span>
            </div>
            <button className="btn-close-breakdown" onClick={() => setSelectedCardKey(null)} title="Close Breakdown">
              <X size={16} />
            </button>
          </div>

          <div className="breakdown-list">
            {activeSortedList.map(([name, val], idx) => {
              const pct = kpis.totalQty > 0 ? ((val / kpis.totalQty) * 100).toFixed(1) : '0';
              const textColor = getItemColor(name, selectedCardKey === 'colors');

              return (
                <div key={name} className="breakdown-row">
                  <div className="breakdown-left">
                    <span className="breakdown-rank">{idx + 1}</span>
                    <span className="breakdown-name" style={{ color: textColor }}>{name}</span>
                  </div>
                  <div className="breakdown-right">
                    <strong>{val}</strong>
                    <span className="breakdown-pct">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bar Chart Timeline */}
      <div className="chart-card card">
        <div className="chart-header">
          <div>
            <h2>Transaction Quantity Trend</h2>
            <p className="chart-sub">Volume of cheki recorded over time (Bar Chart)</p>
          </div>
          <div className="btn-group">
            <button 
              className={`btn-toggle ${granularity === 'DAILY' ? 'active' : ''}`}
              onClick={() => setGranularity('DAILY')}
            >
              Daily
            </button>
            <button 
              className={`btn-toggle ${granularity === 'MONTHLY' ? 'active' : ''}`}
              onClick={() => setGranularity('MONTHLY')}
            >
              Monthly
            </button>
            <button 
              className={`btn-toggle ${granularity === 'YEARLY' ? 'active' : ''}`}
              onClick={() => setGranularity('YEARLY')}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e2230', borderColor: 'rgba(255,255,255,0.1)', color: '#f4f4f7' }}
              />
              <Bar dataKey="quantity" fill="#d4a84b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style jsx>{`
        .home-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-title { font-size: 1.6rem; }

        .loading-state { padding: 60px; text-align: center; color: var(--text-muted); }

        .kpi-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .kpi-row {
          display: flex;
          gap: 16px;
          width: 100%;
        }

        .flex-1 { flex: 1; min-width: 0; }
        .flex-2 { flex: 2; min-width: 0; }
        .flex-3 { flex: 3; min-width: 0; }

        .kpi-card {
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          min-height: 140px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-card);
          position: relative;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .kpi-card.highlight {
          border-color: var(--accent-primary-subtle);
          background: linear-gradient(135deg, var(--bg-surface-1), var(--bg-surface-2));
        }

        .grouped-card {
          padding: 12px 16px;
        }

        .sub-columns-container {
          display: flex;
          width: 100%;
          height: 100%;
          gap: 12px;
        }

        .sub-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .sub-column:hover {
          background-color: rgba(255,255,255,0.03);
        }

        .sub-column.selected {
          background-color: rgba(212, 168, 75, 0.08);
          outline: 1px solid var(--accent-primary);
          border-radius: 6px;
        }

        .sub-col-divider {
          width: 1px;
          background-color: rgba(255, 255, 255, 0.08);
          margin: 4px 0;
          flex-shrink: 0;
        }

        .kpi-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .kpi-cycle-icon {
          color: var(--text-subtle);
          opacity: 0.6;
        }

        .kpi-big-value {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 10px 0 4px 0;
        }
        .kpi-big-value .unit { font-size: 0.9rem; color: var(--text-muted); }

        .kpi-subtext { font-size: 0.82rem; color: var(--accent-primary); font-weight: 600; }

        .kpi-split { display: flex; align-items: center; justify-content: space-around; margin-top: 14px; }
        .split-col { display: flex; flex-direction: column; align-items: center; }
        .split-val { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--text-main); }
        .split-lbl { font-size: 0.72rem; color: var(--text-subtle); }
        .split-divider { width: 1px; height: 30px; background: var(--border-strong); }

        .top-list { 
          display: flex; 
          flex-direction: column; 
          gap: 6px; 
          margin-top: 8px; 
        }

        .top-item-container { 
          display: flex; 
          flex-direction: column; 
          gap: 3px; 
        }

        .top-item { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          font-size: 0.82rem; 
          gap: 8px;
        }

        .item-left {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .rank-circle {
          font-size: 0.78rem; 
          font-weight: 700; 
          color: var(--text-muted); 
          flex-shrink: 0;
          width: 14px;
        }

        .name { 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          font-weight: 500;
          color: var(--text-main);
        }

        .val { 
          font-weight: 600; 
          color: var(--text-main); 
          font-size: 0.78rem; 
          white-space: nowrap;
          flex-shrink: 0;
        }

        .pct-small {
          color: var(--text-muted);
          font-weight: 400;
          font-size: 0.74rem;
        }

        .empty-top-list {
          font-size: 0.8rem;
          color: var(--text-muted);
          padding: 10px 0;
        }

        /* Breakdown Extension Card (Image 4 format) */
        .breakdown-extension-card {
          background-color: #18191c;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }

        .breakdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .breakdown-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .breakdown-title {
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--text-subtle);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .breakdown-count-badge {
          font-size: 0.72rem;
          font-weight: 700;
          color: #58a6ff;
          letter-spacing: 0.05em;
        }

        .btn-close-breakdown {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          &:hover { color: var(--text-main); background: rgba(255,255,255,0.1); }
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .breakdown-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 4px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 0.86rem;
        }

        .breakdown-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .breakdown-rank {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .breakdown-name {
          font-weight: 500;
        }

        .breakdown-right {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: var(--text-main);
        }

        .breakdown-pct {
          color: var(--text-muted);
          font-size: 0.78rem;
        }

        .chart-card { display: flex; flex-direction: column; gap: 16px; }
        .chart-header { display: flex; justify-content: space-between; align-items: center; }
        .chart-sub { font-size: 0.82rem; color: var(--text-muted); }

        .btn-group { display: flex; background-color: var(--bg-surface-2); padding: 3px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); }
        .btn-toggle {
          background: none; border: none; color: var(--text-muted); padding: 6px 12px; font-size: 0.78rem; font-weight: 500; border-radius: 4px; cursor: pointer;
          &.active { background-color: var(--bg-surface-3); color: var(--text-main); font-weight: 600; }
        }

        @media (max-width: 1024px) {
          .kpi-row { flex-direction: column; }
          .sub-columns-container { flex-direction: column; }
          .sub-col-divider { width: 100%; height: 1px; margin: 8px 0; }
        }
      `}</style>
    </div>
  );
}
