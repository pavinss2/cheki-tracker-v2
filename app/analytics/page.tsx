'use client';

import React, { useState, useMemo } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { FilterBar } from '@/components/layout/FilterBar';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { Trophy } from 'lucide-react';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { formatDisplayName } from '@/lib/imageUtils';

export default function AnalyticsPage() {
  const { user, isDemoUser } = useAuth();
  const { allTransactions, filteredTransactions, members, colors, loading } = useChekiData();

  const [dimension, setDimension] = useState<'MEMBER' | 'GROUP' | 'COLOR'>('MEMBER');
  const [metric, setMetric] = useState<'qty' | 'price'>('qty');

  const colorHexMap = useMemo(() => {
    const map: Record<string, string> = {};
    colors.forEach((c) => {
      map[c.color] = c.color_code;
    });
    return map;
  }, [colors]);

  const memberMetaMap = useMemo(() => {
    const map: Record<string, { image: string; colorHex: string }> = {};
    members.forEach((m) => {
      const hex = colorHexMap[m.color] || '#58a6ff';
      map[m.member_name] = {
        image: m.member_image && m.member_image !== 'None' ? m.member_image : '',
        colorHex: hex,
      };
    });
    return map;
  }, [members, colorHexMap]);

  const aggregatedData = useMemo(() => {
    const map: Record<string, { name: string; qty: number; price: number; colorHex: string; image: string }> = {};

    filteredTransactions.forEach((r) => {
      let key = r.member || 'Unknown';
      if (dimension === 'GROUP') key = r.group || 'Unknown';
      if (dimension === 'COLOR') key = r.color || 'Unknown';

      if (!map[key]) {
        let hex = '#58a6ff';
        let img = '';
        if (dimension === 'MEMBER' && memberMetaMap[key]) {
          hex = memberMetaMap[key].colorHex;
          img = memberMetaMap[key].image;
        } else if (dimension === 'COLOR' && colorHexMap[key]) {
          hex = colorHexMap[key];
        }

        map[key] = {
          name: key,
          qty: 0,
          price: 0,
          colorHex: hex,
          image: img,
        };
      }

      map[key].qty += (r.quantity || 1);
      map[key].price += (r.totalPrice || 0);
    });

    const items = Object.values(map).filter(
      (item) => item.name && item.name !== 'Unknown' && item.name.trim() !== ''
    );
    items.sort((a, b) => (metric === 'qty' ? b.qty - a.qty : b.price - a.price));
    return items;
  }, [filteredTransactions, dimension, metric, memberMetaMap, colorHexMap]);

  const maxVal = useMemo(() => {
    if (aggregatedData.length === 0) return 1;
    const top = aggregatedData[0];
    return metric === 'qty' ? top.qty : top.price;
  }, [aggregatedData, metric]);

  if (!user && !isDemoUser) return <LoginPrompt />;
  if (loading) return <CircularSpinner />;

  return (
    <div className="analytics-page">
      <FilterBar transactions={allTransactions} />

      {/* Control Bar */}
      <div className="controls-card card">
        <div className="control-group">
          <label>Dimension:</label>
          <div className="btn-group">
            <button className={`btn-toggle ${dimension === 'MEMBER' ? 'active' : ''}`} onClick={() => setDimension('MEMBER')}>Member</button>
            <button className={`btn-toggle ${dimension === 'GROUP' ? 'active' : ''}`} onClick={() => setDimension('GROUP')}>Group</button>
            <button className={`btn-toggle ${dimension === 'COLOR' ? 'active' : ''}`} onClick={() => setDimension('COLOR')}>Color</button>
          </div>
        </div>

        <div className="control-group">
          <label>Metric:</label>
          <div className="btn-group">
            <button className={`btn-toggle ${metric === 'qty' ? 'active' : ''}`} onClick={() => setMetric('qty')}>Quantity</button>
            <button className={`btn-toggle ${metric === 'price' ? 'active' : ''}`} onClick={() => setMetric('price')}>Total Spend (THB)</button>
          </div>
        </div>
      </div>

      {/* Main Bar Graph Leaderboard View */}
      <div className="chart-card card">
        {/* <h2>{dimension} ({metric === 'qty' ? 'Quantity' : 'Total Spend'})</h2> */}

        <div className="custom-bar-list">
          {aggregatedData.map((item, idx) => {
            const val = metric === 'qty' ? item.qty : item.price;
            const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const rank = idx + 1;

            // Border color according to rank: rank 1-3 use metallic rank colors, 4+ use white border
            let avatarBorderColor = '#ffffff';
            if (rank === 1) avatarBorderColor = '#facc15';
            else if (rank === 2) avatarBorderColor = '#e2e8f0';
            else if (rank === 3) avatarBorderColor = '#d97706';

            return (
              <div key={item.name} className="leaderboard-row">
                {/* Column 1: Rank(#) */}
                <span className="col-rank">#{rank}</span>

                {/* Column 2: Trophy */}
                <div className="col-trophy">
                  {rank === 1 && <Trophy size={20} color="#facc15" fill="#facc15" />}
                  {rank === 2 && <Trophy size={20} color="#e2e8f0" fill="#e2e8f0" />}
                  {rank === 3 && <Trophy size={20} color="#d97706" fill="#d97706" />}
                </div>

                {/* Column 3: Member Image / Avatar Fallback */}
                {dimension === 'MEMBER' && (
                  <div className="col-avatar">
                    <MemberAvatar 
                      src={item.image} 
                      name={item.name} 
                      size={34} 
                      colorHex={avatarBorderColor} 
                    />
                  </div>
                )}

                {/* Column 4: Member Name */}
                <span className="col-name">{dimension === 'MEMBER' ? formatDisplayName(item.name) : item.name}</span>

                {/* Column 5: Progress Bar */}
                <div className="col-bar-container">
                  <div className="bar-track">
                    <div
                      key={`${dimension}-${metric}-${item.name}`}
                      className="bar-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.colorHex || '#58a6ff',
                      }}
                    />
                  </div>
                </div>

                {/* Column 6: Number (Unbold) */}
                <span className="col-number">
                  {metric === 'qty' ? val : `฿${val.toLocaleString()}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .analytics-page {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .page-title { font-size: 1.6rem; }

        .controls-card {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          align-items: center;
        }

        .control-group { display: flex; align-items: center; gap: 8px; }
        .control-group label { font-size: 0.78rem; font-weight: 600; color: var(--text-subtle); }

        .btn-group {
          display: flex;
          background-color: var(--bg-surface-2);
          padding: 3px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
        }

        .btn-toggle {
          background: none; border: none; color: var(--text-muted); padding: 6px 12px; font-size: 0.78rem; font-weight: 500; border-radius: 4px; cursor: pointer;
        }

        .btn-toggle.active {
          background-color: var(--bg-surface-3); color: var(--text-main); font-weight: 600;
        }

        /* Leaderboard List Column Alignment (Rank, Trophy, Member Image, Name, Bar, Number) */
        .custom-bar-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 1px;
        }

        .leaderboard-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .col-rank {
          font-size: 0.88rem;
          font-weight: 400;
          color: var(--text-subtle);
          min-width: 24px;
          flex-shrink: 0;
        }

        .col-trophy {
          width: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .col-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .col-name {
          font-weight: 400;
          font-size: 0.98rem;
          color: var(--text-main);
          max-width: 95px;
          min-width: 60px;
          flex-shrink: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .col-bar-container {
          flex: 1;
          min-width: 50px;
          display: flex;
          align-items: center;
        }

        .bar-track {
          width: 100%;
          height: 18px;
          background-color: #262626;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .bar-fill {
          height: 100%;
          border-radius: 6px;
          transform-origin: left;
          animation: barEmerge 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes barEmerge {
          from {
            transform: scaleX(0);
            opacity: 0.3;
          }
          to {
            transform: scaleX(1);
            opacity: 1;
          }
        }

        .col-number {
          font-weight: 400;
          font-size: 0.95rem;
          color: #58a6ff;
          min-width: 28px;
          text-align: right;
          flex-shrink: 0;
        }

        .table-wrapper { margin-top: 16px; overflow-x: auto; }
      `}</style>
    </div>
  );
}
