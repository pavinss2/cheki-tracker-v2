'use client';

import React, { useState, useMemo } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { FilterBar } from '@/components/layout/FilterBar';

export default function EventsPage() {
  const { allTransactions, filteredTransactions, loading } = useChekiData();
  const [viewMode, setViewMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');

  const eventsPivot = useMemo(() => {
    const map: Record<string, { period: string; event: string; qty: number; price: number; members: Set<string> }> = {};
    let totalQtyAll = 0;

    filteredTransactions.forEach((r) => {
      const q = r.quantity || 1;
      const p = r.totalPrice || 0;
      totalQtyAll += q;

      const period = viewMode === 'DAILY' ? (r.date || 'Unknown') : (r.month || r.date?.substring(0, 7) || 'Unknown');
      const eventName = r.event?.trim() || 'No Event Name';
      const key = `${period}__${eventName}`;

      if (!map[key]) {
        map[key] = {
          period,
          event: eventName,
          qty: 0,
          price: 0,
          members: new Set(),
        };
      }

      map[key].qty += q;
      map[key].price += p;
      if (r.member) map[key].members.add(r.member);
    });

    const items = Object.values(map).map((item) => ({
      ...item,
      pct: totalQtyAll > 0 ? ((item.qty / totalQtyAll) * 100).toFixed(1) : '0.0',
      memberCount: item.members.size,
    }));

    items.sort((a, b) => (a.period < b.period ? 1 : -1));
    return { items, totalQtyAll };
  }, [filteredTransactions, viewMode]);

  if (loading) return <div className="loading-state">Loading Events Pivot...</div>;

  return (
    <div className="events-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Events</h1>
        </div>
        <div className="btn-group">
          <button className={`btn-toggle ${viewMode === 'DAILY' ? 'active' : ''}`} onClick={() => setViewMode('DAILY')}>Daily View</button>
          <button className={`btn-toggle ${viewMode === 'MONTHLY' ? 'active' : ''}`} onClick={() => setViewMode('MONTHLY')}>Monthly View</button>
        </div>
      </div>

      <FilterBar transactions={allTransactions} />

      <div className="table-card card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{viewMode === 'DAILY' ? 'Date' : 'Month'}</th>
                <th>Event Name</th>
                <th>Attended Members</th>
                <th>Quantity (pcs)</th>
                <th>% Share</th>
                <th>Total Spend (THB)</th>
              </tr>
            </thead>
            <tbody>
              {eventsPivot.items.map((r, i) => (
                <tr key={i}>
                  <td><strong>{r.period}</strong></td>
                  <td>{r.event}</td>
                  <td>{r.memberCount} members ({Array.from(r.members).slice(0, 3).join(', ')}{r.members.size > 3 ? '...' : ''})</td>
                  <td><strong>{r.qty}</strong></td>
                  <td>{r.pct}%</td>
                  <td>฿{r.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .events-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-title { font-size: 1.6rem; }
        .page-subtitle { color: var(--text-muted); font-size: 0.88rem; margin-top: -12px; }

        .btn-group {
          display: flex;
          background-color: var(--bg-surface-2);
          padding: 3px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
        }

        .btn-toggle {
          background: none;
          border: none;
          color: var(--text-muted);
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 500;
          border-radius: 4px;
          cursor: pointer;

          &.active {
            background-color: var(--bg-surface-3);
            color: var(--text-main);
            font-weight: 600;
          }
        }

        .table-wrapper {
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
