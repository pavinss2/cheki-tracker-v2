'use client';

import React, { useState, useMemo } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { FilterBar } from '@/components/layout/FilterBar';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { useFilters } from '@/context/FilterContext';
import { Transaction, DimMember } from '@/types/cheki';
import { 
  addTransaction, 
  updateTransaction, 
  deleteTransaction, 
  batchUpsertTransactions, 
  calculateRowPrice 
} from '@/lib/dataStore';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUpDown, 
  Image as ImageIcon, 
  X, 
  Settings, 
  Clipboard, 
  Save, 
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

import { extractDirectImageUrl, groupTransactionsByImage, formatDisplayName } from '@/lib/imageUtils';
import { LightboxGallery, LightboxItem } from '@/components/common/LightboxGallery';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { PriceRuleBuilderModal } from '@/components/grid-editor/PriceRuleBuilderModal';

interface GridRow {
  localId: string;
  member: string;
  color: string;
  group: string;
  nationality: string;
  date: string;
  month: string;
  year: string;
  event: string;
  description: string;
  type: string;
  location: string;
  quantity: number;
  totalPrice: number;
  img: string;
  talkTopic: string;
  company: string;
  isDirty?: boolean;
}

export default function RawDataPage() {
  const { user, isDemoUser } = useAuth();
  const { 
    allTransactions, 
    filteredTransactions, 
    members, 
    groups, 
    colors, 
    types, 
    priceRules,
    updateRules,
    userId, 
    loading 
  } = useChekiData();
  const { addCellFilter } = useFilters();

  const [sortCol, setSortCol] = useState<keyof Transaction>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const locationOptions = useMemo(() => {
    const set = new Set<string>(['Bangkok', 'Tokyo', 'Seoul', 'Taipei']);
    allTransactions.forEach((t) => {
      if (t.location) set.add(t.location);
    });
    return Array.from(set).sort();
  }, [allTransactions]);
  
  // Single edit modal state
  const [modalTransaction, setModalTransaction] = useState<Partial<Transaction> | null>(null);
  const [lightboxState, setLightboxState] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // New Blank Rows & Bulk Paste state (Grid Entry integration)
  const [blankRows, setBlankRows] = useState<GridRow[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Group Select Modal for Edge Cases (Member in multiple groups)
  const [groupSelectModal, setGroupSelectModal] = useState<{
    rowIdx: number;
    memberName: string;
    matchingMembers: DimMember[];
  } | null>(null);

  // Group lookup map for auto-mapping company & nationality/country
  const groupLookup = useMemo(() => {
    const map: Record<string, { company: string; country: string }> = {};
    groups.forEach((g) => {
      map[g.group] = { company: g.company, country: g.country };
    });
    return map;
  }, [groups]);

  if (!user && !isDemoUser) return <LoginPrompt />;

  // Sorting
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const valA = a[sortCol] ?? '';
    const valB = b[sortCol] ?? '';
    if (valA < valB) return sortAsc ? -1 : 1;
    return 0;
  });

  // Group photos so Lightbox displays unique image URLs without duplicates
  const groupedPhotos = useMemo(() => {
    return groupTransactionsByImage(sortedTransactions);
  }, [sortedTransactions]);

  const galleryItems: LightboxItem[] = useMemo(() => {
    return groupedPhotos.map((g) => {
      const memberLabel = g.members.length > 9
        ? `${g.members.slice(0, 9).join(', ')} +${g.members.length - 9}`
        : g.members.join(', ');
      return {
        url: g.imgUrl,
        title: memberLabel || 'Cheki Photo',
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

  // Grid entry features: Add Blank Row (Mobile vs Desktop)
  const handleAddBlankRow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newRow: GridRow = {
      localId: 'blank_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      member: '',
      color: 'White',
      group: '',
      nationality: '🇹🇭 TH',
      date: today,
      month: today.substring(0, 7),
      year: today.substring(0, 4),
      event: '',
      description: '',
      type: 'Cheki',
      location: 'Bangkok',
      quantity: 1,
      totalPrice: 300,
      img: '',
      talkTopic: '',
      company: '',
      isDirty: true,
    };
    setBlankRows([newRow, ...blankRows]);
  };

  const handleAddRow = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      const today = new Date().toISOString().split('T')[0];
      setModalTransaction({
        date: today,
        member: '',
        color: 'White',
        group: '',
        nationality: '🇹🇭 TH',
        event: '',
        type: 'Cheki',
        location: 'Bangkok',
        quantity: 1,
        totalPrice: 300,
        img: '',
        talkTopic: '',
        company: '',
      });
    } else {
      handleAddBlankRow();
    }
  };

  const handleMemberSelect = (rowIdx: number, memberName: string) => {
    const matches = members.filter(m => m.member_name.toLowerCase() === memberName.toLowerCase());

    if (matches.length > 1) {
      setGroupSelectModal({
        rowIdx,
        memberName,
        matchingMembers: matches,
      });
    } else if (matches.length === 1) {
      const m = matches[0];
      const mappedGroup = groupLookup[m.group] || { company: m.company, country: m.country };

      setBlankRows((prev) => {
        const copy = [...prev];
        const row = {
          ...copy[rowIdx],
          member: m.member_name,
          group: m.group,
          color: m.color || copy[rowIdx].color,
          company: mappedGroup.company || m.company,
          nationality: mappedGroup.country || m.country,
          isDirty: true,
        };
        row.totalPrice = calculateRowPrice(row, priceRules);
        copy[rowIdx] = row;
        return copy;
      });
    } else {
      handleCellChange(rowIdx, 'member', memberName);
    }
  };

  const applyGroupSelection = (selectedMember: DimMember) => {
    if (!groupSelectModal) return;

    const rowIdx = groupSelectModal.rowIdx;
    const mappedGroup = groupLookup[selectedMember.group] || { company: selectedMember.company, country: selectedMember.country };

    setBlankRows((prev) => {
      const copy = [...prev];
      const row = {
        ...copy[rowIdx],
        member: selectedMember.member_name,
        group: selectedMember.group,
        color: selectedMember.color || copy[rowIdx].color,
        company: mappedGroup.company || selectedMember.company,
        nationality: mappedGroup.country || selectedMember.country,
        isDirty: true,
      };
      row.totalPrice = calculateRowPrice(row, priceRules);
      copy[rowIdx] = row;
      return copy;
    });

    setGroupSelectModal(null);
  };

  const handleCellChange = (rowIdx: number, colKey: keyof GridRow, value: string | number) => {
    setBlankRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[rowIdx], [colKey]: value, isDirty: true };

      if (colKey === 'date' && typeof value === 'string') {
        row.month = value ? value.substring(0, 7) : '';
        row.year = value ? value.substring(0, 4) : '';
      }

      if (colKey === 'group' && typeof value === 'string') {
        const mapped = groupLookup[value];
        if (mapped) {
          row.company = mapped.company;
          row.nationality = mapped.country;
        }
      }

      row.totalPrice = calculateRowPrice(row, priceRules);
      copy[rowIdx] = row;
      return copy;
    });
  };

  const handleDeleteBlankRow = (index: number) => {
    setBlankRows(blankRows.filter((_, i) => i !== index));
  };

  // Bulk Paste TSV
  const handleBulkPasteSubmit = () => {
    if (!pasteRawText.trim()) return;

    const lines = pasteRawText.trim().split('\n');
    const parsedRows: GridRow[] = lines.map((line, idx) => {
      const parts = line.split('\t');
      const dateVal = parts[4] || new Date().toISOString().split('T')[0];
      const memberVal = parts[0] || '';
      const groupVal = parts[2] || '';
      const mapped = groupLookup[groupVal] || { company: parts[16] || '', country: parts[3] || '' };

      const rowObj: GridRow = {
        localId: 'paste_' + Date.now() + '_' + idx,
        member: memberVal,
        color: parts[1] || 'White',
        group: groupVal,
        nationality: mapped.country || parts[3] || '🇹🇭 TH',
        date: dateVal,
        month: dateVal.substring(0, 7),
        year: dateVal.substring(0, 4),
        event: parts[7] || '',
        description: parts[8] || '',
        type: parts[9] || 'Cheki',
        location: parts[10] || 'Bangkok',
        quantity: Number(parts[11]) || 1,
        totalPrice: Number(parts[12]) || 300,
        img: parts[13] || '',
        talkTopic: parts[14] || '',
        company: mapped.company || parts[16] || '',
        isDirty: true,
      };

      rowObj.totalPrice = calculateRowPrice(rowObj, priceRules);
      return rowObj;
    });

    setBlankRows([...parsedRows, ...blankRows]);
    setShowPasteModal(false);
    setPasteRawText('');
  };

  // Save All dirty blank/pasted rows
  const handleBatchSave = async () => {
    const dirtyRows = blankRows.filter((r) => r.isDirty && r.member.trim() !== '');
    if (dirtyRows.length === 0) {
      alert("No valid modified rows to save. Make sure 'Member' is filled in your added rows.");
      return;
    }

    setIsSavingBatch(true);
    try {
      const payload = dirtyRows.map(({ localId: _l, isDirty: _d, ...rest }) => rest as Omit<Transaction, 'id' | 'userId'>);
      await batchUpsertTransactions(userId, payload, isDemoUser);

      setSaveSuccessMsg(`Successfully saved ${dirtyRows.length} transactions to database!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);

      // Remove saved blank rows as they are now in subscription
      setBlankRows(blankRows.filter(r => !r.isDirty || r.member.trim() === ''));
    } catch (err) {
      console.error("Batch save error:", err);
      alert("Failed saving data: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Auto-populate group/color/country/company when a member is selected in single edit modal
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

  const validDirtyCount = blankRows.filter((r) => r.isDirty && r.member.trim() !== '').length;

  return (
    <div className="raw-data-page">
      <FilterBar transactions={allTransactions} />

      {saveSuccessMsg && (
        <div className="success-banner">
          <CheckCircle2 size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Transactions Table Card */}
      <div className="table-card card">
        <div className="tab-header raw-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowRuleModal(true)}>
              <Settings size={14} /> Price Rules
            </button>
            <button className="btn btn-secondary btn-sm btn-paste-tsv" onClick={() => setShowPasteModal(true)}>
              <Clipboard size={14} /> Paste TSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleAddRow}>
              <Plus size={14} /> Add Row
            </button>
          </div>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleBatchSave} 
            disabled={isSavingBatch || validDirtyCount === 0}
          >
            <Save size={14} /> {isSavingBatch ? 'Saving...' : `Save (${validDirtyCount})`}
          </button>
        </div>

        <div className="table-wrapper">
          <table className="raw-table">
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
              {/* NEW BLANK / PASTED ROWS (Grid Entry Inline Editable) */}
              {blankRows.map((row, idx) => (
                <tr key={row.localId} className="new-row-highlight">
                  <td>
                    <input 
                      type="url" 
                      placeholder="Image URL..." 
                      value={row.img} 
                      onChange={(e) => handleCellChange(idx, 'img', e.target.value)} 
                      className="inline-input"
                    />
                  </td>
                  <td>
                    <input 
                      type="date" 
                      value={row.date} 
                      onChange={(e) => handleCellChange(idx, 'date', e.target.value)} 
                      className="inline-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      list={`members_list_${idx}`}
                      value={row.member}
                      onChange={(e) => handleMemberSelect(idx, e.target.value)}
                      placeholder="Select member..."
                      className="inline-input"
                    />
                    <datalist id={`members_list_${idx}`}>
                      {Array.from(new Set(members.map(m => m.member_name))).map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <input
                      type="text"
                      list={`groups_list_${idx}`}
                      value={row.group}
                      onChange={(e) => handleCellChange(idx, 'group', e.target.value)}
                      placeholder="Group..."
                      className="inline-input"
                    />
                    <datalist id={`groups_list_${idx}`}>
                      {groups.map((g) => (
                        <option key={g.id} value={g.group} />
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <select
                      value={row.color}
                      onChange={(e) => handleCellChange(idx, 'color', e.target.value)}
                      className="inline-select"
                    >
                      {colors.map((c) => (
                        <option key={c.id} value={c.color}>{c.color}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input 
                      type="text" 
                      placeholder="Event name..." 
                      value={row.event} 
                      onChange={(e) => handleCellChange(idx, 'event', e.target.value)} 
                      className="inline-input"
                    />
                  </td>
                  <td>
                    <select
                      value={row.type}
                      onChange={(e) => handleCellChange(idx, 'type', e.target.value)}
                      className="inline-select"
                    >
                      {types.map((t) => (
                        <option key={t.id} value={t.type}>{t.type}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.location}
                      onChange={(e) => handleCellChange(idx, 'location', e.target.value)}
                      className="inline-select"
                    >
                      {locationOptions.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input 
                      type="number" 
                      min="1" 
                      style={{ width: '60px' }} 
                      value={row.quantity} 
                      onChange={(e) => handleCellChange(idx, 'quantity', Number(e.target.value))} 
                      className="inline-input"
                    />
                  </td>
                  <td>
                    <strong>฿{row.totalPrice}</strong>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-icon danger" onClick={() => handleDeleteBlankRow(idx)} title="Remove row">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* EXISTING PERSISTED TRANSACTIONS */}
              {sortedTransactions.slice(0, 200).map((r) => {
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
                    <td className="clickable-cell" onClick={() => addCellFilter('member', r.member)} title={`Drilldown by Member: ${r.member}`}>{formatDisplayName(r.member)}</td>
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

      {/* PRICE RULES MODAL */}
      {showRuleModal && (
        <PriceRuleBuilderModal
          rules={priceRules}
          onSave={(newRules) => {
            updateRules(newRules);
            setShowRuleModal(false);
          }}
          onClose={() => setShowRuleModal(false)}
        />
      )}

      {/* BULK PASTE TSV MODAL */}
      {showPasteModal && (
        <div className="modal-overlay" onClick={() => setShowPasteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FileSpreadsheet size={20} /> Bulk Paste TSV Data</h2>
              <button className="btn-close" onClick={() => setShowPasteModal(false)}><X size={18} /></button>
            </div>
            <p className="modal-subtitle">
              Copy and paste rows directly from Google Sheets or Excel (Tab-separated values):
            </p>
            <textarea
              className="paste-textarea"
              rows={10}
              placeholder="Paste tab-separated rows here..."
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
            />
            <div className="form-actions" style={{ marginTop: '14px' }}>
              <button className="btn btn-secondary" onClick={() => setShowPasteModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkPasteSubmit}>
                Parse & Insert Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTIPLE GROUP CHOICE MODAL FOR EDGE CASES */}
      {groupSelectModal && (
        <div className="modal-overlay" onClick={() => setGroupSelectModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Group for {groupSelectModal.memberName}</h2>
              <button className="btn-close" onClick={() => setGroupSelectModal(null)}><X size={18} /></button>
            </div>
            <p className="modal-subtitle">
              This member belongs to multiple groups. Please select which group applies:
            </p>
            <div className="group-choices-list">
              {groupSelectModal.matchingMembers.map((m) => (
                <button
                  key={m.id}
                  className="btn btn-secondary group-choice-btn"
                  onClick={() => applyGroupSelection(m)}
                >
                  <strong>{m.group}</strong> ({m.company || 'Individual'})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EDIT / ADD SINGLE TRANSACTION MODAL */}
      {modalTransaction && (
        <div className="modal-overlay" onClick={() => setModalTransaction(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalTransaction.id ? 'Edit Transaction' : '📸 Add New Cheki Transaction'}</h2>
              <button className="btn-close" onClick={() => setModalTransaction(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveTransaction} className="form-grid">
              <div className="form-group">
                <label>Date *</label>
                <input 
                  type="date" 
                  required 
                  value={modalTransaction.date || ''} 
                  onChange={(e) => setModalTransaction({ ...modalTransaction, date: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label>Member Name *</label>
                <input
                  type="text"
                  list="modal_members_list"
                  required
                  placeholder="Select or enter member..."
                  value={modalTransaction.member || ''}
                  onChange={(e) => {
                    handleMemberSelectInModal(e.target.value);
                    const updated = { ...modalTransaction, member: e.target.value };
                    updated.totalPrice = calculateRowPrice(updated as GridRow, priceRules);
                    setModalTransaction(updated);
                  }}
                />
                <datalist id="modal_members_list">
                  {Array.from(new Set(members.map((m) => m.member_name))).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Group</label>
                <input
                  type="text"
                  list="modal_groups_list"
                  placeholder="Group name"
                  value={modalTransaction.group || ''}
                  onChange={(e) => {
                    const grp = e.target.value;
                    const mapped = groupLookup[grp];
                    const updated = { 
                      ...modalTransaction, 
                      group: grp,
                      company: mapped?.company || modalTransaction.company || '',
                      nationality: mapped?.country || modalTransaction.nationality || '🇹🇭 TH',
                    };
                    updated.totalPrice = calculateRowPrice(updated as GridRow, priceRules);
                    setModalTransaction(updated);
                  }}
                />
                <datalist id="modal_groups_list">
                  {groups.map((g) => (
                    <option key={g.id} value={g.group} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Color</label>
                <select 
                  value={modalTransaction.color || 'White'} 
                  onChange={(e) => {
                    const updated = { ...modalTransaction, color: e.target.value };
                    updated.totalPrice = calculateRowPrice(updated as GridRow, priceRules);
                    setModalTransaction(updated);
                  }}
                >
                  {colors.map((c) => (
                    <option key={c.id} value={c.color}>{c.color}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Event Name</label>
                <input 
                  type="text" 
                  value={modalTransaction.event || ''} 
                  onChange={(e) => setModalTransaction({ ...modalTransaction, event: e.target.value })} 
                  placeholder="e.g. CosQuest 3" 
                />
              </div>

              <div className="form-group">
                <label>Cheki Type</label>
                <select 
                  value={modalTransaction.type || 'Cheki'} 
                  onChange={(e) => {
                    const updated = { ...modalTransaction, type: e.target.value };
                    updated.totalPrice = calculateRowPrice(updated as GridRow, priceRules);
                    setModalTransaction(updated);
                  }}
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.type}>{t.type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input 
                  type="number" 
                  min="1" 
                  value={modalTransaction.quantity ?? 1} 
                  onChange={(e) => {
                    const qty = Number(e.target.value) || 1;
                    const updated = { ...modalTransaction, quantity: qty };
                    updated.totalPrice = calculateRowPrice(updated as GridRow, priceRules);
                    setModalTransaction(updated);
                  }} 
                />
              </div>

              <div className="form-group">
                <label>Total Price (THB)</label>
                <input 
                  type="number" 
                  min="0" 
                  value={modalTransaction.totalPrice ?? 300} 
                  onChange={(e) => setModalTransaction({ ...modalTransaction, totalPrice: Number(e.target.value) })} 
                />
              </div>

              <div className="form-group span-2">
                <label>Photo URL (Google Drive / Direct Image)</label>
                <input 
                  type="url" 
                  value={modalTransaction.img || ''} 
                  onChange={(e) => setModalTransaction({ ...modalTransaction, img: e.target.value })} 
                  placeholder="https://drive.google.com/..." 
                />
              </div>

              <div className="form-group span-2">
                <label>Talk Topic / Notes</label>
                <textarea 
                  rows={3} 
                  value={modalTransaction.talkTopic || ''} 
                  onChange={(e) => setModalTransaction({ ...modalTransaction, talkTopic: e.target.value })} 
                  placeholder="Memorable talk topic or event notes..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div className="form-actions span-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalTransaction(null)} disabled={isSaving}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSaving}
                  style={{
                    backgroundColor: 'var(--accent-gold, #d97706)',
                    borderColor: 'var(--accent-gold, #d97706)',
                    color: '#ffffff',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={16} /> {isSaving ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX GALLERY MODAL */}
              {/* LIGHTBOX GALLERY MODAL */}
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
          gap: 8px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .raw-actions-bar {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 10px;
        }

        @media (max-width: 768px) {
          .btn-paste-tsv {
            display: none !important;
          }
        }

        .success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(39, 174, 96, 0.15);
          color: #27ae60;
          border: 1px solid rgba(39, 174, 96, 0.3);
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          font-weight: 500;
        }

        .table-card {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
          box-sizing: border-box;
          padding: 15px;
        }

        .table-wrapper {
          overflow-x: auto;
          width: calc(100% + 20px);
          max-width: calc(100% + 20px);
          margin-left: -10px;
          margin-right: -10px;
          -webkit-overflow-scrolling: touch;
          display: block;
        }

        .raw-table {
          width: 100%;
          min-width: 920px;
          border-collapse: collapse;
        }

        .new-row-highlight td {
          background-color: rgba(212, 168, 75, 0.12) !important;
          border-bottom: 1px dashed #d4a84b;
        }

        .inline-input, .inline-select {
          background: var(--bg-surface-2);
          border: 1px solid var(--border-strong);
          color: var(--text-main);
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
          width: 100%;
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
          margin-bottom: 12px;
        }

        .modal-subtitle {
          color: var(--text-muted);
          font-size: 0.88rem;
          margin-bottom: 16px;
        }

        .paste-textarea {
          width: 100%;
          background: var(--bg-surface-2);
          border: 1px solid var(--border-strong);
          color: var(--text-main);
          padding: 12px;
          border-radius: var(--radius-sm);
          font-family: monospace;
          font-size: 0.82rem;
        }

        .group-choices-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .group-choice-btn {
          justify-content: flex-start;
          width: 100%;
          padding: 12px 16px;
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
      `}</style>
    </div>
  );
}
