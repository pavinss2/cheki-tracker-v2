'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { 
  subscribeDefaultMetadata, 
  addDefaultMetadataDoc, 
  updateDefaultMetadataDoc, 
  deleteDefaultMetadataDoc, 
  getAdminLogs, 
  getItemValueString 
} from '@/lib/dataStore';
import { 
  DEFAULT_MEMBERS, 
  DEFAULT_GROUPS, 
  DEFAULT_COMPANIES, 
  DEFAULT_COLORS, 
  DEFAULT_TYPES, 
  DEFAULT_COUNTRIES 
} from '@/lib/seedData';
import { 
  DimMember, 
  DimGroup, 
  DimCompany, 
  DimColor, 
  DimType, 
  DimCountry,
  DimLocation 
} from '@/types/cheki';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  Users, 
  Building, 
  Flag, 
  Palette, 
  Layers, 
  Tag, 
  MapPin,
  X, 
  Save, 
  ArrowUpDown, 
  ShieldAlert, 
  Lock 
} from 'lucide-react';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { MemberAvatar } from '@/components/common/MemberAvatar';

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
  const { user, isDemoUser, isSuperAdmin } = useAuth();

  const [members, setMembers] = useState<DimMember[]>([]);
  const [groups, setGroups] = useState<DimGroup[]>([]);
  const [companies, setCompanies] = useState<DimCompany[]>([]);
  const [colors, setColors] = useState<DimColor[]>([]);
  const [types, setTypes] = useState<DimType[]>([]);
  const [countries, setCountries] = useState<DimCountry[]>([]);
  const [locations, setLocations] = useState<DimLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'members' | 'groups' | 'companies' | 'colors' | 'types' | 'countries' | 'locations' | 'logs'>('members');
  const [editingItem, setEditingItem] = useState<{ table: string; data: Record<string, unknown> } | null>(null);

  // Sorting state for dim_member
  const [memberSortKey, setMemberSortKey] = useState<MemberSortKey>('date_added');
  const [memberSortAsc, setMemberSortAsc] = useState<boolean>(false);

  // Temporary draft row state for top-row inline additions
  const [tempMember, setTempMember] = useState<TempMemberRow | null>(null);
  const [tempGroup, setTempGroup] = useState<{ group: string; country: string; company: string } | null>(null);
  const [tempCompany, setTempCompany] = useState<{ company: string } | null>(null);
  const [tempColor, setTempColor] = useState<{ color: string; color_code: string } | null>(null);
  const [tempType, setTempType] = useState<{ type: string } | null>(null);
  const [tempCountry, setTempCountry] = useState<{ country: string; displayed_country: string } | null>(null);
  const [tempLocation, setTempLocation] = useState<{ location: string } | null>(null);

  // Custom popup for delete confirmation
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    table: string;
    id: string;
    displayValue: string;
  } | null>(null);

  const logs = getAdminLogs('global');

  // Subscribe to default metadata collections
  useEffect(() => {
    setLoading(true);
    const unsubMem = subscribeDefaultMetadata<DimMember>('dim_member', DEFAULT_MEMBERS, setMembers, isDemoUser);
    const unsubGrp = subscribeDefaultMetadata<DimGroup>('dim_group', DEFAULT_GROUPS, setGroups, isDemoUser);
    const unsubCmp = subscribeDefaultMetadata<DimCompany>('dim_company', DEFAULT_COMPANIES, setCompanies, isDemoUser);
    const unsubClr = subscribeDefaultMetadata<DimColor>('dim_color', DEFAULT_COLORS, setColors, isDemoUser);
    const unsubTyp = subscribeDefaultMetadata<DimType>('dim_type', DEFAULT_TYPES, setTypes, isDemoUser);
    const unsubCnt = subscribeDefaultMetadata<DimCountry>('dim_country', DEFAULT_COUNTRIES, setCountries, isDemoUser);
    const unsubLoc = subscribeDefaultMetadata<DimLocation>('dim_location', [
      { location: 'Bangkok' },
      { location: 'Tokyo' },
      { location: 'Seoul' },
      { location: 'Taipei' }
    ], setLocations, isDemoUser);

    setLoading(false);

    return () => {
      unsubMem();
      unsubGrp();
      unsubCmp();
      unsubClr();
      unsubTyp();
      unsubCnt();
      unsubLoc();
    };
  }, [isDemoUser]);

  // Group lookup map for auto-populating country & company when group is selected
  const groupLookup = useMemo(() => {
    const map: Record<string, { company: string; country: string }> = {};
    groups.forEach((g) => {
      map[g.group] = { company: g.company, country: g.country };
    });
    return map;
  }, [groups]);

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

  // Init temporary member draft row
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

  const handleSaveTempMember = async () => {
    if (!tempMember) return;
    if (!tempMember.member_name.trim()) {
      alert("Please enter a Member Name.");
      return;
    }
    try {
      await addDefaultMetadataDoc('dim_member', tempMember as unknown as Record<string, unknown>, isDemoUser);
      setTempMember(null);
    } catch (err) {
      alert("Error saving default member: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Generic Save Handlers for Top-Row Drafts
  const handleSaveTempGroup = async () => {
    if (!tempGroup || !tempGroup.group.trim()) return;
    try {
      await addDefaultMetadataDoc('dim_group', tempGroup, isDemoUser);
      setTempGroup(null);
    } catch (err) {
      alert("Error saving group: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveTempCompany = async () => {
    if (!tempCompany || !tempCompany.company.trim()) return;
    try {
      await addDefaultMetadataDoc('dim_company', tempCompany, isDemoUser);
      setTempCompany(null);
    } catch (err) {
      alert("Error saving company: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveTempColor = async () => {
    if (!tempColor || !tempColor.color.trim()) return;
    try {
      await addDefaultMetadataDoc('dim_color', tempColor, isDemoUser);
      setTempColor(null);
    } catch (err) {
      alert("Error saving color: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveTempType = async () => {
    if (!tempType || !tempType.type.trim()) return;
    try {
      await addDefaultMetadataDoc('dim_type', tempType, isDemoUser);
      setTempType(null);
    } catch (err) {
      alert("Error saving type: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveTempCountry = async () => {
    if (!tempCountry || !tempCountry.country.trim()) return;
    try {
      await addDefaultMetadataDoc('dim_country', tempCountry, isDemoUser);
      setTempCountry(null);
    } catch (err) {
      alert("Error saving country: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveTempLocation = async () => {
    if (!tempLocation || !tempLocation.location.trim()) return;
    try {
      await addDefaultMetadataDoc('dim_location', tempLocation, isDemoUser);
      setTempLocation(null);
    } catch (err) {
      alert("Error saving location: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const { table, data } = editingItem;
    const id = data.id as string;
    try {
      await updateDefaultMetadataDoc(table, id, data, isDemoUser);
      setEditingItem(null);
    } catch (err) {
      alert("Error updating default record: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal) return;
    const { table, id, displayValue } = deleteConfirmModal;
    try {
      await deleteDefaultMetadataDoc(table, id, displayValue, isDemoUser);
      setDeleteConfirmModal(null);
    } catch (err) {
      alert("Error deleting default record: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAddNewItem = async (table: string, defaultData: Record<string, unknown>) => {
    await addDefaultMetadataDoc(table, defaultData, isDemoUser);
  };

  // Enforce Super Admin Authorization Check
  if (!user && !isDemoUser) return <LoginPrompt />;
  if (!isSuperAdmin && !isDemoUser) {
    return (
      <div className="access-restricted-card card">
        <ShieldAlert size={48} className="restricted-icon" />
        <h2>Super Admin Authorization Required</h2>
        <p>Back Office metadata settings are restricted to certified super administrators (<strong>pavin.ss2@gmail.com</strong>).</p>
      </div>
    );
  }

  if (loading) return <CircularSpinner />;

  return (
    <div className="backoffice-page">
      <div className="backoffice-banner card">
        <div className="banner-left">
          <h2>👑 Back Office — Global Default Settings</h2>
          <p>Manage system-wide default choices for all application users.</p>
        </div>
        <div className="badge-pill gold">Super Admin Workspace</div>
      </div>

      {/* Tabs Navigation */}
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
        <button className={`tab-btn ${activeTab === 'colors' ? 'active' : ''}`} onClick={() => setActiveTab('colors')}>
          <Palette size={16} /> Colors ({colors.length})
        </button>
        <button className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`} onClick={() => setActiveTab('types')}>
          <Tag size={16} /> Types ({types.length})
        </button>
        <button className={`tab-btn ${activeTab === 'countries' ? 'active' : ''}`} onClick={() => setActiveTab('countries')}>
          <Flag size={16} /> Countries ({countries.length})
        </button>
        <button className={`tab-btn ${activeTab === 'locations' ? 'active' : ''}`} onClick={() => setActiveTab('locations')}>
          <MapPin size={16} /> Locations ({locations.length})
        </button>
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          <Shield size={16} /> System Logs ({logs.length})
        </button>
      </div>

      {/* Content Card */}
      <div className="table-card card">
        {/* DEFAULT MEMBERS TAB */}
        {activeTab === 'members' && (
          <div>
            <div className="tab-header">
              <h2>default_dim_member</h2>
              <button className="btn btn-primary btn-sm" onClick={handleStartAddMember} disabled={Boolean(tempMember)}>
                <Plus size={14} /> Add Default Member
              </button>
            </div>

            <div className="table-wrapper">
              <table className="dim-table member-table">
                <thead>
                  <tr>
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
                      Status {memberSortKey === 'is_active' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th>X Profile</th>
                    <th className="sortable-th" onClick={() => handleSortMembers('date_added')}>
                      Date Added {memberSortKey === 'date_added' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempMember && (
                    <tr className="temp-row">
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
                            placeholder="Image URL..." 
                            value={tempMember.member_image} 
                            onChange={(e) => setTempMember({ ...tempMember, member_image: e.target.value })}
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
                          onChange={(e) => setTempMember({ ...tempMember, color: e.target.value })}
                        >
                          {colors.map((c) => (
                            <option key={c.id} value={c.color}>{c.color}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select 
                          className="table-select"
                          value={tempMember.group}
                          onChange={(e) => {
                            const selectedGrp = e.target.value;
                            const mapped = groupLookup[selectedGrp] || { company: 'Individual', country: '🇹🇭 TH' };
                            setTempMember({
                              ...tempMember,
                              group: selectedGrp,
                              company: mapped.company,
                              country: mapped.country,
                            });
                          }}
                        >
                          <option value="">-- Select Group --</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.group}>{g.group}</option>
                          ))}
                        </select>
                      </td>
                      <td><span className="locked-cell">{tempMember.country}</span></td>
                      <td><span className="locked-cell">{tempMember.company}</span></td>
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
                          value={tempMember.is_active ? 'true' : 'false'}
                          onChange={(e) => setTempMember({ ...tempMember, is_active: e.target.value === 'true' })}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input"
                          placeholder="@username"
                          value={tempMember.x_profile} 
                          onChange={(e) => setTempMember({ ...tempMember, x_profile: e.target.value })}
                        />
                      </td>
                      <td><span className="date-added-cell">{tempMember.date_added}</span></td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-sm icon-only" onClick={handleSaveTempMember} title="Save Default Member">
                            <Save size={14} />
                          </button>
                          <button className="btn btn-secondary btn-sm icon-only" onClick={() => setTempMember(null)} title="Cancel">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {sortedMembers.map((m) => {
                    const colorHex = colors.find(c => c.color === m.color)?.color_code;
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MemberAvatar src={m.member_image} name={m.member_name} size={28} colorHex={colorHex} />
                          </div>
                        </td>
                        <td className="bold">{m.member_name}</td>
                        <td>
                          <span className="badge-color" style={{ borderLeftColor: colorHex || '#fff' }}>
                            {m.color}
                          </span>
                        </td>
                        <td>{m.group || '-'}</td>
                        <td>{m.country || '-'}</td>
                        <td>{m.company || '-'}</td>
                        <td className="mono">{m.start_date || '-'}</td>
                        <td className="mono">{m.end_date || '-'}</td>
                        <td>
                          <span className={`status-tag ${m.is_active ? 'active' : 'inactive'}`}>
                            {m.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{m.x_profile || '-'}</td>
                        <td className="mono">{m.date_added || '-'}</td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_member', data: { ...m } })}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn-icon danger" onClick={() => setDeleteConfirmModal({ table: 'dim_member', id: m.id, displayValue: getItemValueString(m as unknown as Record<string, unknown>) })}>
                              <Trash2 size={14} />
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

        {/* DEFAULT GROUPS TAB */}
        {activeTab === 'groups' && (
          <div>
            <div className="tab-header">
              <h2>default_dim_group</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setTempGroup({ group: '', country: '🇹🇭 TH', company: 'Individual' })} disabled={Boolean(tempGroup)}>
                <Plus size={14} /> Add Default Group
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Country</th>
                    <th>Company</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempGroup && (
                    <tr className="temp-row">
                      <td>
                        <input 
                          type="text" 
                          className="table-input bold" 
                          placeholder="Group Name *" 
                          autoFocus
                          value={tempGroup.group} 
                          onChange={(e) => setTempGroup({ ...tempGroup, group: e.target.value })}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input" 
                          placeholder="Country (🇹🇭 TH)" 
                          value={tempGroup.country} 
                          onChange={(e) => setTempGroup({ ...tempGroup, country: e.target.value })}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input" 
                          placeholder="Company" 
                          value={tempGroup.company} 
                          onChange={(e) => setTempGroup({ ...tempGroup, company: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveTempGroup}><Save size={13} /> Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setTempGroup(null)}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {groups.map((g) => (
                    <tr key={g.id}>
                      <td className="bold">{g.group}</td>
                      <td>{g.country}</td>
                      <td>{g.company}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_group', data: { ...g } })}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon danger" onClick={() => setDeleteConfirmModal({ table: 'dim_group', id: g.id, displayValue: getItemValueString(g as unknown as Record<string, unknown>) })}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEFAULT COMPANIES TAB */}
        {activeTab === 'companies' && (
          <div>
            <div className="tab-header">
              <h2>default_dim_company</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setTempCompany({ company: '' })} disabled={Boolean(tempCompany)}>
                <Plus size={14} /> Add Default Company
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempCompany && (
                    <tr className="temp-row">
                      <td>
                        <input 
                          type="text" 
                          className="table-input bold" 
                          placeholder="Company Name *" 
                          autoFocus
                          value={tempCompany.company} 
                          onChange={(e) => setTempCompany({ company: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveTempCompany}><Save size={13} /> Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setTempCompany(null)}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td className="bold">{c.company}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_company', data: { ...c } })}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon danger" onClick={() => setDeleteConfirmModal({ table: 'dim_company', id: c.id, displayValue: getItemValueString(c as unknown as Record<string, unknown>) })}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEFAULT COLORS TAB */}
        {activeTab === 'colors' && (
          <div>
            <div className="tab-header">
              <h2>default_dim_color</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setTempColor({ color: '', color_code: '#ffffff' })} disabled={Boolean(tempColor)}>
                <Plus size={14} /> Add Default Color
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Color Name</th>
                    <th>Color Preview</th>
                    <th>Hex Code</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempColor && (
                    <tr className="temp-row">
                      <td>
                        <input 
                          type="text" 
                          className="table-input bold" 
                          placeholder="Color Name *" 
                          autoFocus
                          value={tempColor.color} 
                          onChange={(e) => setTempColor({ ...tempColor, color: e.target.value })}
                        />
                      </td>
                      <td>
                        <span className="color-swatch" style={{ backgroundColor: tempColor.color_code }} />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input mono" 
                          placeholder="#ffffff" 
                          value={tempColor.color_code} 
                          onChange={(e) => setTempColor({ ...tempColor, color_code: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveTempColor}><Save size={13} /> Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setTempColor(null)}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {colors.map((c) => (
                    <tr key={c.id}>
                      <td className="bold">{c.color}</td>
                      <td>
                        <span className="color-swatch" style={{ backgroundColor: c.color_code }} />
                      </td>
                      <td className="mono">{c.color_code}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_color', data: { ...c } })}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon danger" onClick={() => setDeleteConfirmModal({ table: 'dim_color', id: c.id, displayValue: getItemValueString(c as unknown as Record<string, unknown>) })}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEFAULT TYPES TAB */}
        {activeTab === 'types' && (
          <div>
            <div className="tab-header">
              <h2>default_dim_type</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setTempType({ type: '' })} disabled={Boolean(tempType)}>
                <Plus size={14} /> Add Default Type
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempType && (
                    <tr className="temp-row">
                      <td>
                        <input 
                          type="text" 
                          className="table-input bold" 
                          placeholder="Type Name *" 
                          autoFocus
                          value={tempType.type} 
                          onChange={(e) => setTempType({ type: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveTempType}><Save size={13} /> Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setTempType(null)}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {types.map((t) => (
                    <tr key={t.id}>
                      <td className="bold">{t.type}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_type', data: { ...t } })}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon danger" onClick={() => setDeleteConfirmModal({ table: 'dim_type', id: t.id, displayValue: getItemValueString(t as unknown as Record<string, unknown>) })}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEFAULT COUNTRIES TAB */}
        {activeTab === 'countries' && (
          <div>
            <div className="tab-header">
              <h2>default_dim_country</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setTempCountry({ country: 'JP', displayed_country: '🇯🇵 JP' })} disabled={Boolean(tempCountry)}>
                <Plus size={14} /> Add Default Country
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Country Display</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempCountry && (
                    <tr className="temp-row">
                      <td>
                        <input 
                          type="text" 
                          className="table-input bold" 
                          placeholder="Country Display (🇯🇵 JP) *" 
                          autoFocus
                          value={tempCountry.displayed_country} 
                          onChange={(e) => setTempCountry({ country: e.target.value.replace(/[^A-Za-z]/g, ''), displayed_country: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveTempCountry}><Save size={13} /> Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setTempCountry(null)}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {countries.map((c) => (
                    <tr key={c.id}>
                      <td className="bold">{c.displayed_country || c.country}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_country', data: { ...c } })}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon danger" onClick={() => setDeleteConfirmModal({ table: 'dim_country', id: c.id, displayValue: getItemValueString(c as unknown as Record<string, unknown>) })}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* DEFAULT LOCATIONS TAB */}
        {activeTab === 'locations' && (
          <div>
            <div className="tab-header">
              <h2>default_dim_location</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setTempLocation({ location: '' })} disabled={Boolean(tempLocation)}>
                <Plus size={14} /> Add Default Location
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Location Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempLocation && (
                    <tr className="temp-row">
                      <td>
                        <input 
                          type="text" 
                          className="table-input bold" 
                          placeholder="Location Name *" 
                          autoFocus
                          value={tempLocation.location} 
                          onChange={(e) => setTempLocation({ location: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveTempLocation}><Save size={13} /> Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setTempLocation(null)}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {locations.map((loc) => (
                    <tr key={loc.id}>
                      <td className="bold">{loc.location}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_location', data: { ...loc } })}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon danger" onClick={() => setDeleteConfirmModal({ table: 'dim_location', id: loc.id, displayValue: getItemValueString(loc as unknown as Record<string, unknown>) })}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SYSTEM LOGS TAB */}
        {activeTab === 'logs' && (
          <div>
            <div className="tab-header">
              <h2>fact_admin_log</h2>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="mono">{new Date(log.timestamp).toLocaleString()}</td>
                      <td><span className="badge-pill dark">{log.actionType}</span></td>
                      <td>{log.actionDetail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="modal-backdrop" onClick={() => setEditingItem(null)}>
          <div className="modal-dialog card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Default Record ({editingItem.table})</h3>
              <button className="btn-close-modal" onClick={() => setEditingItem(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-form">
              {Object.keys(editingItem.data)
                .filter(k => k !== 'id' && k !== 'userId' && k !== 'createdAt' && k !== 'updatedAt')
                .map(key => (
                  <div key={key} className="form-group">
                    <label>{key}</label>
                    {typeof editingItem.data[key] === 'boolean' ? (
                      <select
                        className="input-control"
                        value={editingItem.data[key] ? 'true' : 'false'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          data: { ...editingItem.data, [key]: e.target.value === 'true' }
                        })}
                      >
                        <option value="true">Active (True)</option>
                        <option value="false">Inactive (False)</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="input-control"
                        value={String(editingItem.data[key] ?? '')}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          data: { ...editingItem.data, [key]: e.target.value }
                        })}
                      />
                    )}
                  </div>
                ))}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Save size={14} /> Save Default Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmModal(null)}>
          <div className="modal-dialog card modal-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-danger)' }}>⚠️ Confirm Default Record Delete</h3>
              <button className="btn-close-modal" onClick={() => setDeleteConfirmModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this global default record?</p>
              <div className="delete-info-box">
                <div><strong>Table:</strong> {deleteConfirmModal.table}</div>
                <div><strong>ID:</strong> {deleteConfirmModal.id}</div>
                <div><strong>Value:</strong> {deleteConfirmModal.displayValue}</div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirmModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmDelete}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .backoffice-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .backoffice-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-left: 4px solid var(--accent-primary);
        }

        .banner-left h2 {
          margin: 0 0 4px 0;
          font-size: 1.3rem;
          color: var(--text-main);
        }

        .banner-left p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .access-restricted-card {
          padding: 60px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .restricted-icon {
          color: var(--color-danger);
        }

        .tabs-bar {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 600;
          white-space: nowrap;
          transition: all var(--transition-fast);

          &:hover {
            color: var(--text-main);
            border-color: var(--border-strong);
          }

          &.active {
            background-color: rgba(212, 168, 75, 0.15);
            color: var(--accent-primary);
            border-color: var(--accent-primary);
          }
        }

        .table-card {
          padding: 20px;
        }

        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;

          h2 {
            margin: 0;
            font-size: 1.1rem;
            color: var(--text-main);
          }
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .dim-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;

          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--border-subtle);
          }

          th {
            color: var(--text-muted);
            font-weight: 600;
            background-color: var(--bg-surface-2);
          }

          tr:hover td {
            background-color: rgba(255,255,255,0.02);
          }
        }

        .bold { font-weight: 700; color: var(--text-main); }
        .mono { font-family: monospace; font-size: 0.82rem; }

        .sortable-th {
          cursor: pointer;
          user-select: none;
          &:hover { color: var(--accent-primary); }
        }

        .temp-row td {
          background-color: rgba(212, 168, 75, 0.08) !important;
          border-bottom: 2px solid var(--accent-primary);
        }

        .table-input {
          width: 100%;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 6px 8px;
          color: var(--text-main);
          font-size: 0.85rem;
          outline: none;
          &:focus { border-color: var(--accent-primary); }
        }

        .table-select {
          width: 100%;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 6px 8px;
          color: var(--text-main);
          font-size: 0.85rem;
        }

        .locked-cell {
          color: var(--text-muted);
          font-style: italic;
          font-size: 0.82rem;
        }

        .date-added-cell {
          color: var(--text-muted);
          font-size: 0.82rem;
        }

        .badge-pill {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .badge-pill.gold {
          background-color: rgba(212, 168, 75, 0.2);
          color: var(--accent-primary);
          border: 1px solid var(--accent-primary);
        }

        .badge-pill.dark {
          background-color: var(--bg-surface-2);
          color: var(--text-main);
          border: 1px solid var(--border-subtle);
        }

        .badge-color {
          border-left-width: 4px;
          border-left-style: solid;
          padding-left: 8px;
        }

        .color-swatch {
          display: inline-block;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .status-tag {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 700;
          &.active { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
          &.inactive { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
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
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          &:hover { color: var(--text-main); background: var(--bg-surface-2); }
          &.danger:hover { color: var(--color-danger); }
        }

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
          max-width: 500px;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-strong);
          border-radius: 12px;
          padding: 24px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
          h3 { margin: 0; font-size: 1.1rem; color: var(--text-main); }
        }

        .btn-close-modal {
          background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;
        }

        .modal-form { display: flex; flex-direction: column; gap: 16px; }

        .form-group {
          display: flex; flex-direction: column; gap: 6px;
          label { font-size: 0.82rem; font-weight: 600; color: var(--text-muted); }
        }

        .input-control {
          background-color: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-main);
          font-size: 0.9rem;
          outline: none;
          &:focus { border-color: var(--accent-primary); }
        }

        .modal-actions {
          display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;
        }

        .delete-info-box {
          background-color: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          padding: 12px;
          border-radius: 8px;
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.88rem;
        }

        .btn-danger {
          background-color: var(--color-danger);
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          &:hover { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
