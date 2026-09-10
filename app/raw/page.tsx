'use client';

import React, { useState } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { FilterBar } from '@/components/layout/FilterBar';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { useFilters } from '@/context/FilterContext';
import { Transaction } from '@/types/cheki';
import { addTransaction, updateTransaction, deleteTransaction } from '@/lib/dataStore';
import { Plus, Edit2, Trash2, ArrowUpDown, Image as ImageIcon, X } from 'lucide-react';

import { extractDirectImageUrl, groupTransactionsByImage } from '@/lib/imageUtils';
import { LightboxGallery, LightboxItem } from '@/components/common/LightboxGallery';
import { CircularSpinner } from '@/components/common/CircularSpinner';

export default function RawDataPage() {
  const { user, isDemoUser } = useAuth();
  const { allTransactions, filteredTransactions, members, groups, colors, types, locations, userId, loading } = useChekiData();
  const { addCellFilter } = useFilters();

  const [sortCol, setSortCol] = useState<keyof Transaction>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [modalTransaction, setModalTransaction] = useState<Partial<Transaction> | null>(null);
  const [lightboxState, setLightboxState] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return <LoginPrompt />;

  // Sorting
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const valA = a[sortCol] ?? '';
    const valB = b[sortCol] ?? '';
    if (valA < valB) return sortAsc ? -1 : 1;
    return 0;
  });

  // Group photos so Lightbox displays unique image URLs without duplicates
  const groupedPhotos = React.useMemo(() => {
    return groupTransactionsByImage(sortedTransactions);
  }, [sortedTransactions]);

  const galleryItems: LightboxItem[] = React.useMemo(() => {
    return groupedPhotos.map((g) => {
      const memberLabel = g.members.length > 2
        ? `${g.members.slice(0, 2).join(', ')} +${g.members.length - 2}`
        : g.members.join(', ');
      return {
        url: g.imgUrl,
        title: `${memberLabel} ${g.groups.length > 0 ? '• ' + g.groups.join(', ') : ''}`,
        subtitle: `${g.rows[0]?.date || ''} ${g.events.length > 0 ? '• ' + g.events.join(', ') : ''}`,
      };
    });
  }, [groupedPhotos]);

  const handleOpenImage = (rawImgUrl: string) => {
    const cleanTarget = extractDirectImageUrl(rawImgUrl);
    const foundIndex = groupedPhotos.findIndex(
      (photo) => photo.cleanUrl === cleanTarget || photo.imgUrl === rawImgUrl || photo.key === cleanTarget
    );
    setLightboxState({
      open: true,
      index: foundIndex >= 0 ? foundIndex : 0,
    });
  };

  const handleSort = (col: keyof Transaction) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  // Auto-populate group/color/country/company when a member is selected in modal
  const handleMemberSelectInModal = (selectedMemberName: string) => {
    const match = members.find((m) => m.member_name === selectedMemberName);
    if (match) {
      setModalTransaction((prev) => ({
        ...prev,
        member: selectedMemberName,
        group: match.group || prev?.group || '',
        color: match.color || prev?.color || 'White',
        company: match.company || prev?.company || '',
        nationality: match.country || prev?.nationality || '🇹🇭 TH',
      }));
    } else {
      setModalTransaction((prev) => ({ ...prev, member: selectedMemberName }));
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTransaction || !modalTransaction.member || !modalTransaction.date) {
      alert("Please fill in required fields: Date and Member.");
      return;
    }

    setIsSaving(true);
    try {
      if (modalTransaction.id) {
        await updateTransaction(modalTransaction.id, userId, modalTransaction, isDemoUser);
      } else {
        await addTransaction({
          userId,
          member: modalTransaction.member || '',
          color: modalTransaction.color || 'White',
          group: modalTransaction.group || '',
          nationality: modalTransaction.nationality || '🇹🇭 TH',
          date: modalTransaction.date || '',
          month: modalTransaction.date?.substring(0, 7) || '',
          year: modalTransaction.date?.substring(0, 4) || '',
          event: modalTransaction.event || '',
          description: modalTransaction.description || '',
          type: modalTransaction.type || 'Cheki',
          location: modalTransaction.location || 'Bangkok',
          quantity: Number(modalTransaction.quantity) || 1,
          totalPrice: Number(modalTransaction.totalPrice) || 300,
          img: modalTransaction.img || '',
          talkTopic: modalTransaction.talkTopic || '',
          company: modalTransaction.company || '',
        }, isDemoUser);
      }
      setModalTransaction(null);
    } catch (err) {
      console.error("Failed saving transaction:", err);
      alert("Failed saving transaction record: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction record?")) {
      await deleteTransaction(id, userId, isDemoUser);
    }
  };

  if (loading) return <CircularSpinner />;

  return (
    <div className="raw-data-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Raw Data</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setModalTransaction({ date: new Date().toISOString().split('T')[0], quantity: 1, totalPrice: 300, type: 'Cheki', location: 'Bangkok' })}>
          <Plus size={16} /> Add Transaction
        </button>
      </div>


      <FilterBar transactions={allTransactions} />

      {/* Transactions Table */}
      <div className="table-card card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>IMG</th>
                <th onClick={() => handleSort('date')} className="sortable">Date <ArrowUpDown size={12} /></th>
                <th onClick={() => handleSort('member')} className="sortable">Member <ArrowUpDown size={12} /></th>
                <th onClick={() => handleSort('group')} className="sortable">Group <ArrowUpDown size={12} /></th>
                <th onClick={() => handleSort('color')} className="sortable">Color <ArrowUpDown size={12} /></th>
                <th onClick={() => handleSort('event')} className="sortable">Event <ArrowUpDown size={12} /></th>
                <th onClick={() => handleSort('type')} className="sortable">Type <ArrowUpDown size={12} /></th>
                <th onClick={() => handleSort('location')} className="sortable">Location <ArrowUpDown size={12} /></th>
                <th onClick={() => handleSort('quantity')} className="sortable">Qty <ArrowUpDown size={12} /></th>
                <th onClick={() => handleSort('totalPrice')} className="sortable">Total (THB) <ArrowUpDown size={12} /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.slice(0, 200).map((r) => {
                const imgUrl = extractDirectImageUrl(r.img);

                return (
                  <tr key={r.id}>
                    <td>
                      {r.img && r.img.trim() !== '' && r.img.toLowerCase() !== 'none' ? (
                        <button className="img-btn" onClick={() => handleOpenImage(r.img)} title="View Photo Gallery">
                          <ImageIcon size={16} />
                        </button>
                      ) : (
                        <span className="no-img">-</span>
                      )}
                    </td>
                    <td className="clickable-cell" onClick={() => addCellFilter('year', r.year)} title={`Drilldown by Year: ${r.year}`}>{r.date}</td>
                    <td className="clickable-cell" onClick={() => addCellFilter('member', r.member)} title={`Drilldown by Member: ${r.member}`}>{r.member}</td>
                    <td className="clickable-cell" onClick={() => addCellFilter('group', r.group)} title={`Drilldown by Group: ${r.group}`}>{r.group}</td>
                    <td className="clickable-cell" onClick={() => addCellFilter('color', r.color)} title={`Drilldown by Color: ${r.color}`}>
                      <span className="color-badge" style={{ backgroundColor: r.color?.toLowerCase() === 'white' ? '#fff' : r.color?.toLowerCase() }}>
                        {r.color}
                      </span>
                    </td>
                    <td>{r.event || '-'}</td>
                    <td className="clickable-cell" onClick={() => addCellFilter('type', r.type)} title={`Drilldown by Type: ${r.type}`}>{r.type}</td>
                    <td className="clickable-cell" onClick={() => addCellFilter('location', r.location)} title={`Drilldown by Location: ${r.location}`}>{r.location}</td>
                    <td><strong>{r.quantity}</strong></td>
                    <td>฿{r.totalPrice?.toLocaleString()}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setModalTransaction(r)} title="Edit"><Edit2 size={15} /></button>
                        <button className="btn-icon danger" onClick={() => handleDelete(r.id)} title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {modalTransaction && (
        <div className="modal-overlay" onClick={() => setModalTransaction(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalTransaction.id ? 'Edit Transaction' : 'Add New Transaction'}</h2>
              <button className="btn-close" onClick={() => setModalTransaction(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveTransaction} className="form-grid">
              <div className="form-group">
                <label>Date *</label>
                <input type="date" required value={modalTransaction.date || ''} onChange={(e) => setModalTransaction({ ...modalTransaction, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Member *</label>
                <select required value={modalTransaction.member || ''} onChange={(e) => handleMemberSelectInModal(e.target.value)}>
                  <option value="">-- Select Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.member_name}>{m.member_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Group</label>
                <select value={modalTransaction.group || ''} onChange={(e) => setModalTransaction({ ...modalTransaction, group: e.target.value })}>
                  <option value="">-- Select Group --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.group}>{g.group}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Color</label>
                <select value={modalTransaction.color || ''} onChange={(e) => setModalTransaction({ ...modalTransaction, color: e.target.value })}>
                  {colors.map((c) => (
                    <option key={c.id} value={c.color}>{c.color}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={modalTransaction.type || ''} onChange={(e) => setModalTransaction({ ...modalTransaction, type: e.target.value })}>
                  {types.map((t) => (
                    <option key={t.id} value={t.type}>{t.type}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Location</label>
                <select value={modalTransaction.location || ''} onChange={(e) => setModalTransaction({ ...modalTransaction, location: e.target.value })}>
                  {locations.map((l) => (
                    <option key={l.id} value={l.location}>{l.location}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Event Name</label>
                <input type="text" value={modalTransaction.event || ''} onChange={(e) => setModalTransaction({ ...modalTransaction, event: e.target.value })} placeholder="e.g. Minmin Seitan-sai 2026" />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" min="1" value={modalTransaction.quantity || 1} onChange={(e) => setModalTransaction({ ...modalTransaction, quantity: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Total Price (THB)</label>
                <input type="number" min="0" value={modalTransaction.totalPrice || 0} onChange={(e) => setModalTransaction({ ...modalTransaction, totalPrice: Number(e.target.value) })} />
              </div>
              <div className="form-group span-2">
                <label>Image URL</label>
                <input type="url" value={modalTransaction.img || ''} onChange={(e) => setModalTransaction({ ...modalTransaction, img: e.target.value })} placeholder="https://lh3.googleusercontent.com/..." />
              </div>
              <div className="form-group span-2">
                <label>Talk Topic / Notes</label>
                <input type="text" value={modalTransaction.talkTopic || ''} onChange={(e) => setModalTransaction({ ...modalTransaction, talkTopic: e.target.value })} />
              </div>

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setModalTransaction(null)} disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Gallery Modal with Next/Prev Navigation */}
      {lightboxState.open && (
        <LightboxGallery 
          items={galleryItems} 
          initialIndex={lightboxState.index} 
          onClose={() => setLightboxState({ open: false, index: 0 })} 
        />
      )}


      <style jsx>{`
        .raw-data-page {
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

        .table-wrapper {
          overflow-x: auto;
        }

        .sortable {
          cursor: pointer;
        }
        .sortable:hover {
          color: var(--accent-primary);
        }

        .clickable-cell {
          cursor: pointer;
        }
        .clickable-cell:hover {
          color: var(--accent-blue);
          text-decoration: underline;
        }

        .color-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #000;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .img-btn {
          background: var(--bg-surface-3);
          border: none;
          color: var(--accent-blue);
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
        }

        .action-btns {
          display: flex;
          gap: 6px;
        }

        .btn-icon {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .btn-icon:hover { color: var(--accent-primary); }
        .btn-icon.danger:hover { color: var(--color-danger); }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-card {
          background: var(--bg-surface-1);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-md);
          padding: 24px;
          width: 100%;
          max-width: 640px;
          box-shadow: var(--shadow-card);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .btn-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .span-2 {
          grid-column: span 2;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }

        .lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
        }

        .lightbox-content img {
          max-width: 100%;
          max-height: 85vh;
          border-radius: var(--radius-sm);
        }

        .btn-close-light {
          position: absolute;
          top: -36px; right: 0;
          background: none; border: none; color: #fff; cursor: pointer;
        }
      `}</style>
    </div>
  );
}

