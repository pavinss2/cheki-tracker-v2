'use client';

import React, { useState, useMemo } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { addMetadataDoc, updateMetadataDoc, deleteMetadataDoc, getAdminLogs, getItemValueString, importFromDefaultMetadata, clearUserCustomMetadata } from '@/lib/dataStore';
import { DEFAULT_COUNTRIES, DEFAULT_COMPANIES, DEFAULT_GROUPS, DEFAULT_MEMBERS } from '@/lib/seedData';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { Plus, Edit2, Trash2, Shield, Users, Building, Layers, X, Save, ArrowUpDown, ExternalLink, Lock, Download, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { formatDisplayName } from '@/lib/imageUtils';

type MemberSortKey = 'date_added' | 'member_name' | 'color' | 'group' | 'country' | 'company' | 'start_date' | 'end_date' | 'is_active';

interface TempMemberRow {
  member_name: string;
  color: string;
  group: string;
  country: string;
  company: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  x_profile: string;
  member_image: string;
  date_added: string;
}

export default function BackOfficePage() {
  const { user, isDemoUser } = useAuth();
  const { members, companies, groups, colors, types, countries, userId, loading } = useChekiData();

  const [activeTab, setActiveTab] = useState<'members' | 'groups' | 'companies' | 'logs'>('members');
  const [editingItem, setEditingItem] = useState<{ table: string; data: Record<string, unknown> } | null>(null);
  
  // Sorting state for dim_member (Defaults to date_added descending)
  const [memberSortKey, setMemberSortKey] = useState<MemberSortKey>('date_added');
  const [memberSortAsc, setMemberSortAsc] = useState<boolean>(false);

  // Temporary draft row state for creating a new member (pinned at top row)
  const [tempMember, setTempMember] = useState<TempMemberRow | null>(null);
  const [isSavingTemp, setIsSavingTemp] = useState(false);

  // Quick inline new option modal for creating missing choices on the fly
  const [inlineNewModal, setInlineNewModal] = useState<{ table: string; fieldKey: string; name: string } | null>(null);

  // Custom popup for delete confirmation
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    table: string;
    id: string;
    displayValue: string;
  } | null>(null);

  // Import Wizard Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    const countries = Array.from(new Set(DEFAULT_COUNTRIES.map(c => c.displayed_country || c.country)));
    const th = countries.find(c => c === '🇹🇭 TH' || c.includes('TH') || c.includes('Thailand'));
    return th ? th : '__ALL__';
  });
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const logs = getAdminLogs(userId);

  const handleOpenImportModal = () => {
    const thOption = availableCountries.find(c => c === '🇹🇭 TH' || c.includes('TH') || c.includes('Thailand'));
    setSelectedCountry(thOption ? thOption : '__ALL__');
    setSelectedCompany('');
    setSelectedGroup('');
    setImportStep(1);
    setIsImportModalOpen(true);
  };

  // Group lookup map for auto-populating country & company when group is selected
  const groupLookup = useMemo(() => {
    const map: Record<string, { company: string; country: string }> = {};
    groups.forEach((g) => {
      map[g.group] = { company: g.company, country: g.country };
    });
    return map;
  }, [groups]);

  // Execute Import from Default Metadata Wizard
  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      const selection = {
        country: (!selectedCountry || selectedCountry === '__ALL__') ? undefined : selectedCountry,
        company: (!selectedCompany || selectedCompany === '__ALL__') ? undefined : selectedCompany,
        group: (!selectedGroup || selectedGroup === '__ALL__') ? undefined : selectedGroup,
      };

      const res = await importFromDefaultMetadata(
        userId,
        selection,
        DEFAULT_MEMBERS,
        DEFAULT_GROUPS,
        DEFAULT_COMPANIES,
        isDemoUser
      );
      setImportSuccessMsg(`Successfully imported ${res.count} items from Default settings!`);
      setTimeout(() => {
        setImportSuccessMsg(null);
        setIsImportModalOpen(false);
        setImportStep(1);
        const thOption = availableCountries.find(c => c === '🇹🇭 TH' || c.includes('TH') || c.includes('Thailand'));
        setSelectedCountry(thOption ? thOption : '__ALL__');
        setSelectedCompany('');
        setSelectedGroup('');
      }, 1800);
    } catch (err) {
      alert("Failed importing: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsImporting(false);
    }
  };

  // Reset/Clear user custom dim_* metadata
  const handleResetCustomData = async () => {
    if (!confirm("Are you sure you want to clear all your custom dim_* data? Your view will rely on Back Office global defaults.")) return;
    try {
      await clearUserCustomMetadata(userId, isDemoUser);
      alert("Custom data cleared! Now using global Back Office default settings.");
    } catch (err) {
      alert("Error clearing custom data: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Handle column sorting
  const handleSortMembers = (key: MemberSortKey) => {
    if (memberSortKey === key) {
      setMemberSortAsc(!memberSortAsc);
    } else {
      setMemberSortKey(key);
      setMemberSortAsc(key === 'date_added' ? false : true);
    }
  };

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (memberSortKey === 'is_active') {
        valA = a.is_active ? 1 : 0;
        valB = b.is_active ? 1 : 0;
      } else if (memberSortKey === 'date_added') {
        valA = a.date_added || '1000-12-26';
        valB = b.date_added || '1000-12-26';
      } else {
        valA = String(a[memberSortKey] ?? '').toLowerCase();
        valB = String(b[memberSortKey] ?? '').toLowerCase();
      }

      if (valA < valB) return memberSortAsc ? -1 : 1;
      if (valA > valB) return memberSortAsc ? 1 : -1;
      return 0;
    });
  }, [members, memberSortKey, memberSortAsc]);

  // Init temporary member draft row (Default dates: 1000-12-26, 9999-12-31, date_added: today)
  const handleStartAddMember = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setTempMember({
      member_name: '',
      color: 'White',
      group: '',
      country: '🇹🇭 TH',
      company: 'Individual',
      start_date: '1000-12-26',
      end_date: '9999-12-31',
      is_active: true,
      x_profile: '',
      member_image: '',
      date_added: todayStr,
    });
  };

  // Confirm & Save Temporary Member Row to Database
  const handleSaveTempMember = async () => {
    if (!tempMember) return;
    if (!tempMember.member_name.trim()) {
      alert("Please enter a Member Name.");
      return;
    }

    setIsSavingTemp(true);
    try {
      await addMetadataDoc('dim_member', userId, tempMember as unknown as Record<string, unknown>, isDemoUser);
      setTempMember(null);
    } catch (err) {
      console.error("Failed saving member:", err);
      alert("Failed saving member: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingTemp(false);
    }
  };

  // Quick inline creation of missing choice (Color, Group, Company)
  const handleSaveInlineOption = async () => {
    if (!inlineNewModal || !inlineNewModal.name.trim()) return;
    const { table, fieldKey, name } = inlineNewModal;
    const cleanName = name.trim();

    try {
      if (table === 'dim_color') {
        await addMetadataDoc('dim_color', userId, { color: cleanName, color_code: '#ffffff' }, isDemoUser);
        if (tempMember) setTempMember({ ...tempMember, color: cleanName });
      } else if (table === 'dim_group') {
        await addMetadataDoc('dim_group', userId, { group: cleanName, country: '🇹🇭 TH', company: 'Individual' }, isDemoUser);
        if (tempMember) setTempMember({ ...tempMember, group: cleanName });
      } else if (table === 'dim_company') {
        await addMetadataDoc('dim_company', userId, { company: cleanName }, isDemoUser);
      }
      setInlineNewModal(null);
    } catch (err) {
      alert("Failed to create option: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { table, data } = editingItem;
    const id = data.id as string;
    await updateMetadataDoc(table, id, userId, data, isDemoUser);
    setEditingItem(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal) return;
    const { table, id, displayValue } = deleteConfirmModal;
    await deleteMetadataDoc(table, id, userId, displayValue, isDemoUser);
    setDeleteConfirmModal(null);
  };

  // Filter choices for Import Wizard
  const availableCountries = useMemo(() => {
    return Array.from(new Set(DEFAULT_COUNTRIES.map(c => c.displayed_country || c.country)));
  }, []);

  const availableCompanies = useMemo(() => {
    return Array.from(new Set(
      DEFAULT_GROUPS
        .filter(g => !selectedCountry || selectedCountry === '__ALL__' || g.country === selectedCountry || g.country.includes(selectedCountry))
        .map(g => g.company)
    ));
  }, [selectedCountry]);

  const availableGroups = useMemo(() => {
    return DEFAULT_GROUPS.filter(g => {
      if (selectedCountry && selectedCountry !== '__ALL__' && (g.country !== selectedCountry && !g.country.includes(selectedCountry))) return false;
      if (selectedCompany && selectedCompany !== '__ALL__' && g.company !== selectedCompany) return false;
      return true;
    });
  }, [selectedCountry, selectedCompany]);

  const importPreviewCount = useMemo(() => {
    const targetCountry = (!selectedCountry || selectedCountry === '__ALL__') ? undefined : selectedCountry;
    const targetCompany = (!selectedCompany || selectedCompany === '__ALL__') ? undefined : selectedCompany;
    const targetGroup = (!selectedGroup || selectedGroup === '__ALL__') ? undefined : selectedGroup;

    const matchingMembers = DEFAULT_MEMBERS.filter((m) => {
      if (targetCountry && m.country !== targetCountry && !m.country.includes(targetCountry)) return false;
      if (targetCompany && m.company !== targetCompany) return false;
      if (targetGroup && m.group !== targetGroup) return false;
      return true;
    });

    const matchingGroups = DEFAULT_GROUPS.filter((g) => {
      if (targetCountry && g.country !== targetCountry && !g.country.includes(targetCountry)) return false;
      if (targetCompany && g.company !== targetCompany) return false;
      if (targetGroup && g.group !== targetGroup) return false;
      return true;
    });

    const matchingCompanies = DEFAULT_COMPANIES.filter((c) => {
      if (targetCompany && c.company !== targetCompany) return false;
      return true;
    });

    return matchingMembers.length + matchingGroups.length + matchingCompanies.length;
  }, [selectedCountry, selectedCompany, selectedGroup]);

  if (!user && !isDemoUser) return <LoginPrompt />;
  if (loading) return <CircularSpinner />;

  return (
    <div className="admin-page">
      {/* Admin Tabs */}
      <div className="tabs-bar">
        <button className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          <Users size={16} /> Members ({members.length})
        </button>
        <button className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
          <Layers size={16} /> Groups ({groups.length})
        </button>
        <button className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`} onClick={() => setActiveTab('companies')}>
          <Building size={16} /> Companies ({companies.length})
        </button>
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          <Shield size={16} /> Audit Logs ({logs.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="table-card card">
        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div>
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleOpenImportModal}
              >
                <Download size={14} /> Import from Default
              </button>
              <button className="btn btn-outline btn-sm danger-text" onClick={handleResetCustomData} title="Clear user custom data to rely purely on default_dim_*">
                <RefreshCw size={14} /> Reset Custom Data
              </button>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: '12px' }} onClick={handleStartAddMember} disabled={Boolean(tempMember)}>
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table member-table">
                <thead>
                  <tr>
                    <th>Origin</th>
                    <th>Avatar</th>
                    <th className="sortable-th" onClick={() => handleSortMembers('member_name')}>
                      Member Name {memberSortKey === 'member_name' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('color')}>
                      Color {memberSortKey === 'color' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('group')}>
                      Group {memberSortKey === 'group' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('country')}>
                      Country <span title="Locked & auto-mapped by Group"><Lock size={11} /></span> {memberSortKey === 'country' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('company')}>
                      Company <span title="Locked & auto-mapped by Group"><Lock size={11} /></span> {memberSortKey === 'company' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('start_date')}>
                      Start Date {memberSortKey === 'start_date' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('end_date')}>
                      End Date {memberSortKey === 'end_date' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('is_active')}>
                      Active Status {memberSortKey === 'is_active' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th>X Profile</th>
                    <th className="sortable-th" onClick={() => handleSortMembers('date_added')}>
                      Date Added {memberSortKey === 'date_added' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Temporary Unsaved New Member Row Pinned at Top Row */}
                  {tempMember && (
                    <tr className="temp-row">
                      <td><span className="badge-pill dark" style={{ fontSize: '0.72rem' }}>New Draft</span></td>
                      <td style={{ minWidth: '160px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MemberAvatar 
                            src={tempMember.member_image} 
                            name={tempMember.member_name || 'New'} 
                            size={32} 
                            colorHex={colors.find(c => c.color === tempMember.color)?.color_code} 
                          />
                          <input 
                            type="url" 
                            className="table-input" 
                            placeholder="Image URL (https://...)" 
                            value={tempMember.member_image} 
                            onChange={(e) => setTempMember({ ...tempMember, member_image: e.target.value })}
                            title="Member Avatar Image URL"
                          />
                        </div>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input bold" 
                          placeholder="Member Name *" 
                          autoFocus
                          value={tempMember.member_name} 
                          onChange={(e) => setTempMember({ ...tempMember, member_name: e.target.value })}
                        />
                      </td>
                      <td>
                        <select 
                          className="table-select"
                          value={tempMember.color}
                          onChange={(e) => {
                            if (e.target.value === '__CREATE_NEW__') {
                              setInlineNewModal({ table: 'dim_color', fieldKey: 'color', name: '' });
                            } else {
                              setTempMember({ ...tempMember, color: e.target.value });
                            }
                          }}
                        >
                          {colors.map((c) => (
                            <option key={c.id} value={c.color}>{c.color}</option>
                          ))}
                          <option value="__CREATE_NEW__">+ Create New Color...</option>
                        </select>
                      </td>
                      <td>
                        <select 
                          className="table-select"
                          value={tempMember.group}
                          onChange={(e) => {
                            const grpVal = e.target.value;
                            if (grpVal === '__CREATE_NEW__') {
                              setInlineNewModal({ table: 'dim_group', fieldKey: 'group', name: '' });
                            } else {
                              const mapped = groupLookup[grpVal];
                              setTempMember({ 
                                ...tempMember, 
                                group: grpVal,
                                company: mapped?.company || 'Individual',
                                country: mapped?.country || '🇹🇭 TH'
                              });
                            }
                          }}
                        >
                          <option value="">-- Select Group --</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.group}>{g.group}</option>
                          ))}
                          <option value="__CREATE_NEW__">+ Create New Group...</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          disabled 
                          className="table-input disabled" 
                          value={tempMember.country} 
                          title="Country is locked and auto-mapped by selected Group"
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          disabled 
                          className="table-input disabled" 
                          value={tempMember.company} 
                          title="Company is locked and auto-mapped by selected Group"
                        />
                      </td>
                      <td>
                        <input 
                          type="date" 
                          className="table-input" 
                          value={tempMember.start_date} 
                          onChange={(e) => setTempMember({ ...tempMember, start_date: e.target.value })}
                        />
                      </td>
                      <td>
                        <input 
                          type="date" 
                          className="table-input" 
                          value={tempMember.end_date} 
                          onChange={(e) => setTempMember({ ...tempMember, end_date: e.target.value })}
                        />
                      </td>
                      <td>
                        <select 
                          className="table-select"
                          value={tempMember.is_active ? 'active' : 'inactive'}
                          onChange={(e) => setTempMember({ ...tempMember, is_active: e.target.value === 'active' })}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input" 
                          placeholder="https://x.com/..." 
                          value={tempMember.x_profile} 
                          onChange={(e) => setTempMember({ ...tempMember, x_profile: e.target.value })}
                        />
                      </td>
                      <td>
                        <input 
                          type="date" 
                          className="table-input" 
                          value={tempMember.date_added} 
                          onChange={(e) => setTempMember({ ...tempMember, date_added: e.target.value })}
                          title="Date Added"
                        />
                      </td>
                      <td>
                        <div className="action-btns">
                          <button 
                            className="btn btn-primary btn-xs" 
                            onClick={handleSaveTempMember}
                            disabled={isSavingTemp}
                            title="Save New Member to Database"
                          >
                            <Save size={13} /> {isSavingTemp ? 'Saving...' : 'Save'}
                          </button>
                          <button 
                            className="btn btn-secondary btn-xs" 
                            onClick={() => setTempMember(null)}
                            title="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Empty state message */}
                  {sortedMembers.length === 0 && !tempMember && (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No members in your list yet. Click <strong>Import from Default</strong> above to copy choices, or click <strong>+ Add</strong> to create a new custom member.
                      </td>
                    </tr>
                  )}

                  {/* Sorted Member List */}
                  {sortedMembers.map((m) => {
                    const colorObj = colors.find(c => c.color === m.color);
                    const xUrl = m.x_profile 
                      ? (m.x_profile.startsWith('http') ? m.x_profile : `https://x.com/${m.x_profile.replace('@', '')}`)
                      : '';
                    const isImp = m.is_imported || m.isDefault || m.id.startsWith('default_');

                    return (
                      <tr key={m.id}>
                        <td>
                          {isImp ? (
                            <span className="badge-pill gold-outline" style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 600 }}>Imported</span>
                          ) : (
                            <span className="badge-pill dark" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>Custom</span>
                          )}
                        </td>
                        <td>
                          <MemberAvatar 
                            src={m.member_image} 
                            name={m.member_name} 
                            size={36} 
                            colorHex={colorObj?.color_code} 
                          />
                        </td>
                        <td><strong>{formatDisplayName(m.member_name)}</strong></td>
                        <td>{m.color}</td>
                        <td>{m.group}</td>
                        <td>{m.country}</td>
                        <td>{m.company}</td>
                        <td>{m.start_date || '-'}</td>
                        <td>{m.end_date || '-'}</td>
                        <td>
                          <span className={`status-badge ${m.is_active !== false ? 'active' : ''}`}>
                            {m.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {xUrl ? (
                            <a href={xUrl} target="_blank" rel="noreferrer" className="x-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <ExternalLink size={13} /> Link
                            </a>
                          ) : '-'}
                        </td>
                        <td>{m.date_added || '-'}</td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_member', data: { ...m } })}><Edit2 size={15} /></button>
                            <button 
                              className="btn-icon danger" 
                              onClick={() => setDeleteConfirmModal({ table: 'dim_member', id: m.id, displayValue: getItemValueString(m as unknown as Record<string, unknown>) })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <div>
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleOpenImportModal}
              >
                <Download size={14} /> Import from Default
              </button>
              <button className="btn btn-outline btn-sm danger-text" onClick={handleResetCustomData} title="Clear user custom data to rely purely on default_dim_*">
                <RefreshCw size={14} /> Reset Custom Data
              </button>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: '12px' }} onClick={() => setEditingItem({ table: 'dim_group', data: { group: '', country: '🇹🇭 TH', company: 'Individual' } })}>
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Origin</th>
                    <th>Group Name</th>
                    <th>Country</th>
                    <th>Company</th>
                    <th>Active Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No groups in your list yet. Click <strong>Import from Default</strong> above to copy choices, or click <strong>+ Add</strong>.
                      </td>
                    </tr>
                  )}
                  {groups.map((g) => {
                    const isImp = g.is_imported || g.isDefault || g.id.startsWith('default_');
                    return (
                      <tr key={g.id}>
                        <td>
                          {isImp ? (
                            <span className="badge-pill gold-outline" style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 600 }}>Imported</span>
                          ) : (
                            <span className="badge-pill dark" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>Custom</span>
                          )}
                        </td>
                        <td><strong>{g.group}</strong></td>
                        <td>{g.country}</td>
                        <td>{g.company}</td>
                        <td>
                          <span className={`status-badge ${g.is_active !== false ? 'active' : ''}`}>
                            {g.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_group', data: { ...g } })}><Edit2 size={15} /></button>
                            <button 
                              className="btn-icon danger" 
                              onClick={() => setDeleteConfirmModal({ table: 'dim_group', id: g.id, displayValue: getItemValueString(g as unknown as Record<string, unknown>) })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMPANIES TAB */}
        {activeTab === 'companies' && (
          <div>
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleOpenImportModal}
              >
                <Download size={14} /> Import from Default
              </button>
              <button className="btn btn-outline btn-sm danger-text" onClick={handleResetCustomData} title="Clear user custom data to rely purely on default_dim_*">
                <RefreshCw size={14} /> Reset Custom Data
              </button>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: '12px' }} onClick={() => setEditingItem({ table: 'dim_company', data: { company: '' } })}>
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Origin</th>
                    <th>Company Name</th>
                    <th>Active Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No companies in your list yet. Click <strong>Import from Default</strong> above to copy choices, or click <strong>+ Add</strong>.
                      </td>
                    </tr>
                  )}
                  {companies.map((c) => {
                    const isImp = c.is_imported || c.isDefault || c.id.startsWith('default_');
                    return (
                      <tr key={c.id}>
                        <td>
                          {isImp ? (
                            <span className="badge-pill gold-outline" style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 600 }}>Imported</span>
                          ) : (
                            <span className="badge-pill dark" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>Custom</span>
                          )}
                        </td>
                        <td><strong>{c.company}</strong></td>
                        <td>
                          <span className={`status-badge ${c.is_active !== false ? 'active' : ''}`}>
                            {c.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_company', data: { ...c } })}><Edit2 size={15} /></button>
                            <button 
                              className="btn-icon danger" 
                              onClick={() => setDeleteConfirmModal({ table: 'dim_company', id: c.id, displayValue: getItemValueString(c as unknown as Record<string, unknown>) })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div>
            <div className="tab-header">
              {/* <h2>fact_admin_log</h2> */}
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action Type</th>
                    <th>Action Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td>{new Date(l.timestamp).toLocaleString()}</td>
                      <td><span className="log-badge">{l.actionType}</span></td>
                      <td><strong>{l.actionDetail}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal Popup */}
      {deleteConfirmModal && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmModal(null)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--color-danger, #ef4444)' }}>Confirm Delete</h2>
              <button className="btn-close" onClick={() => setDeleteConfirmModal(null)}><X size={18} /></button>
            </div>
            <p style={{ margin: '12px 0 6px 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Are you sure you want to delete this record from <strong>{deleteConfirmModal.table}</strong>?
            </p>
            <div style={{ padding: '10px 14px', background: 'var(--bg-surface-2)', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div><strong>ID:</strong> {deleteConfirmModal.id}</div>
              <div><strong>Value:</strong> {deleteConfirmModal.displayValue || '(empty)'}</div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmModal(null)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ backgroundColor: 'var(--color-danger, #ef4444)', borderColor: 'var(--color-danger, #ef4444)' }} 
                onClick={handleConfirmDelete}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Edit Form Modal for Modifying Existing Records */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem.data.id ? 'Edit' : 'Add New'} {editingItem.table} Record</h2>
              <button className="btn-close" onClick={() => setEditingItem(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEdit} className="form-grid">
              {editingItem.table === 'dim_member' && (
                <>
                  <div className="form-group span-2">
                    <label>Member Name *</label>
                    <input
                      type="text"
                      required
                      value={String(editingItem.data.member_name || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, member_name: e.target.value } })}
                    />
                  </div>

                  <div className="form-group span-2">
                    <label>Member Avatar Image URL</label>
                    <input
                      type="url"
                      value={String(editingItem.data.member_image || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, member_image: e.target.value } })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Color</label>
                    <select
                      value={String(editingItem.data.color || '')}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE_NEW__') {
                          setInlineNewModal({ table: 'dim_color', fieldKey: 'color', name: '' });
                        } else {
                          setEditingItem({ ...editingItem, data: { ...editingItem.data, color: e.target.value } });
                        }
                      }}
                    >
                      {colors.map((c) => (
                        <option key={c.id} value={c.color}>{c.color}</option>
                      ))}
                      <option value="__CREATE_NEW__">+ Create New Color...</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Group</label>
                    <select
                      value={String(editingItem.data.group || '')}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE_NEW__') {
                          setInlineNewModal({ table: 'dim_group', fieldKey: 'group', name: '' });
                        } else {
                          const grpVal = e.target.value;
                          const mapped = groupLookup[grpVal];
                          setEditingItem({ 
                            ...editingItem, 
                            data: { 
                              ...editingItem.data, 
                              group: grpVal,
                              company: mapped?.company || 'Individual',
                              country: mapped?.country || '🇹🇭 TH',
                            } 
                          });
                        }
                      }}
                    >
                      <option value="">-- Select Group --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.group}>{g.group}</option>
                      ))}
                      <option value="__CREATE_NEW__">+ Create New Group...</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Country <span title="Locked & auto-mapped by Group"><Lock size={12} /></span>
                    </label>
                    <input
                      type="text"
                      disabled
                      className="table-input disabled"
                      value={String(editingItem.data.country || '🇹🇭 TH')}
                      title="Country is locked and auto-mapped by Group"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Company <span title="Locked & auto-mapped by Group"><Lock size={12} /></span>
                    </label>
                    <input
                      type="text"
                      disabled
                      className="table-input disabled"
                      value={String(editingItem.data.company || 'Individual')}
                      title="Company is locked and auto-mapped by Group"
                    />
                  </div>

                  <div className="form-group">
                    <label>Date Added</label>
                    <input
                      type="date"
                      value={String(editingItem.data.date_added || new Date().toISOString().split('T')[0])}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, date_added: e.target.value } })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      required
                      value={String(editingItem.data.start_date || '1000-12-26')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, start_date: e.target.value } })}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date *</label>
                    <input
                      type="date"
                      required
                      value={String(editingItem.data.end_date || '9999-12-31')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, end_date: e.target.value } })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={editingItem.data.is_active !== false ? 'active' : 'inactive'}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, is_active: e.target.value === 'active' } })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group span-2">
                    <label>X / Twitter Profile</label>
                    <input
                      type="text"
                      value={String(editingItem.data.x_profile || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, x_profile: e.target.value } })}
                      placeholder="https://x.com/username or @username"
                    />
                  </div>
                </>
              )}

              {editingItem.table === 'dim_group' && (
                <>
                  <div className="form-group span-2">
                    <label>Group Name *</label>
                    <input
                      type="text"
                      required
                      value={String(editingItem.data.group || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, group: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <select
                      value={String(editingItem.data.country || '')}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE_NEW__') {
                          setInlineNewModal({ table: 'dim_country', fieldKey: 'country', name: '' });
                        } else {
                          setEditingItem({ ...editingItem, data: { ...editingItem.data, country: e.target.value } });
                        }
                      }}
                    >
                      {countries.map((c) => (
                        <option key={c.id} value={c.displayed_country}>{c.displayed_country}</option>
                      ))}
                      <option value="__CREATE_NEW__">+ Create New Country...</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <select
                      value={String(editingItem.data.company || '')}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE_NEW__') {
                          setInlineNewModal({ table: 'dim_company', fieldKey: 'company', name: '' });
                        } else {
                          setEditingItem({ ...editingItem, data: { ...editingItem.data, company: e.target.value } });
                        }
                      }}
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.company}>{c.company}</option>
                      ))}
                      <option value="__CREATE_NEW__">+ Create New Company...</option>
                    </select>
                  </div>
                </>
              )}

              {/* Generic fallback for other tables */}
              {editingItem.table !== 'dim_member' && editingItem.table !== 'dim_group' && (
                Object.keys(editingItem.data).filter(k => k !== 'id' && k !== 'userId' && k !== 'updatedAt' && k !== 'createdAt').map((key) => (
                  <div key={key} className="form-group">
                    <label>{key.replace('_', ' ').toUpperCase()}</label>
                    <input
                      type="text"
                      value={String(editingItem.data[key] ?? '')}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, [key]: e.target.value },
                      })}
                    />
                  </div>
                ))
              )}

              <div className="form-actions span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Record (Confirm)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline Create New Dimension Choice Modal */}
      {inlineNewModal && (
        <div className="modal-overlay" onClick={() => setInlineNewModal(null)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>+ Create New {inlineNewModal.table.replace('dim_', '').toUpperCase()}</h2>
              <button className="btn-close" onClick={() => setInlineNewModal(null)}><X size={18} /></button>
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Name / Value *</label>
              <input
                type="text"
                autoFocus
                value={inlineNewModal.name}
                onChange={(e) => setInlineNewModal({ ...inlineNewModal, name: e.target.value })}
                placeholder="Type new option name..."
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setInlineNewModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveInlineOption}>Save Choice (Confirm)</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Wizard Modal Overlay */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} /> Import from Default Settings
              </h2>
              <button className="btn-close" onClick={() => setIsImportModalOpen(false)}><X size={18} /></button>
            </div>

            {importSuccessMsg ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✨</div>
                <h3 style={{ color: 'var(--color-success)', margin: '0 0 4px 0' }}>{importSuccessMsg}</h3>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', alignItems: 'center' }}>
                  <span className={`badge-pill ${importStep === 1 ? 'gold-outline' : 'dark'}`}>1. Country</span>
                  <ChevronRight size={14} style={{ opacity: 0.5 }} />
                  <span className={`badge-pill ${importStep === 2 ? 'gold-outline' : 'dark'}`}>2. Company</span>
                  <ChevronRight size={14} style={{ opacity: 0.5 }} />
                  <span className={`badge-pill ${importStep === 3 ? 'gold-outline' : 'dark'}`}>3. Group & Confirm</span>
                </div>

                {/* STEP 1: SELECT COUNTRY */}
                {importStep === 1 && (
                  <div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      Select a Country or choose <strong>"All Countries"</strong> to define your import scope.
                    </p>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label>Select Country</label>
                      <select 
                        className="table-select" 
                        style={{ padding: '8px 10px', fontSize: '0.9rem' }}
                        value={selectedCountry} 
                        onChange={(e) => setSelectedCountry(e.target.value)}
                      >
                        <option value="">-- Choose Country --</option>
                        <option value="__ALL__">🌐 All Countries (Select All)</option>
                        {availableCountries.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '20px' }}>
                      <button className="btn btn-secondary" onClick={() => setIsImportModalOpen(false)}>Cancel</button>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => setImportStep(2)} 
                        disabled={!selectedCountry}
                      >
                        Next: Select Company <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: SELECT COMPANY */}
                {importStep === 2 && (
                  <div>
                    <div style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
                      <span className="badge-pill gold-outline">
                        Country: {selectedCountry === '__ALL__' ? 'All Countries 🌐' : selectedCountry}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      Select a Company or choose <strong>"All Companies"</strong> for the selected scope.
                    </p>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label>Select Company</label>
                      <select 
                        className="table-select" 
                        style={{ padding: '8px 10px', fontSize: '0.9rem' }}
                        value={selectedCompany} 
                        onChange={(e) => setSelectedCompany(e.target.value)}
                      >
                        <option value="">-- Choose Company --</option>
                        <option value="__ALL__">🏢 All Companies (Select All)</option>
                        {availableCompanies.map(comp => (
                          <option key={comp} value={comp}>{comp}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '20px' }}>
                      <button className="btn btn-secondary" onClick={() => setImportStep(1)}>← Back</button>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => {
                          setSelectedGroup('__ALL__');
                          setImportStep(3);
                        }} 
                        disabled={!selectedCompany}
                      >
                        Next: Select Group & Confirm <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: SELECT GROUP & CONFIRM */}
                {importStep === 3 && (
                  <div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '0.82rem' }}>
                      <span className="badge-pill dark">Country: {selectedCountry === '__ALL__' ? 'All Countries 🌐' : selectedCountry}</span>
                      <span className="badge-pill dark">Company: {selectedCompany === '__ALL__' ? 'All Companies 🏢' : selectedCompany}</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label>Select Group</label>
                      <select 
                        className="table-select" 
                        style={{ padding: '8px 10px', fontSize: '0.9rem' }}
                        value={selectedGroup} 
                        onChange={(e) => setSelectedGroup(e.target.value)}
                      >
                        <option value="">-- Choose Group --</option>
                        <option value="__ALL__">👥 All Groups (Select All)</option>
                        {availableGroups.map(grp => (
                          <option key={grp.group} value={grp.group}>{grp.group}</option>
                        ))}
                      </select>
                    </div>

                    {/* Import Confirmation Preview Box */}
                    <div style={{ 
                      background: 'var(--bg-surface-2)', 
                      border: '1px solid var(--border-subtle)', 
                      borderRadius: '8px', 
                      padding: '14px', 
                      marginBottom: '20px',
                      fontSize: '0.86rem'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={15} style={{ color: 'var(--accent-primary)' }} /> Import Summary
                      </div>
                      <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>Target Scope:</strong> {selectedCountry === '__ALL__' ? 'All Countries' : selectedCountry} → {selectedCompany === '__ALL__' ? 'All Companies' : selectedCompany} → {selectedGroup === '__ALL__' ? 'All Groups' : selectedGroup}</div>
                        <div><strong>Matching Records:</strong> <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>~{importPreviewCount} items</span> (members, groups, companies)</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '20px' }}>
                      <button className="btn btn-secondary" onClick={() => setImportStep(2)}>← Back</button>
                      <button 
                        className="btn btn-primary" 
                        onClick={handleConfirmImport} 
                        disabled={!selectedGroup || isImporting || importPreviewCount === 0}
                      >
                        <Sparkles size={14} /> {isImporting ? 'Importing...' : 'Confirm & Import Data'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-page { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 100%; min-width: 0; }
        .page-title { font-size: 1.6rem; }

        .tabs-bar { display: flex; gap: 8px; flex-wrap: wrap; }
        .tab-btn {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--bg-surface-1); border: 1px solid var(--border-subtle); color: var(--text-muted); border-radius: var(--radius-sm); font-weight: 500; font-size: 0.85rem; cursor: pointer;
          &.active { background: var(--accent-primary-subtle); color: var(--accent-primary); border-color: rgba(212, 168, 75, 0.4); font-weight: 600; }
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
          width: calc(100% + 30px);
          max-width: calc(100% + 30px);
          margin-left: -15px;
          margin-right: -15px;
          -webkit-overflow-scrolling: touch;
          display: block;
        }

        .dim-table {
          width: 100%;
          min-width: 500px;
          border-collapse: collapse;
        }

        .dim-table.member-table {
          min-width: 980px;
        }

        .tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }

        .sortable-th {
          cursor: pointer;
          user-select: none;
          &:hover { color: var(--accent-primary); }
        }

        .temp-row {
          background: rgba(212, 168, 75, 0.08);
          border-left: 3px solid var(--accent-primary);
        }

        .table-input {
          width: 100%;
          padding: 4px 8px;
          background: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          color: var(--text-main);
          font-size: 0.82rem;
          &.bold { font-weight: 600; }
          &:focus { border-color: var(--accent-primary); outline: none; }
          &.disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background: var(--bg-surface-3);
          }
        }

        .table-select {
          width: 100%;
          padding: 4px 6px;
          background: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          color: var(--text-main);
          font-size: 0.82rem;
          &:focus { border-color: var(--accent-primary); outline: none; }
        }

        .btn-xs {
          padding: 4px 8px;
          font-size: 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; background: var(--bg-surface-3); color: var(--text-subtle); &.active { background: rgba(16, 185, 129, 0.15); color: var(--color-success); } }
        .color-swatch { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); }
        .log-badge { background: var(--bg-surface-3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-family: monospace; color: var(--accent-blue); }

        .action-btns { display: flex; gap: 6px; align-items: center; }
        .btn-icon { background: none; border: none; color: var(--text-muted); cursor: pointer; &:hover { color: var(--accent-primary); } &.danger:hover { color: var(--color-danger, #ef4444); } }

        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px;
        }

        .modal-card {
          background: var(--bg-surface-1); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 24px; width: 100%; max-width: 580px;
          &.small { max-width: 400px; }
        }

        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .btn-close { background: none; border: none; color: var(--text-muted); cursor: pointer; }

        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
        .span-2 { grid-column: span 2; }
        .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
 
      `}</style>
    </div>
  );
}
