'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { useChekiData } from '@/hooks/useChekiData';
import { FilterBar } from '@/components/layout/FilterBar';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { ArrowUpDown } from 'lucide-react';

type EventSortKey = 'period' | 'event' | 'memberCount' | 'qty' | 'pct' | 'price';

export default function EventsPage() {
  const { user, isDemoUser } = useAuth();
  const { allTransactions, filteredTransactions, loading } = useChekiData();
  const [viewMode, setViewMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [sortKey, setSortKey] = useState<EventSortKey>('period');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (key: EventSortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'event' ? true : false);
    }
  };

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

    items.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortKey === 'pct') {
        valA = parseFloat(a.pct);
        valB = parseFloat(b.pct);
      } else if (sortKey === 'event') {
        valA = a.event.toLowerCase();
        valB = b.event.toLowerCase();
      } else if (sortKey === 'period') {
        valA = a.period;
        valB = b.period;
      } else {
        valA = a[sortKey];
        valB = b[sortKey];
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return { items, totalQtyAll };
  }, [filteredTransactions, viewMode, sortKey, sortAsc]);

  if (!user && !isDemoUser) return <LoginPrompt />;
  if (loading) return <CircularSpinner />;

  return (
    <div className="events-page">
      <FilterBar transactions={allTransactions} />

      <div className="events-controls">
        <div className="btn-group">
          <button className={`btn-toggle ${viewMode === 'DAILY' ? 'active' : ''}`} onClick={() => setViewMode('DAILY')}>Daily View</button>
          <button className={`btn-toggle ${viewMode === 'MONTHLY' ? 'active' : ''}`} onClick={() => setViewMode('MONTHLY')}>Monthly View</button>
        </div>
      </div>

      <div className="table-card card">
        <div className="table-wrapper">
          <table className="events-table">
            <thead>
              <tr>
                <th className="sortable-th" onClick={() => handleSort('period')}>
                  {viewMode === 'DAILY' ? 'Date' : 'Month'} {sortKey === 'period' ? (sortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                </th>
                <th className="sortable-th" onClick={() => handleSort('event')}>
                  Event Name {sortKey === 'event' ? (sortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                </th>
                <th className="sortable-th" onClick={() => handleSort('qty')}>
                  Quantity {sortKey === 'qty' ? (sortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                </th>
                <th className="sortable-th" onClick={() => handleSort('pct')}>
                  % Qty {sortKey === 'pct' ? (sortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                </th>
                <th className="sortable-th" onClick={() => handleSort('price')}>
                  Total Price (THB) {sortKey === 'price' ? (sortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                </th>
              </tr>
            </thead>
            <tbody>
              {eventsPivot.items.map((r, i) => {
                const prevRow = i > 0 ? eventsPivot.items[i - 1] : null;
                const isSamePeriod = prevRow && prevRow.period === r.period;
                const isGroupStart = !isSamePeriod;

                return (
                  <tr key={i} className={isGroupStart && i > 0 ? 'group-start-row' : ''}>
                    <td className="period-cell">
                      {isGroupStart ? <strong>{r.period}</strong> : ''}
                    </td>
                    <td>{r.event}</td>
                    <td>{r.qty}</td>
                    <td><strong>{r.pct}%</strong></td>
                    <td>{r.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .events-page {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .events-controls {
          display: flex;
          align-items: center;
          width: fit-content;
        }

        .btn-group {
          display: inline-flex;
          width: fit-content;
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

        .table-card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          box-sizing: border-box;
        }

        .table-wrapper {
          overflow-x: auto;
          width: 100%;
          max-width: 100%;
          -webkit-overflow-scrolling: touch;
          display: block;
        }

        .events-table {
          width: 100%;
          min-width: 650px;
          border-collapse: collapse;
        }

        .sortable-th {
          cursor: pointer;
          user-select: none;
          &:hover {
            color: var(--accent-primary);
          }
        }

        .group-start-row td {
          border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
        }
      `}</style>
    </div>
  );
}
