'use client';

import React, { useState, useMemo } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { FilterBar } from '@/components/layout/FilterBar';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { Transaction } from '@/types/cheki';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Users } from 'lucide-react';
import { LightboxGallery, LightboxItem } from '@/components/common/LightboxGallery';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { extractDirectImageUrl } from '@/lib/imageUtils';
import { CircularSpinner } from '@/components/common/CircularSpinner';

interface GroupedChekiPhoto {
  key: string;
  imgUrl: string;
  cleanUrl: string;
  totalQty: number;
  members: string[];
  colors: string[];
  events: string[];
  groups: string[];
  rows: Transaction[];
}

function groupTransactionsByImage(rows: Transaction[]): GroupedChekiPhoto[] {
  const map = new Map<string, GroupedChekiPhoto>();

  rows.forEach((r) => {
    const rawUrl = r.img?.trim() || '';
    if (!rawUrl || rawUrl.toLowerCase() === 'none') return;
    const cleanUrl = extractDirectImageUrl(rawUrl);
    const key = cleanUrl || rawUrl;

    if (!map.has(key)) {
      map.set(key, {
        key,
        imgUrl: rawUrl,
        cleanUrl,
        totalQty: 0,
        members: [],
        colors: [],
        events: [],
        groups: [],
        rows: [],
      });
    }

    const item = map.get(key)!;
    item.totalQty += (r.quantity || 1);
    if (r.member && !item.members.includes(r.member)) item.members.push(r.member);
    if (r.color && !item.colors.includes(r.color)) item.colors.push(r.color);
    if (r.event && !item.events.includes(r.event)) item.events.push(r.event);
    if (r.group && !item.groups.includes(r.group)) item.groups.push(r.group);
    item.rows.push(r);
  });

  return Array.from(map.values());
}

export default function CalendarPage() {
  const { user, isDemoUser } = useAuth();
  const { allTransactions, filteredTransactions, members, colors, loading } = useChekiData();

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lightboxState, setLightboxState] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });

  const monthNames = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const colorHexMap = useMemo(() => {
    const map: Record<string, string> = {};
    colors.forEach(c => {
      map[c.color] = c.color_code;
    });
    return map;
  }, [colors]);

  const memberAvatarMap = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach(m => {
      if (m.member_image && m.member_image !== 'None') {
        map[m.member_name] = m.member_image;
      }
    });
    return map;
  }, [members]);

  // Aggregate daily counts & rows for active month
  const dayDataMap = useMemo(() => {
    const map: Record<string, { qty: number; rows: Transaction[] }> = {};
    filteredTransactions.forEach(r => {
      if (r.date) {
        if (!map[r.date]) {
          map[r.date] = { qty: 0, rows: [] };
        }
        map[r.date].qty += (r.quantity || 1);
        map[r.date].rows.push(r);
      }
    });
    return map;
  }, [filteredTransactions]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    // Prev month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, d);
      const dateStr = prevDate.toISOString().split('T')[0];
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const dateStr = nextDate.toISOString().split('T')[0];
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    setSelectedDate(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDate(null);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const maxQtyInMonth = useMemo(() => {
    let max = 0;
    calendarDays.forEach(d => {
      if (d.isCurrentMonth && dayDataMap[d.dateStr]) {
        if (dayDataMap[d.dateStr].qty > max) max = dayDataMap[d.dateStr].qty;
      }
    });
    return max || 1;
  }, [calendarDays, dayDataMap]);

  const getHeatClass = (qty: number) => {
    if (qty === 0) return '';
    const ratio = qty / maxQtyInMonth;
    if (ratio <= 0.25) return 'heat-1';
    if (ratio <= 0.5) return 'heat-2';
    if (ratio <= 0.75) return 'heat-3';
    return 'heat-4';
  };

  // Requirement 3: Active rows depend on selectedDate or active month
  const activeViewRows = useMemo(() => {
    if (selectedDate) {
      return dayDataMap[selectedDate]?.rows || [];
    }
    // Default / cal-nav-card view: All rows in current month
    const monthRows: Transaction[] = [];
    calendarDays.forEach((d) => {
      if (d.isCurrentMonth && dayDataMap[d.dateStr]) {
        monthRows.push(...dayDataMap[d.dateStr].rows);
      }
    });
    return monthRows;
  }, [selectedDate, calendarDays, dayDataMap]);

  // Requirement 1: Group active transactions by unique image URL
  const groupedPhotos = useMemo(() => {
    return groupTransactionsByImage(activeViewRows);
  }, [activeViewRows]);

  // Gallery items for Lightbox navigation
  const monthGalleryItems: LightboxItem[] = useMemo(() => {
    return groupedPhotos.map((g) => {
      const memberLabel = g.members.length > 2
        ? `${g.members.slice(0, 2).join(', ')} +${g.members.length - 2}`
        : g.members.join(', ');
      return {
        url: g.imgUrl,
        title: `${memberLabel} ${g.groups.length > 0 ? '• ' + g.groups.join(', ') : ''}`,
        subtitle: g.events.join(', '),
      };
    });
  }, [groupedPhotos]);

  // Requirement 2: Header structure and wording (Attached Image 2)
  const viewHeaderInfo = useMemo(() => {
    if (selectedDate) {
      const dObj = new Date(selectedDate + 'T00:00:00');
      const dateFormatted = dObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const events = Array.from(new Set(activeViewRows.map((r) => r.event).filter(Boolean)));
      const totalQty = activeViewRows.reduce((sum, r) => sum + (r.quantity || 1), 0);
      return {
        title: `${dateFormatted} (${totalQty})`,
        eventsStr: events.join(', '),
        isDateSelected: true,
      };
    } else {
      const monthTitle = `${monthNames[currentMonth]} ${currentYear}`;
      const totalQty = activeViewRows.reduce((sum, r) => sum + (r.quantity || 1), 0);
      const events = Array.from(new Set(activeViewRows.map((r) => r.event).filter(Boolean)));
      return {
        title: `${monthTitle} (${totalQty})`,
        eventsStr: events.length > 0 ? `${events.length} Events: ${events.slice(0, 4).join(', ')}${events.length > 4 ? '...' : ''}` : '',
        isDateSelected: false,
      };
    }
  }, [selectedDate, activeViewRows, currentMonth, currentYear, monthNames]);

  // Monthly summary metrics for top strip
  const monthSummary = useMemo(() => {
    let monthQty = 0;
    let monthPrice = 0;
    const membersSet = new Set<string>();
    const eventsSet = new Set<string>();

    calendarDays.forEach((d) => {
      if (d.isCurrentMonth && dayDataMap[d.dateStr]) {
        dayDataMap[d.dateStr].rows.forEach((r) => {
          monthQty += r.quantity || 1;
          monthPrice += r.totalPrice || 0;
          if (r.member) membersSet.add(r.member);
          if (r.event) eventsSet.add(r.event);
        });
      }
    });

    return {
      monthQty,
      monthPrice,
      uniqueMembersCount: membersSet.size,
      eventsCount: eventsSet.size,
    };
  }, [calendarDays, dayDataMap]);

  if (!user && !isDemoUser) return <LoginPrompt />;
  if (loading) return <CircularSpinner />;

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
        </div>
      </div>

      <FilterBar transactions={allTransactions} />

      {/* Requirement 3: Clicking cal-nav-card resets to full month gallery view */}
      <div className="cal-nav-card card clickable-cal-nav" onClick={() => setSelectedDate(null)} title="Show full month gallery">
        <div className="cal-title-section">
          <h2>{monthNames[currentMonth]} {currentYear}</h2>

          <div className="month-summary-strip">
            <span className="summary-pill">📸 {monthSummary.monthQty} pcs</span>
            <span className="summary-pill">฿ {monthSummary.monthPrice.toLocaleString()} THB</span>
            <span className="summary-pill">👤 {monthSummary.uniqueMembersCount} Members</span>
            <span className="summary-pill">🎪 {monthSummary.eventsCount} Events</span>
          </div>
        </div>

        <div className="btn-group" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth}>
            <ChevronLeft size={16} /> Prev
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentYear(now.getFullYear()); setCurrentMonth(now.getMonth()); setSelectedDate(null); }}>
            Today
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleNextMonth}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 7-column Calendar Grid */}
      <div className="cal-grid-card card">
        <div className="cal-grid-header">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
            <div key={w} className="weekday-header">{w}</div>
          ))}
        </div>

        <div className="cal-grid-body">
          {calendarDays.map((cell, idx) => {
            const data = dayDataMap[cell.dateStr];
            const qty = data?.qty || 0;
            const heatClass = getHeatClass(qty);
            const isSelected = selectedDate === cell.dateStr;

            const uniqueMembers = Array.from(new Set(data?.rows.map(r => r.member) || []));

            return (
              <div
                key={idx}
                className={`cal-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${heatClass} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDate(isSelected ? null : cell.dateStr)}
              >
                <div className="day-cell-top">
                  <span className="day-num">{cell.dayNum}</span>
                  {qty > 0 && <span className="qty-badge">{qty}</span>}
                </div>

                {uniqueMembers.length > 0 && (
                  <div className="avatar-grid">
                    {uniqueMembers.slice(0, 4).map(m => (
                      <MemberAvatar
                        key={m}
                        name={m}
                        src={memberAvatarMap[m]}
                        size={18}
                      />
                    ))}
                    {uniqueMembers.length > 4 && (
                      <div className="mini-avatar more">+{uniqueMembers.length - 4}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo Gallery Card (Month View by default or Selected Day View) */}
      <div className="gallery-section-card card">
        {/* Requirement 2: Wording & Structure matching Attached Image 2 */}
        <div className="day-header-banner">
          <div className="day-header-left-bar" />
          <div className="day-header-content">
            <span className="day-header-icon">📅</span>
            <span className="day-header-date">{viewHeaderInfo.title}</span>
            {viewHeaderInfo.eventsStr && (
              <>
                <span className="day-header-separator"> — </span>
                <span className="day-header-events">{viewHeaderInfo.eventsStr}</span>
              </>
            )}
          </div>
          {viewHeaderInfo.isDateSelected && (
            <button className="btn-close-view" onClick={() => setSelectedDate(null)} title="Show full month gallery">
              <X size={16} />
            </button>
          )}
        </div>

        {groupedPhotos.length === 0 ? (
          <div className="no-photos-placeholder">
            <ImageIcon size={32} />
            <p>No cheki photos recorded for {selectedDate ? selectedDate : monthNames[currentMonth] + ' ' + currentYear}.</p>
          </div>
        ) : (
          /* Requirement 1: Grouped cards matching Attached Image 1 */
          <div className="grouped-gallery-grid">
            {groupedPhotos.map((photo, pIdx) => {
              const memberTitle = photo.members.length > 2
                ? `${photo.members.slice(0, 2).join(', ')} +${photo.members.length - 2}`
                : photo.members.join(', ') || 'Cheki Photo';

              return (
                <div 
                  key={photo.key} 
                  className="grouped-cheki-card"
                  onClick={() => setLightboxState({ open: true, index: pIdx })}
                >
                  {/* Top Left Badge */}
                  {photo.members.length >= 2 ? (
                    <div className="badge-pill gold">
                      <Users size={12} /> {photo.members.length} members
                    </div>
                  ) : photo.totalQty >= 2 ? (
                    <div className="badge-pill dark">
                      ×{photo.totalQty}
                    </div>
                  ) : null}

                  {/* Top Right Color Dots (Attached Image 1 style) */}
                  <div className="color-dots-group">
                    {photo.colors.map((cName) => {
                      const hex = colorHexMap[cName] || (cName.toLowerCase() === 'white' ? '#ffffff' : '#7f8c8d');
                      return (
                        <span 
                          key={cName} 
                          className="color-dot" 
                          style={{ backgroundColor: hex }} 
                          title={cName} 
                        />
                      );
                    })}
                  </div>

                  {/* Photo Thumbnail */}
                  <div className="grouped-img-wrap">
                    {/* eslint-disable-next-next/no-img-element */}
                    <img src={photo.cleanUrl} alt={memberTitle} className="grouped-img" />
                  </div>

                  {/* Bottom Footer Label */}
                  <div className="photo-card-footer">
                    <span className="footer-member-name">{memberTitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Gallery Modal with Next/Prev Navigation */}
      {lightboxState.open && (
        <LightboxGallery 
          items={monthGalleryItems} 
          initialIndex={lightboxState.index} 
          onClose={() => setLightboxState({ open: false, index: 0 })} 
        />
      )}

      <style jsx>{`
        .calendar-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-title { font-size: 1.6rem; }

        .clickable-cal-nav {
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
          &:hover {
            border-color: var(--accent-primary);
          }
        }

        .cal-nav-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .cal-title-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .cal-title-section h2 {
          font-size: 1.3rem;
          font-weight: 700;
        }

        .month-summary-strip {
          display: flex;
          gap: 8px;
        }

        .summary-pill {
          background-color: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.76rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .cal-grid-card {
          padding: 16px;
        }

        .cal-grid-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          margin-bottom: 8px;
        }

        .weekday-header {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .cal-grid-body {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        .cal-day-cell {
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          min-height: 80px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          &:hover {
            border-color: var(--accent-primary);
          }
          &.other-month {
            opacity: 0.35;
          }
          &.selected {
            border-color: var(--accent-primary);
            box-shadow: 0 0 12px rgba(212, 168, 75, 0.35);
          }
        }

        .cal-day-cell.heat-1 { background-color: rgba(212, 168, 75, 0.08); }
        .cal-day-cell.heat-2 { background-color: rgba(212, 168, 75, 0.16); }
        .cal-day-cell.heat-3 { background-color: rgba(212, 168, 75, 0.26); }
        .cal-day-cell.heat-4 { background-color: rgba(212, 168, 75, 0.38); }

        .day-cell-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .day-num {
          font-size: 0.84rem;
          font-weight: 700;
        }

        .qty-badge {
          background-color: var(--accent-primary);
          color: #000;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 10px;
        }

        .avatar-grid {
          display: flex;
          gap: 2px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .mini-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          overflow: hidden;
          background-color: var(--bg-surface-3);
          font-size: 0.6rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--text-muted);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .mini-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .gallery-section-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Day Header Banner Gold Theme Style */
        .day-header-banner {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, var(--bg-surface-2), #1a160d);
          border: 1px solid rgba(212, 168, 75, 0.35);
          border-radius: 8px;
          padding: 10px 16px;
          overflow: hidden;
        }

        .day-header-left-bar {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 4px;
          background: var(--accent-primary);
        }

        .day-header-content {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .day-header-icon {
          font-size: 1rem;
        }

        .day-header-date {
          color: var(--accent-primary);
          font-weight: 700;
        }

        .day-header-separator {
          color: rgba(255,255,255,0.4);
        }

        .day-header-events {
          color: var(--text-main);
          font-weight: 500;
        }

        .btn-close-view {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          &:hover { color: #fff; background: rgba(255,255,255,0.1); }
        }

        .no-photos-placeholder {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        /* Attached Image 1 Grouped Gallery Grid Style */
        .grouped-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        .grouped-cheki-card {
          position: relative;
          background-color: #161822;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
          &:hover {
            transform: translateY(-3px);
            border-color: rgba(255,255,255,0.3);
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          }
        }

        /* Image 1 Badges */
        .badge-pill {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 14px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }

        .badge-pill.gold {
          background-color: var(--accent-primary);
          color: #0b0d14;
          font-weight: 800;
        }

        .badge-pill.dark {
          background-color: rgba(24, 27, 38, 0.88);
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .color-dots-group {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.4);
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }

        .grouped-img-wrap {
          width: 100%;
          height: 220px;
          background-color: #0d0e14;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .grouped-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-card-footer {
          padding: 10px 12px;
          background-color: #12131b;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .footer-member-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }
      `}</style>
    </div>
  );
}
