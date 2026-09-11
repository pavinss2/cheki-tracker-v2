'use client';

import React, { useState, useMemo } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { FilterBar } from '@/components/layout/FilterBar';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { Transaction } from '@/types/cheki';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Users, Plus, Save } from 'lucide-react';
import { LightboxGallery, LightboxItem } from '@/components/common/LightboxGallery';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { extractDirectImageUrl } from '@/lib/imageUtils';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { addTransaction } from '@/lib/dataStore';

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
  const { allTransactions, members, colors, types, userId, loading } = useChekiData();

  const memberAvatarMap = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      if (m.member_image && m.member_image !== 'None') {
        map[m.member_name] = m.member_image;
      }
    });
    return map;
  }, [members]);

  const now = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [lightboxState, setLightboxState] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  // Modal State for "+ New Transaction" feature from Calendar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalMember, setModalMember] = useState('');
  const [modalGroup, setModalGroup] = useState('');
  const [modalColor, setModalColor] = useState('White');
  const [modalEvent, setModalEvent] = useState('');
  const [modalType, setModalType] = useState('Cheki');
  const [modalQty, setModalQty] = useState(1);
  const [modalPrice, setModalPrice] = useState(300);
  const [modalImg, setModalImg] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [isSubmittingTrans, setIsSubmittingTrans] = useState(false);

  const handleOpenAddModal = (presetDate?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setModalDate(presetDate || selectedDate || todayStr);
    setModalMember('');
    setModalGroup('');
    setModalColor('White');
    setModalEvent('');
    setModalType('Cheki');
    setModalQty(1);
    setModalPrice(300);
    setModalImg('');
    setModalNotes('');
    setIsAddModalOpen(true);
  };

  const handleMemberSelect = (memberName: string) => {
    setModalMember(memberName);
    const found = members.find((m) => m.member_name.toLowerCase() === memberName.toLowerCase());
    if (found) {
      if (found.group) setModalGroup(found.group);
      if (found.color) setModalColor(found.color);
    }
  };

  const handleSaveNewTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMember.trim() || !modalDate.trim()) {
      alert("Please fill in required fields: Date and Member.");
      return;
    }

    setIsSubmittingTrans(true);
    try {
      await addTransaction({
        userId,
        member: modalMember.trim(),
        color: modalColor.trim() || 'White',
        group: modalGroup.trim(),
        nationality: '🇹🇭 TH',
        date: modalDate.trim(),
        month: modalDate.trim().substring(0, 7),
        year: modalDate.trim().substring(0, 4),
        event: modalEvent.trim(),
        description: modalNotes.trim(),
        type: modalType.trim() || 'Cheki',
        location: 'Bangkok',
        quantity: Number(modalQty) || 1,
        totalPrice: Number(modalPrice) || 300,
        img: modalImg.trim(),
        talkTopic: modalNotes.trim(),
        company: '',
      }, isDemoUser);

      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Error creating transaction:", err);
      alert("Failed to save transaction: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmittingTrans(false);
    }
  };

  const monthNames = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const colorHexMap = useMemo(() => {
    const map: Record<string, string> = {
      White: '#ffffff',
      Red: '#e74c3c',
      Blue: '#3498db',
      Yellow: '#f1c40f',
      Green: '#2ecc71',
      Pink: '#e84393',
      Purple: '#9b59b6',
      Orange: '#e67e22',
      Black: '#2c3e50',
    };
    colors.forEach(c => {
      map[c.color] = c.color_code;
    });
    return map;
  }, [colors]);

  // Aggregate daily counts & rows for active month
  const dayDataMap = useMemo(() => {
    const map: Record<string, { qty: number; rows: Transaction[] }> = {};
    allTransactions.forEach(r => {
      if (r.date) {
        if (!map[r.date]) {
          map[r.date] = { qty: 0, rows: [] };
        }
        map[r.date].qty += (r.quantity || 1);
        map[r.date].rows.push(r);
      }
    });
    return map;
  }, [allTransactions]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    let startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    // Prev month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, d);
      const yyyy = prevDate.getFullYear();
      const mm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      days.push({ dateStr: `${yyyy}-${mm}-${dd}`, dayNum: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding (make total grid 35 or 42)
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      days.push({ dateStr: `${yyyy}-${mm}-${dd}`, dayNum: d, isCurrentMonth: false });
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

  // Active rows depend on selectedDate or active month
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

  // Group active transactions by unique image URL
  const groupedPhotos = useMemo(() => {
    return groupTransactionsByImage(activeViewRows);
  }, [activeViewRows]);

  // Group photos by date for Full Month View (Separated Days)
  const photosByDate = useMemo(() => {
    const dates = Array.from(new Set(activeViewRows.map(r => r.date).filter(Boolean))).sort();

    return dates.map((dateStr) => {
      const rowsForDate = activeViewRows.filter((r) => r.date === dateStr);
      const groupedForDate = groupTransactionsByImage(rowsForDate);
      const dObj = new Date(dateStr + 'T00:00:00');
      const dateFormatted = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const eventsStr = Array.from(new Set(rowsForDate.map((r) => r.event).filter(Boolean))).join(', ');
      const totalQtyForDate = rowsForDate.reduce((sum, r) => sum + (r.quantity || 1), 0);

      return {
        dateStr,
        dateFormatted,
        eventsStr,
        totalQtyForDate,
        groupedPhotos: groupedForDate,
      };
    }).filter((d) => d.groupedPhotos.length > 0);
  }, [activeViewRows]);

  // Gallery items for Lightbox navigation with rich white-gold specs
  const monthGalleryItems: LightboxItem[] = useMemo(() => {
    return groupedPhotos.map((g) => {
      const sampleRow = g.rows[0];
      const rawDateStr = sampleRow?.date || selectedDate || '';
      const dateFormatted = rawDateStr 
        ? new Date(rawDateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
        : '';

      const memberLabel = g.members.length > 9
        ? `${g.members.slice(0, 9).join(', ')} +${g.members.length - 9}`
        : g.members.join(', ');

      return {
        url: g.imgUrl,
        title: memberLabel || 'Cheki Photo',
        subtitle: g.events.join(', '),
        members: g.members,
        event: g.events.join(', '),
        date: dateFormatted,
        qty: g.totalQty,
      };
    });
  }, [groupedPhotos, selectedDate]);

  // Header structure with MMM month formatting
  const viewHeaderInfo = useMemo(() => {
    if (selectedDate) {
      const dObj = new Date(selectedDate + 'T00:00:00');
      const dateFormatted = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const events = Array.from(new Set(activeViewRows.map((r) => r.event).filter(Boolean)));
      const totalQty = activeViewRows.reduce((sum, r) => sum + (r.quantity || 1), 0);
      return {
        title: `${dateFormatted} (${totalQty})`,
        eventsStr: events.join(', '),
        isDateSelected: true,
      };
    } else {
      const monthShort = monthNames[currentMonth].substring(0, 3);
      const monthTitle = `${monthShort} ${currentYear}`;
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
      <FilterBar transactions={allTransactions} />

      {/* Calendar Header Card */}
      <div className="cal-nav-card card clickable-cal-nav" onClick={() => setSelectedDate(null)} title="Show full month gallery">
        <div className="cal-title-section">
          <div className="month-year-header">
            <h2>{monthNames[currentMonth].substring(0, 3)} {currentYear}</h2>
            <div className="header-button-group">
              <button 
                className="btn btn-secondary btn-sm btn-today" 
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentYear(now.getFullYear());
                  setCurrentMonth(now.getMonth());
                  setSelectedDate(null);
                }}
              >
                Today
              </button>
            </div>
          </div>

          <div className="month-summary-strip">
            <span className="summary-pill">📸 {monthSummary.monthQty} pcs</span>
            <span className="summary-pill">฿ {monthSummary.monthPrice.toLocaleString()}</span>
            <span className="summary-pill">👤 {monthSummary.uniqueMembersCount} Member</span>
            <span className="summary-pill">🎪 {monthSummary.eventsCount} Event</span>
          </div>
        </div>

        <div className="btn-group" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth} title="Previous Month">
            <ChevronLeft size={16} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleNextMonth} title="Next Month">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 7-column Calendar Grid */}
      <div className="cal-grid-card card">
        <div className="cal-grid-wrapper">
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
      </div>

      {/* Photo Gallery Card (Month View by default or Selected Day View) */}
      <div className="gallery-section-card card">
        {selectedDate ? (
          /* SINGLE SELECTED DAY VIEW */
          <div>
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

              <div className="day-header-actions">
                <button
                  className="btn btn-primary btn-sm btn-add-day-cheki"
                  onClick={() => handleOpenAddModal(selectedDate || undefined)}
                  title="Add new cheki transaction for this date"
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
                <button className="btn-close-view" onClick={() => setSelectedDate(null)} title="Show full month gallery">
                  <X size={16} />
                </button>
              </div>
            </div>

            {groupedPhotos.length === 0 ? (
              <div className="no-photos-placeholder">
                <ImageIcon size={32} />
                <p>No cheki photos recorded for {selectedDate}.</p>
              </div>
            ) : (
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
                      {photo.members.length >= 2 ? (
                        <div className="badge-pill gold">
                          <Users size={12} /> {photo.members.length} members
                        </div>
                      ) : photo.totalQty >= 2 ? (
                        <div className="badge-pill dark">
                          ×{photo.totalQty}
                        </div>
                      ) : null}

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

                      <div className="grouped-img-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.cleanUrl} alt={memberTitle} className="grouped-img" />
                      </div>

                      <div className="photo-card-footer">
                        <span className="footer-member-name">{memberTitle}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* FULL MONTH VIEW: SEPARATED BY DAY */
          <div>
            {photosByDate.length === 0 ? (
              <div className="no-photos-placeholder">
                <ImageIcon size={32} />
                <p>No cheki photos recorded for {monthNames[currentMonth].substring(0, 3)} {currentYear}.</p>
              </div>
            ) : (
              <div className="full-month-gallery-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {photosByDate.map((dayGroup) => (
                  <div key={dayGroup.dateStr} className="day-gallery-block" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="day-header-banner">
                      <div className="day-header-left-bar" />
                      <div className="day-header-content">
                        <span className="day-header-icon">📅</span>
                        <span className="day-header-date">
                          {dayGroup.dateFormatted} ({dayGroup.totalQtyForDate})
                        </span>
                        {dayGroup.eventsStr && (
                          <>
                            <span className="day-header-separator"> — </span>
                            <span className="day-header-events">{dayGroup.eventsStr}</span>
                          </>
                        )}
                      </div>

                      <div className="day-header-actions">
                        <button
                          className="btn btn-primary btn-sm btn-add-day-cheki"
                          onClick={() => handleOpenAddModal(dayGroup.dateStr)}
                          title="Add new cheki transaction for this date"
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>

                    <div className="grouped-gallery-grid">
                      {dayGroup.groupedPhotos.map((photo) => {
                        const memberTitle = photo.members.length > 2
                          ? `${photo.members.slice(0, 2).join(', ')} +${photo.members.length - 2}`
                          : photo.members.join(', ') || 'Cheki Photo';

                        const globalIdx = monthGalleryItems.findIndex(
                          (item) => extractDirectImageUrl(item.url) === photo.cleanUrl || item.url === photo.imgUrl
                        );

                        return (
                          <div 
                            key={photo.key} 
                            className="grouped-cheki-card"
                            onClick={() => setLightboxState({ open: true, index: globalIdx >= 0 ? globalIdx : 0 })}
                          >
                            {photo.members.length >= 2 ? (
                              <div className="badge-pill gold">
                                <Users size={12} /> {photo.members.length} members
                              </div>
                            ) : photo.totalQty >= 2 ? (
                              <div className="badge-pill dark">
                                ×{photo.totalQty}
                              </div>
                            ) : null}

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

                            <div className="grouped-img-wrap">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo.cleanUrl} alt={memberTitle} className="grouped-img" />
                            </div>

                            <div className="photo-card-footer">
                              <span className="footer-member-name">{memberTitle}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* New Transaction Creation Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-dialog card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📸 Add New Cheki Transaction</h3>
              <button className="btn-close-modal" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNewTransaction} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    required
                    className="input-control"
                  />
                </div>

                <div className="form-group">
                  <label>Member Name *</label>
                  <input
                    type="text"
                    list="member-suggestions"
                    value={modalMember}
                    onChange={(e) => handleMemberSelect(e.target.value)}
                    placeholder="Select or enter member..."
                    required
                    className="input-control"
                  />
                  <datalist id="member-suggestions">
                    {members.map((m) => (
                      <option key={m.id} value={m.member_name} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label>Group</label>
                  <input
                    type="text"
                    value={modalGroup}
                    onChange={(e) => setModalGroup(e.target.value)}
                    placeholder="Group name"
                    className="input-control"
                  />
                </div>

                <div className="form-group">
                  <label>Color</label>
                  <select
                    value={modalColor}
                    onChange={(e) => setModalColor(e.target.value)}
                    className="input-control"
                  >
                    {colors.length > 0 ? (
                      colors.map((c) => (
                        <option key={c.id} value={c.color}>{c.color}</option>
                      ))
                    ) : (
                      <>
                        <option value="White">White</option>
                        <option value="Red">Red</option>
                        <option value="Blue">Blue</option>
                        <option value="Yellow">Yellow</option>
                        <option value="Green">Green</option>
                        <option value="Pink">Pink</option>
                        <option value="Purple">Purple</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Event Name</label>
                  <input
                    type="text"
                    value={modalEvent}
                    onChange={(e) => setModalEvent(e.target.value)}
                    placeholder="e.g. CosQuest 3"
                    className="input-control"
                  />
                </div>

                <div className="form-group">
                  <label>Cheki Type</label>
                  <select
                    value={modalType}
                    onChange={(e) => setModalType(e.target.value)}
                    className="input-control"
                  >
                    {types.length > 0 ? (
                      types.map((t) => (
                        <option key={t.id} value={t.type}>{t.type}</option>
                      ))
                    ) : (
                      <>
                        <option value="Cheki">Cheki</option>
                        <option value="Digital Cheki">Digital Cheki</option>
                        <option value="Signed Photo">Signed Photo</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={modalQty}
                    onChange={(e) => setModalQty(Number(e.target.value) || 1)}
                    className="input-control"
                  />
                </div>

                <div className="form-group">
                  <label>Total Price (THB)</label>
                  <input
                    type="number"
                    min={0}
                    value={modalPrice}
                    onChange={(e) => setModalPrice(Number(e.target.value) || 0)}
                    className="input-control"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Photo URL (Google Drive / Direct Image)</label>
                  <input
                    type="url"
                    value={modalImg}
                    onChange={(e) => setModalImg(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="input-control"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Talk Topic / Notes</label>
                  <textarea
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Memorable talk topic or event notes..."
                    rows={2}
                    className="input-control textarea-control"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTrans}
                  className="btn btn-primary"
                >
                  <Save size={16} />
                  <span>{isSubmittingTrans ? 'Saving...' : 'Save Transaction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-page {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .cal-nav-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .clickable-cal-nav {
          cursor: pointer;
          transition: border-color 0.2s;
          &:hover {
            border-color: var(--border-strong);
          }
        }

        .cal-title-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .month-year-header {
          display: flex;
          align-items: center;
          gap: 12px;
          h2 {
            margin: 0;
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--text-main);
          }
        }

        .header-button-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-add-cheki {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }

        .month-summary-strip {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-wrap: wrap;
        }

        .summary-pill {
          background-color: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .btn-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cal-grid-card {
          padding: 16px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          box-sizing: border-box;
        }

        .cal-grid-wrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cal-grid-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .weekday-header {
          padding: 8px 0;
        }

        .cal-grid-body {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        @media (max-width: 640px) {
          .cal-grid-header, .cal-grid-body {
            min-width: 500px;
          }
          .cal-grid-card {
            padding: 10px;
          }
          .cal-day-cell {
            aspect-ratio: 1 / 1;
          }
        }

        .cal-day-cell {
          aspect-ratio: 1 / 0.6;
          background-color: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
          position: relative;
          overflow: hidden;

          &:hover {
            transform: translateY(-2px);
            border-color: var(--accent-primary);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }

          &.other-month {
            opacity: 0.35;
          }

          &.selected {
            border-color: var(--accent-primary) !important;
            box-shadow: 0 0 0 2px var(--accent-primary) !important;
          }

          &.heat-1 { background-color: rgba(212, 168, 75, 0.12); }
          &.heat-2 { background-color: rgba(212, 168, 75, 0.25); }
          &.heat-3 { background-color: rgba(212, 168, 75, 0.4); }
          &.heat-4 { background-color: rgba(212, 168, 75, 0.6); }
        }

        .day-cell-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .day-num {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .qty-badge {
          background-color: var(--accent-primary);
          color: #0b0d14;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 10px;
        }

        .avatar-grid {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-top: auto;
          flex-wrap: wrap;
        }

        .mini-avatar.more {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 700;
          margin-left: 2px;
        }

        .gallery-section-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .day-header-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
          position: relative;
          gap: 2px
        }

        .day-header-left-bar {
          position: absolute;
          left: -20px;
          top: 0;
          bottom: 12px;
          width: 4px;
          background-color: var(--accent-primary);
          border-radius: 0 4px 4px 0;
        }

        .day-header-content {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.05rem;
          flex-wrap: wrap;
        }

        .day-header-icon {
          font-size: 1.1rem;
        }

        .day-header-date {
          font-weight: 700;
          color: var(--text-main);
        }

        .day-header-separator {
          color: var(--text-muted);
        }

        .day-header-events {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .day-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-add-day-cheki {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .btn-close-view {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          &:hover { color: var(--text-main); background-color: var(--bg-surface-2); }
        }

        .no-photos-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--text-muted);
          gap: 12px;
          text-align: center;
        }

        .grouped-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
        }

        .grouped-cheki-card {
          position: relative;
          background-color: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;

          &:hover {
            transform: translateY(-4px);
            border-color: var(--accent-primary);
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          }
        }

        .badge-pill {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .badge-pill.gold {
          background-color: var(--accent-primary);
          color: #0b0d14;
        }

        .badge-pill.dark {
          background-color: rgba(15, 17, 23, 0.85);
          color: #ffffff;
          border: 1px solid var(--border-subtle);
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
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .grouped-img-wrap {
          width: 100%;
          height: 200px;
          background-color: #000;
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
          padding: 8px 12px;
          background-color: var(--bg-surface-2);
          border-top: 1px solid var(--border-subtle);
        }

        .footer-member-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        /* Modal Dialog Styles */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .modal-dialog {
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-strong);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
          h3 {
            margin: 0;
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--text-main);
          }
        }

        .btn-close-modal {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          &:hover { color: var(--text-main); background: var(--bg-surface-2); }
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          label {
            font-size: 0.82rem;
            font-weight: 600;
            color: var(--text-muted);
          }
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .input-control {
          background-color: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-main);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;

          &:focus {
            border-color: var(--accent-primary);
          }
        }

        .textarea-control {
          resize: vertical;
          font-family: inherit;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
        }

        @media (max-width: 600px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}
