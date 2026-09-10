'use client';

import React, { useState, useMemo } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { FilterBar } from '@/components/layout/FilterBar';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { ArrowUpDown } from 'lucide-react';

type EventSortKey = 'period' | 'event' | 'memberCount' | 'qty' | 'pct' | 'price';

export default function EventsPage() {
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
                <th className="sortable-th" onClick={() => handleSort('memberCount')}>
                  Members {sortKey === 'memberCount' ? (sortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                </th>
                <th className="sortable-th" onClick={() => handleSort('qty')}>
                  QTY {sortKey === 'qty' ? (sortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                </th>
                <th className="sortable-th" onClick={() => handleSort('pct')}>
                  % {sortKey === 'pct' ? (sortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                </th>
                <th className="sortable-th" onClick={() => handleSort('price')}>
                  Total (THB) {sortKey === 'price' ? (sortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                </th>
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
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
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
      `}</style>
    </div>
  );
}
