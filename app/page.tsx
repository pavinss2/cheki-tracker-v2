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
import { 
  Award, 
  Building2, 
  Calendar, 
  Globe, 
  ImageIcon, 
  MapPin, 
  Palette, 
  RotateCcw, 
  Star, 
  Tag, 
  Users, 
  X 
} from 'lucide-react';

import { CircularSpinner } from '@/components/common/CircularSpinner';

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

const COUNTRY_FLAG_MAP: Record<string, string> = {
  TH: '🇹🇭 ',
  KR: '🇰🇷 ',
  TW: '🇹🇼 ',
  JP: '🇯🇵 ',
  CN: '🇨🇳 ',
  US: '🇺🇸 ',
  UK: '🇬🇧 ',
  GB: '🇬🇧 ',
};

function getNationalityLabel(code: string): string {
  const flag = COUNTRY_FLAG_MAP[code.toUpperCase()] || '';
  return `${flag}${code}`;
}

export default function HomePage() {
  const { user, isDemoUser } = useAuth();
  const { allTransactions, filteredTransactions, members, colors, loading } = useChekiData();
  const [granularity, setGranularity] = useState<'DAILY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedCardKey, setSelectedCardKey] = useState<string | null>(null);

  // Maps for custom color overrides
  const colorHexMap = useMemo(() => {
    const map: Record<string, string> = { ...COLOR_HEX_MAP };
    colors.forEach((c) => {
      if (c.color) map[c.color.toLowerCase()] = c.color_code;
    });
    return map;
  }, [colors]);

  const memberMetaMap = useMemo(() => {
    const map: Record<string, { colorHex: string }> = {};
    members.forEach((m) => {
      const hex = colorHexMap[m.color?.toLowerCase()] || '#58a6ff';
      map[m.member_name] = { colorHex: hex };
    });
    return map;
  }, [members, colorHexMap]);

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

  const cardsMap: Record<string, { title: string; map: Record<string, number>; icon: React.ElementType }> = {
    members: { title: 'TOP MEMBERS', map: kpis.memberMap, icon: Star },
    groups: { title: 'TOP GROUPS', map: kpis.groupMap, icon: Users },
    colors: { title: 'TOP COLOR', map: kpis.colorMap, icon: Palette },
    companies: { title: 'TOP COMPANY', map: kpis.companyMap, icon: Building2 },
    nationalities: { title: 'TOP NATIONALITY', map: kpis.natMap, icon: Globe },
    types: { title: 'TOP TYPE', map: kpis.typeMap, icon: Tag },
    locations: { title: 'TOP LOCATION', map: kpis.locationMap, icon: MapPin },
  };

  const handleCardClick = (cardKey: string) => {
    setSelectedCardKey(prev => prev === cardKey ? null : cardKey);
  };

  const getItemBarColor = (name: string, cardKey: string, rankIdx: number): string => {
    if (cardKey === 'colors') {
      return colorHexMap[name.toLowerCase()] || COLOR_HEX_MAP[name.toLowerCase()] || '#ffffff';
    }
    if (cardKey === 'members' && memberMetaMap[name]?.colorHex) {
      return memberMetaMap[name].colorHex;
    }
    // Default crisp indicators matching screenshot
    if (rankIdx === 0) return 'var(--text-main)';
    if (rankIdx === 1) return '#9ca3af';
    return '#6b7280';
  };

  const getItemTextColor = (name: string, cardKey: string): string | undefined => {
    if (cardKey === 'colors') {
      return colorHexMap[name.toLowerCase()] || COLOR_HEX_MAP[name.toLowerCase()] || '#f4f4f7';
    }
    if (cardKey === 'members' && memberMetaMap[name]?.colorHex) {
      return memberMetaMap[name].colorHex;
    }
    return undefined;
  };

  const renderKpiCard = (cardKey: string) => {
    const cardInfo = cardsMap[cardKey];
    if (!cardInfo) return null;

    const IconComponent = cardInfo.icon;
    const sorted = Object.entries(cardInfo.map).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);
    const activeSortedList = sorted.slice(0, 20);
    const isSelected = selectedCardKey === cardKey;

    return (
      <div 
        key={cardKey}
        className={`kpi-card clickable-card ${isSelected ? 'selected' : ''}`}
        onClick={() => handleCardClick(cardKey)}
        title={`Click to toggle breakdown for ${cardInfo.title}`}
      >
        <div className="kpi-header">
          <span>{cardInfo.title}</span>
          <IconComponent size={16} className="kpi-icon" />
        </div>

        <div className="top-list">
          {top3.map(([name, val], idx) => {
            const pct = kpis.totalQty > 0 ? ((val / kpis.totalQty) * 100).toFixed(1) : '0';
            const barColor = getItemBarColor(name, cardKey, idx);
            const textColor = getItemTextColor(name, cardKey);

            return (
              <div key={name} className="top-item-container">
                <div className="top-item-row">
                  <div className="item-left">
                    <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                    <span className="item-name" style={{ color: textColor }}>
                      {cardKey === 'nationalities' ? getNationalityLabel(name) : name}
                    </span>
                  </div>
                  <div className="item-right">
                    <span className="item-val">{val}</span>
                    <span className="item-pct">({pct}%)</span>
                  </div>
                </div>
                <div className="item-bar-track">
                  <div
                    className="item-bar-fill"
                    style={{
                      width: `${Math.max(Number(pct), 1.5)}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {top3.length === 0 && (
            <div className="empty-top-list">No records found</div>
          )}
        </div>

        {/* Floating Top Layer Popover Extension Attached Under Clicked Card */}
        {isSelected && (
          <div 
            className="breakdown-popover-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="breakdown-header">
              <div className="breakdown-title-group">
                <span className="breakdown-title">TOP 20 - {cardInfo.title}</span>
                <span className="breakdown-count-badge">{activeSortedList.length} ITEMS</span>
              </div>
              <button 
                className="btn-close-breakdown" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCardKey(null);
                }} 
                title="Close Breakdown"
              >
                <X size={16} />
              </button>
            </div>

            <div className="breakdown-list">
              {activeSortedList.map(([name, val], idx) => {
                const pct = kpis.totalQty > 0 ? ((val / kpis.totalQty) * 100).toFixed(1) : '0';
                const textColor = getItemTextColor(name, cardKey);

                return (
                  <div key={name} className="breakdown-row">
                    <div className="breakdown-left">
                      <span className="breakdown-rank">{idx + 1}</span>
                      <span className="breakdown-name" style={{ color: textColor }}>
                        {cardKey === 'nationalities' ? getNationalityLabel(name) : name}
                      </span>
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
      </div>
    );
  };

  if (!user && !isDemoUser) {
    return <LoginPrompt />;
  }

  if (loading) {
    return <CircularSpinner />;
  }

  return (
    <div className="home-page">
      <FilterBar transactions={allTransactions} />

      {/* KPI Cards Grid - 3x3 Layout matching attached reference image */}
      <div className="kpi-grid">
        {/* Combined Card: TOTAL CHEKI & UNIQUE COUNT */}
        <div className="kpi-card highlight combined-overview-card">
          <div className="kpi-header">
            <span>TOTAL CHEKI</span>
            <div className="header-icons">
              <Award size={15} className="kpi-icon" />
            </div>
          </div>
          <div className="kpi-split-three">
            <div className="split-col">
              <div className="kpi-big-value">{kpis.totalQty.toLocaleString()}<span className="unit"> pcs</span></div>
              <div className="kpi-subtext">฿ {kpis.totalPrice.toLocaleString()}</div>
            </div>
            <div className="split-divider" />
            <div className="split-col">
              <span className="split-val">{kpis.uniqueMembers}</span>
              <span className="split-lbl">MEMBERS</span>
            </div>
            <div className="split-divider" />
            <div className="split-col">
              <span className="split-val">{kpis.uniqueGroups}</span>
              <span className="split-lbl">GROUPS</span>
            </div>
          </div>
        </div>

        {/* Card 3: TOP MEMBERS */}
        {renderKpiCard('members')}

        {/* Card 4: TOP GROUPS */}
        {renderKpiCard('groups')}

        {/* Card 5: TOP COLOR */}
        {renderKpiCard('colors')}

        {/* Card 6: TOP COMPANY */}
        {renderKpiCard('companies')}

        {/* Card 7: TOP NATIONALITY */}
        {renderKpiCard('nationalities')}

        {/* Card 8: TOP TYPE */}
        {renderKpiCard('types')}

        {/* Card 9: TOP LOCATION */}
        {renderKpiCard('locations')}

        {/* Card 10: MOST CHEKI DAY */}
        <div className="kpi-card highlight">
          <div className="kpi-header">
            <span>MOST CHEKI DAY</span>
            <Calendar size={16} className="kpi-icon" />
          </div>
          <div className="kpi-split">
            <div className="split-col">
              <span className="split-val">{kpis.maxDayQty}</span>
              <span className="split-lbl">PCS</span>
            </div>
            <div className="split-divider" />
            <div className="split-col">
              <span className="split-val">฿ {kpis.maxDaySpend.toLocaleString()}</span>
              <span className="split-lbl">SPENT</span>
            </div>
          </div>
          <div className="date-subtext">{kpis.maxDayDate}</div>
        </div>
      </div>

      {/* Bar Chart Timeline */}
      <div className="chart-card card">
        <div className="chart-header">
          <div>
            <h2>Trend</h2>
            <p className="chart-sub">Volume of cheki over time</p>
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
                isAnimationActive={false}
                animationDuration={0}
                cursor={false}
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

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .kpi-card {
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          min-height: 155px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-card);
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
        }

        .kpi-card.combined-overview-card {
          justify-content: center;
          gap: 14px;
        }

        .kpi-card.combined-overview-card .kpi-header {
          margin-bottom: 0;
        }

        .kpi-card.combined-overview-card .kpi-split-three {
          margin-top: 0;
        }

        .kpi-card.highlight {
          border-color: var(--border-subtle);
          background: linear-gradient(135deg, var(--bg-surface-1), var(--bg-surface-2));
        }

        .kpi-card.clickable-card {
          cursor: pointer;
        }

        .kpi-card.clickable-card:hover {
          border-color: var(--border-strong);
          background-color: var(--bg-surface-2);
        }

        .kpi-card.selected {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 1px var(--accent-primary);
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

        .kpi-icon {
          color: var(--text-subtle);
        }

        .kpi-big-value {
          font-family: var(--font-display);
          font-size: 2.1rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 10px 0 2px 0;
        }
        .kpi-big-value .unit { font-size: 0.9rem; color: var(--text-muted); font-family: var(--font-body); }

        .kpi-subtext { font-size: 0.84rem; color: var(--accent-primary); font-weight: 600; }

        .kpi-split { display: flex; align-items: center; justify-content: space-around; margin-top: 14px; }
        .split-col { display: flex; flex-direction: column; align-items: center; }
        .split-val { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--text-main); }
        .split-lbl { font-size: 0.68rem; color: var(--text-subtle); letter-spacing: 0.05em; font-weight: 600; }
        .split-divider { width: 1px; height: 30px; background: var(--border-strong); }

        .top-list { 
          display: flex; 
          flex-direction: column; 
          gap: 8px; 
          margin-top: 12px; 
        }

        .top-item-container { 
          display: flex; 
          flex-direction: column; 
          gap: 4px; 
        }

        .top-item-row { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          font-size: 0.84rem; 
          gap: 8px;
        }

        .item-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .rank-badge {
          width: 17px;
          height: 17px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.68rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .rank-badge.rank-1 {
          color: #f1c40f;
          border: 1.5px solid #f1c40f;
          background: rgba(241, 196, 15, 0.12);
        }

        .rank-badge.rank-2 {
          color: #9ca3af;
          border: 1.5px solid #6b7280;
          background: rgba(156, 163, 175, 0.12);
        }

        .rank-badge.rank-3 {
          color: #d97706;
          border: 1.5px solid #d97706;
          background: rgba(217, 119, 6, 0.12);
        }

        .item-name { 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          font-weight: 500;
          color: var(--text-main);
        }

        .item-right {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.82rem;
          flex-shrink: 0;
        }

        .item-val { 
          font-weight: 700; 
          color: var(--text-main); 
        }

        .item-pct {
          color: var(--text-muted);
          font-weight: 400;
          font-size: 0.76rem;
        }

        .item-bar-track {
          width: 100%;
          height: 3px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 1px;
        }

        .item-bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .empty-top-list {
          font-size: 0.8rem;
          color: var(--text-muted);
          padding: 10px 0;
        }

        /* Breakdown Extension Card */
        .breakdown-extension-card {
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-strong);
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
          color: #ffffff;
          letter-spacing: 0.05em;
        }

        .btn-close-breakdown {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .btn-close-breakdown:hover {
          color: var(--text-main);
          background: rgba(255,255,255,0.1);
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
        }

        .btn-toggle.active {
          background-color: var(--bg-surface-3); color: var(--text-main); font-weight: 600;
        }

        @media (max-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 640px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .combined-overview-card,
          .kpi-grid > .kpi-card:first-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}

