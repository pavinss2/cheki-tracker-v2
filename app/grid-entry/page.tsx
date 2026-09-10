'use client';

import React, { useState, useEffect } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { PriceRuleBuilderModal } from '@/components/grid-editor/PriceRuleBuilderModal';
import { batchUpsertTransactions, calculateRowPrice } from '@/lib/dataStore';
import { Transaction, DimMember } from '@/types/cheki';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { 
  Plus, 
  Save, 
  Settings, 
  Clipboard, 
  Trash2, 
  CheckCircle2, 
  FileSpreadsheet,
  AlertCircle,
  X
} from 'lucide-react';
import { CircularSpinner } from '@/components/common/CircularSpinner';

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

export default function GridEntryPage() {
  const { user, isDemoUser } = useAuth();
  const { members, groups, colors, types, locations, priceRules, updateRules, userId, loading } = useChekiData();

  const [gridRows, setGridRows] = useState<GridRow[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colKey: string } | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Multiple Group Selector Modal for Edge Cases (Member in multiple groups)
  const [groupSelectModal, setGroupSelectModal] = useState<{
    rowIdx: number;
    memberName: string;
    matchingMembers: DimMember[];
  } | null>(null);

  // Group lookup map for auto-mapping company & nationality/country
  const groupLookup = React.useMemo(() => {
    const map: Record<string, { company: string; country: string }> = {};
    groups.forEach((g) => {
      map[g.group] = { company: g.company, country: g.country };
    });
    return map;
  }, [groups]);

  // Initial 5 blank rows
  useEffect(() => {
    if (gridRows.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const initial: GridRow[] = Array.from({ length: 5 }).map((_, idx) => ({
        localId: 'grid_' + idx,
        member: '',
        color: 'White',
        group: '',
        nationality: '',
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
        isDirty: false,
      }));
      setGridRows(initial);
    }
  }, [gridRows.length]);

  const handleMemberSelect = (rowIdx: number, memberName: string) => {
    // Search dim_member for matching member records
    const matches = members.filter(m => m.member_name.toLowerCase() === memberName.toLowerCase());

    if (matches.length > 1) {
      // Edge Case: Member belongs to multiple groups (multiple eras/rows in dim_member)
      setGroupSelectModal({
        rowIdx,
        memberName,
        matchingMembers: matches,
      });
    } else if (matches.length === 1) {
      // Normal Case: Single group match
      const m = matches[0];
      const mappedGroup = groupLookup[m.group] || { company: m.company, country: m.country };

      setGridRows((prev) => {
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
      // Custom member name typed
      handleCellChange(rowIdx, 'member', memberName);
    }
  };

  const applyGroupSelection = (selectedMember: DimMember) => {
    if (!groupSelectModal) return;

    const rowIdx = groupSelectModal.rowIdx;
    const mappedGroup = groupLookup[selectedMember.group] || { company: selectedMember.company, country: selectedMember.country };

    setGridRows((prev) => {
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

  const handleCellChange = (
    rowIdx: number,
    colKey: keyof GridRow,
    value: string | number
  ) => {
    setGridRows((prev) => {
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

  const handleAddBlankRow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newRow: GridRow = {
      localId: 'grid_' + Date.now(),
      member: '',
      color: 'White',
      group: '',
      nationality: '',
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
    setGridRows([...gridRows, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    setGridRows(gridRows.filter((_, i) => i !== index));
  };

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

    setGridRows([...parsedRows, ...gridRows]);
    setShowPasteModal(false);
    setPasteRawText('');
  };

  const handleBatchSave = async () => {
    const dirtyRows = gridRows.filter((r) => r.isDirty && r.member.trim() !== '');
    if (dirtyRows.length === 0) {
      alert("No valid modified rows to save. Make sure 'Member' is filled.");
      return;
    }

    try {
      const payload = dirtyRows.map(({ localId: _l, isDirty: _d, ...rest }) => rest as Omit<Transaction, 'id' | 'userId'>);
      await batchUpsertTransactions(userId, payload, isDemoUser);

      setSaveSuccessMsg(`Successfully saved ${dirtyRows.length} transactions to database!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);

      setGridRows(gridRows.map((r) => ({ ...r, isDirty: false })));
    } catch (err) {
      console.error("Batch save error:", err);
      alert("Failed saving data: " + String(err));
    }
  };

  if (!user && !isDemoUser) return <LoginPrompt />;
  if (loading) return <CircularSpinner />;

  return (
    <div className="grid-entry-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Grid Entry</h1>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowRuleModal(true)}>
            <Settings size={16} /> Price Rules UI
          </button>
          <button className="btn btn-secondary" onClick={() => setShowPasteModal(true)}>
            <Clipboard size={16} /> Bulk Paste TSV
          </button>
          <button className="btn btn-primary" onClick={handleBatchSave}>
            <Save size={16} /> Save All ({gridRows.filter((r) => r.isDirty && r.member).length} dirty)
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="success-banner">
          <CheckCircle2 size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Responsive Grid Container with Smooth Horizontal Scroll */}
      <div className="grid-card card">
        <div className="grid-scroll-container">
          <table className="sheet-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th className="col-req">Member *</th>
                <th>Group *</th>
                <th>Color</th>
                <th>Date *</th>
                <th className="col-auto">Country (Auto)</th>
                <th className="col-auto">Company (Auto)</th>
                <th>Event Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Qty</th>
                <th className="col-calc">Total Price ฿ (IFS UI)</th>
                <th>Photo Link (IMG)</th>
                <th>Talk Topic</th>
                <th>Del</th>
              </tr>
            </thead>
            <tbody>
              {gridRows.map((row, idx) => {
                const isSelectedRow = selectedCell?.rowIdx === idx;

                return (
                  <tr key={row.localId} className={`${row.isDirty ? 'row-dirty' : ''} ${isSelectedRow ? 'row-active' : ''}`}>
                    <td className="col-num">{idx + 1}</td>

                    {/* Member (Auto-matches color & group or opens popup if multiple) */}
                    <td>
                      <input
                        type="text"
                        list={`members_list_${idx}`}
                        value={row.member}
                        onChange={(e) => handleMemberSelect(idx, e.target.value)}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'member' })}
                        placeholder="Select or type..."
                      />
                      <datalist id={`members_list_${idx}`}>
                        {Array.from(new Set(members.map(m => m.member_name))).map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </td>

                    {/* Group */}
                    <td>
                      <input
                        type="text"
                        list={`groups_list_${idx}`}
                        value={row.group}
                        onChange={(e) => handleCellChange(idx, 'group', e.target.value)}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'group' })}
                        placeholder="Select or type..."
                      />
                      <datalist id={`groups_list_${idx}`}>
                        {groups.map((g) => (
                          <option key={g.id} value={g.group} />
                        ))}
                      </datalist>
                    </td>

                    {/* Color */}
                    <td>
                      <select
                        value={row.color}
                        onChange={(e) => handleCellChange(idx, 'color', e.target.value)}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'color' })}
                      >
                        {colors.map((c) => (
                          <option key={c.id} value={c.color}>{c.color}</option>
                        ))}
                      </select>
                    </td>

                    {/* Date */}
                    <td>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => handleCellChange(idx, 'date', e.target.value)}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'date' })}
                      />
                    </td>

                    {/* Auto Country */}
                    <td className="col-auto"><input type="text" readOnly value={row.nationality} /></td>

                    {/* Auto Company */}
                    <td className="col-auto"><input type="text" readOnly value={row.company} /></td>

                    {/* Event */}
                    <td>
                      <input
                        type="text"
                        value={row.event}
                        onChange={(e) => handleCellChange(idx, 'event', e.target.value)}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'event' })}
                        placeholder="Event name..."
                      />
                    </td>

                    {/* Type */}
                    <td>
                      <select
                        value={row.type}
                        onChange={(e) => handleCellChange(idx, 'type', e.target.value)}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'type' })}
                      >
                        {types.map((t) => (
                          <option key={t.id} value={t.type}>{t.type}</option>
                        ))}
                      </select>
                    </td>

                    {/* Location */}
                    <td>
                      <select
                        value={row.location}
                        onChange={(e) => handleCellChange(idx, 'location', e.target.value)}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'location' })}
                      >
                        {locations.map((l) => (
                          <option key={l.id} value={l.location}>{l.location}</option>
                        ))}
                      </select>
                    </td>

                    {/* Quantity */}
                    <td>
                      <input
                        type="number"
                        min="1"
                        style={{ width: '55px' }}
                        value={row.quantity}
                        onChange={(e) => handleCellChange(idx, 'quantity', Number(e.target.value))}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'quantity' })}
                      />
                    </td>

                    {/* Total Price */}
                    <td className="col-calc">
                      <input
                        type="number"
                        style={{ width: '75px', fontWeight: 'bold' }}
                        value={row.totalPrice}
                        onChange={(e) => handleCellChange(idx, 'totalPrice', Number(e.target.value))}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'totalPrice' })}
                      />
                    </td>

                    {/* IMG */}
                    <td>
                      <input
                        type="url"
                        value={row.img}
                        onChange={(e) => handleCellChange(idx, 'img', e.target.value)}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'img' })}
                        placeholder="https://..."
                      />
                    </td>

                    {/* Talk Topic */}
                    <td>
                      <input
                        type="text"
                        value={row.talkTopic}
                        onChange={(e) => handleCellChange(idx, 'talkTopic', e.target.value)}
                        onFocus={() => setSelectedCell({ rowIdx: idx, colKey: 'talkTopic' })}
                      />
                    </td>

                    {/* Delete */}
                    <td>
                      <button onClick={() => handleDeleteRow(idx)} className="btn-del" title="Delete Row">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid-bottom">
          <button className="btn btn-secondary btn-sm" onClick={handleAddBlankRow}>
            <Plus size={14} /> Add Blank Row
          </button>
        </div>
      </div>

      {/* Multiple Group Choice Edge Case Popup */}
      {groupSelectModal && (
        <div className="modal-overlay" onClick={() => setGroupSelectModal(null)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <AlertCircle size={20} className="text-warning" />
                <h3>Select Group Era for &quot;{groupSelectModal.memberName}&quot;</h3>
              </div>
              <button className="btn-close" onClick={() => setGroupSelectModal(null)}><X size={18} /></button>
            </div>
            <p className="modal-desc">This member belongs to multiple groups across different eras. Please pick which group applies:</p>

            <div className="group-choices-list">
              {groupSelectModal.matchingMembers.map((m, idx) => (
                <button key={idx} className="group-choice-btn" onClick={() => applyGroupSelection(m)}>
                  <div className="choice-title">{m.group} ({m.country})</div>
                  <div className="choice-meta">Company: {m.company} • Color: {m.color}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Price Rule Modal */}
      {showRuleModal && (
        <PriceRuleBuilderModal
          rules={priceRules}
          onSave={updateRules}
          onClose={() => setShowRuleModal(false)}
        />
      )}

      {/* Bulk Paste Modal */}
      {showPasteModal && (
        <div className="modal-overlay" onClick={() => setShowPasteModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Bulk Paste Google Sheets / Excel Data</h2>
                <p className="modal-sub">Paste tab-separated text copied directly from your spreadsheet.</p>
              </div>
            </div>

            <textarea
              className="paste-area"
              rows={10}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder="Paste tab-separated rows here (Member, Color, Group, Nationality, Date, ...)"
            />

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPasteModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkPasteSubmit}>
                <FileSpreadsheet size={16} /> Import Parsed Rows
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .grid-entry-page { display: flex; flex-direction: column; gap: 20px; }
        .page-header { display: flex; justify-content: space-between; align-items: center; }
        .header-actions { display: flex; gap: 10px; }
        .page-title { font-size: 1.6rem; }
        .page-subtitle { color: var(--text-muted); font-size: 0.88rem; margin-top: -12px; }

        .success-banner {
          display: flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.3); padding: 10px 16px; border-radius: var(--radius-sm); font-weight: 500;
        }

        .grid-card { padding: 0; overflow: hidden; max-width: 100%; }

        /* Responsive slider/overflow container */
        .grid-scroll-container {
          width: 100%;
          overflow-x: auto;
          max-height: 65vh;
          -webkit-overflow-scrolling: touch;
        }

        .sheet-table {
          width: 100%;
          min-width: 1100px;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .sheet-table th {
          position: sticky; top: 0; z-index: 10; background: var(--bg-surface-2); border-right: 1px solid var(--border-subtle); font-size: 0.75rem; padding: 8px 10px; white-space: nowrap;
        }

        .sheet-table td {
          padding: 4px; border-right: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);
        }

        .sheet-table input, .sheet-table select {
          border: none; background: transparent; padding: 6px 8px; border-radius: 0; box-shadow: none;
          &:focus { background: var(--bg-surface-3); outline: 2px solid var(--accent-primary); }
        }

        .col-num { text-align: center; width: 40px; color: var(--text-subtle); font-weight: 600; background: var(--bg-surface-1); }
        .col-auto input { background: rgba(255, 255, 255, 0.03); color: var(--text-muted); }
        .col-calc input { color: var(--accent-primary); }

        .row-dirty td { background: rgba(212, 168, 75, 0.05); }
        .row-active td { border-bottom-color: var(--accent-primary); }

        .btn-del { background: none; border: none; color: var(--text-subtle); cursor: pointer; display: flex; justify-content: center; width: 100%; &:hover { color: var(--color-danger); } }
        .grid-bottom { padding: 12px; background: var(--bg-surface-2); border-top: 1px solid var(--border-subtle); }

        /* Multiple Group Selection Modal */
        .modal-title-wrap { display: flex; align-items: center; gap: 8px; }
        .modal-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; }
        .group-choices-list { display: flex; flex-direction: column; gap: 8px; }
        .group-choice-btn {
          background: var(--bg-surface-2); border: 1px solid var(--border-subtle); padding: 12px; border-radius: var(--radius-sm); text-align: left; cursor: pointer; transition: all var(--transition-fast);
          &:hover { border-color: var(--accent-primary); background: var(--bg-surface-3); }
        }
        .choice-title { font-weight: 600; color: var(--accent-primary); font-size: 0.95rem; }
        .choice-meta { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }

        .paste-area { font-family: monospace; font-size: 0.82rem; background: var(--bg-surface-2); color: var(--text-main); border: 1px solid var(--border-strong); padding: 12px; border-radius: var(--radius-sm); width: 100%; }

        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px;
        }

        .modal-card {
          background: var(--bg-surface-1); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 24px; width: 100%; max-width: 640px; display: flex; flex-direction: column; gap: 16px;
          &.small { max-width: 440px; }
        }

        .modal-header { display: flex; justify-content: space-between; align-items: center; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
      `}</style>

    </div>
  );
}
