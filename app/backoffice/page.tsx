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
  getItemValueString,
  getAllowSubscribeState,
  isAllowSubscribeAllowed,
  type AllowSubscribeStatus
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
  Lock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { formatBrowserTimestamp } from '@/lib/imageUtils';

type MemberSortKey = 'date_added' | 'member_name' | 'color' | 'group' | 'country' | 'company' | 'is_allowed_import' | 'member_image' | 'x_profile';
type GroupSortKey = 'group' | 'country' | 'company' | 'is_allowed_import';
type CompanySortKey = 'company';

interface TempMemberRow {
  member_name: string;
  color: string;
  group: string;
  country: string;
  company: string;
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

  // Filters state for default_dim_member and default_dim_group
  const [memberCompanyFilter, setMemberCompanyFilter] = useState<string>('');
  const [memberGroupFilter, setMemberGroupFilter] = useState<string>('');
  const [memberCountryFilter, setMemberCountryFilter] = useState<string>('');
  const [memberAllowSubscribeFilter, setMemberAllowSubscribeFilter] = useState<string>('all');
  const [groupCompanyFilter, setGroupCompanyFilter] = useState<string>('');
  const [groupCountryFilter, setGroupCountryFilter] = useState<string>('');
  const [groupAllowSubscribeFilter, setGroupAllowSubscribeFilter] = useState<string>('all');

  // Stable in-place row ordering refs (prevents rows from bouncing when badge is toggled)
  const memberFrozenOrderRef = React.useRef<string[]>([]);
  const groupFrozenOrderRef = React.useRef<string[]>([]);

  // Multiselect state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sorting state for dim_member, dim_group, dim_company
  const [memberSortKey, setMemberSortKey] = useState<MemberSortKey>('date_added');
  const [memberSortAsc, setMemberSortAsc] = useState<boolean>(false);

  const [groupSortKey, setGroupSortKey] = useState<GroupSortKey>('group');
  const [groupSortAsc, setGroupSortAsc] = useState<boolean>(true);

  const [companySortKey, setCompanySortKey] = useState<CompanySortKey>('company');
  const [companySortAsc, setCompanySortAsc] = useState<boolean>(true);

  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Reset selected items & clear frozen sort order when active tab or filters change
  useEffect(() => {
    setSelectedIds(new Set());
    memberFrozenOrderRef.current = [];
    groupFrozenOrderRef.current = [];
  }, [activeTab, memberCompanyFilter, memberGroupFilter, memberCountryFilter, memberAllowSubscribeFilter, groupCompanyFilter, groupCountryFilter, groupAllowSubscribeFilter]);

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

  // Render 3-state Allow Subscribe badge helper
  const renderAllowSubscribeBadge = (item: any, table: string) => {
    const state = getAllowSubscribeState(item);
    let label = '✓ Enabled';
    let className = 'badge-toggle allowed';
    let title = 'Click to cycle: Enabled -> Enabled-Admin -> Disabled';

    if (state === 'Enabled-Admin') {
      label = '🛡️ Enabled-Admin';
      className = 'badge-toggle admin-only';
      title = 'Web Admin only. Click to cycle: Enabled-Admin -> Disabled -> Enabled';
    } else if (state === 'Disabled') {
      label = '✕ Disabled';
      className = 'badge-toggle disallowed';
      title = 'Disabled. Click to cycle: Disabled -> Enabled -> Enabled-Admin';
    }

    return (
      <button
        type="button"
        className={className}
        onClick={() => handleCycleSingleAllowSubscribe(table, item)}
        title={title}
      >
        {label}
      </button>
    );
  };

  // Handle column sorting
  const handleSortMembers = (key: MemberSortKey) => {
    // Explicit user click on column header clears frozen order so re-sort takes effect
    memberFrozenOrderRef.current = [];
    if (memberSortKey === key) {
      setMemberSortAsc(!memberSortAsc);
    } else {
      setMemberSortKey(key);
      setMemberSortAsc(key === 'date_added' ? false : true);
    }
  };

  const sortedMembers = useMemo(() => {
    // If we have a frozen order (from user toggling status in-place), preserve that exact order
    const frozen = memberFrozenOrderRef.current;
    if (frozen && frozen.length > 0) {
      const orderMap = new Map<string, number>();
      frozen.forEach((id, idx) => orderMap.set(id, idx));
      return [...members].sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
        return idxA - idxB;
      });
    }

    const sorted = [...members].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (memberSortKey === 'is_allowed_import') {
        // Sort order: Enabled(2) > Enabled-Admin(1) > Disabled(0)
        const stateOrder: Record<string, number> = { 'Enabled': 2, 'Enabled-Admin': 1, 'Disabled': 0 };
        valA = stateOrder[getAllowSubscribeState(a)] ?? 2;
        valB = stateOrder[getAllowSubscribeState(b)] ?? 2;
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

    return sorted;
  }, [members, memberSortKey, memberSortAsc]);

  // Filtered members list based on company, group, country, and allow_subscribe filter
  const filteredMembers = useMemo(() => {
    return sortedMembers.filter((m) => {
      if (memberCompanyFilter && m.company !== memberCompanyFilter) return false;
      if (memberGroupFilter && m.group !== memberGroupFilter) return false;
      if (memberCountryFilter && m.country !== memberCountryFilter) return false;
      if (memberAllowSubscribeFilter && memberAllowSubscribeFilter !== 'all') {
        if (getAllowSubscribeState(m) !== memberAllowSubscribeFilter) return false;
      }
      return true;
    });
  }, [sortedMembers, memberCompanyFilter, memberGroupFilter, memberCountryFilter, memberAllowSubscribeFilter]);

  const handleSortGroups = (key: GroupSortKey) => {
    // Explicit user click on column header clears frozen order so re-sort takes effect
    groupFrozenOrderRef.current = [];
    if (groupSortKey === key) {
      setGroupSortAsc(!groupSortAsc);
    } else {
      setGroupSortKey(key);
      setGroupSortAsc(true);
    }
  };

  const sortedGroups = useMemo(() => {
    // If we have a frozen order (from user toggling status in-place), preserve that exact order
    const frozen = groupFrozenOrderRef.current;
    if (frozen && frozen.length > 0) {
      const orderMap = new Map<string, number>();
      frozen.forEach((id, idx) => orderMap.set(id, idx));
      return [...groups].sort((a, b) => {
        const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
        const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
        return idxA - idxB;
      });
    }

    const sorted = [...groups].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (groupSortKey === 'is_allowed_import') {
        const stateOrder: Record<string, number> = { 'Enabled': 2, 'Enabled-Admin': 1, 'Disabled': 0 };
        valA = stateOrder[getAllowSubscribeState(a)] ?? 2;
        valB = stateOrder[getAllowSubscribeState(b)] ?? 2;
      } else {
        valA = String(a[groupSortKey] ?? '').toLowerCase();
        valB = String(b[groupSortKey] ?? '').toLowerCase();
      }

      if (valA < valB) return groupSortAsc ? -1 : 1;
      if (valA > valB) return groupSortAsc ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [groups, groupSortKey, groupSortAsc]);

  // Filtered groups list based on company, country, and allow_subscribe filter
  const filteredGroups = useMemo(() => {
    return sortedGroups.filter((g) => {
      if (groupCompanyFilter && g.company !== groupCompanyFilter) return false;
      if (groupCountryFilter && g.country !== groupCountryFilter) return false;
      if (groupAllowSubscribeFilter && groupAllowSubscribeFilter !== 'all') {
        if (getAllowSubscribeState(g) !== groupAllowSubscribeFilter) return false;
      }
      return true;
    });
  }, [sortedGroups, groupCompanyFilter, groupCountryFilter, groupAllowSubscribeFilter]);

  const handleSortCompanies = (key: CompanySortKey) => {
    if (companySortKey === key) {
      setCompanySortAsc(!companySortAsc);
    } else {
      setCompanySortKey(key);
      setCompanySortAsc(true);
    }
  };

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      const valA = String(a[companySortKey] ?? '').toLowerCase();
      const valB = String(b[companySortKey] ?? '').toLowerCase();

      if (valA < valB) return companySortAsc ? -1 : 1;
      if (valA > valB) return companySortAsc ? 1 : -1;
      return 0;
    });
  }, [companies, companySortKey, companySortAsc]);

  // Resolve active dataset and table name for multiselect batch operations
  const activeItems = useMemo(() => {
    if (activeTab === 'members') return filteredMembers;
    if (activeTab === 'groups') return filteredGroups;
    if (activeTab === 'companies') return sortedCompanies;
    if (activeTab === 'colors') return colors;
    if (activeTab === 'types') return types;
    if (activeTab === 'countries') return countries;
    if (activeTab === 'locations') return locations;
    return [];
  }, [activeTab, filteredMembers, filteredGroups, sortedCompanies, colors, types, countries, locations]);

  const activeTableName = useMemo(() => {
    if (activeTab === 'members') return 'dim_member';
    if (activeTab === 'groups') return 'dim_group';
    if (activeTab === 'companies') return 'dim_company';
    if (activeTab === 'colors') return 'dim_color';
    if (activeTab === 'types') return 'dim_type';
    if (activeTab === 'countries') return 'dim_country';
    if (activeTab === 'locations') return 'dim_location';
    return '';
  }, [activeTab]);

  const isAllSelected = useMemo(() => {
    if (activeItems.length === 0) return false;
    return activeItems.every(item => selectedIds.has(item.id));
  }, [activeItems, selectedIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      activeItems.forEach(item => next.add(item.id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };




  const triggerGroupCascadeDisallow = async (grpNameRaw: string) => {
    const grpName = String(grpNameRaw || '').trim().toLowerCase();
    if (!grpName) return;

    const allowedRelatedMembers = members.filter(m => 
      String(m.group || '').trim().toLowerCase() === grpName &&
      getAllowSubscribeState(m) !== 'Disabled'
    );

    if (allowedRelatedMembers.length > 0) {
      if (confirm(`Do you also want to disable subscribe for all ${allowedRelatedMembers.length} related member(s) in group "${grpNameRaw}"?`)) {
        for (const m of allowedRelatedMembers) {
          await updateDefaultMetadataDoc('dim_member', m.id, { ...m, allow_subscribe: 'Disabled', is_allowed_import: false, allow_import: false }, isDemoUser);
        }
      }
    }
  };

  const handleBatchSetAllowSubscribe = async (status: AllowSubscribeStatus) => {
    if (!activeTableName || selectedIds.size === 0) return;
    const items = activeItems.filter(item => selectedIds.has(item.id));
    try {
      for (const item of items) {
        const legacyAllowed = status !== 'Disabled';
        await updateDefaultMetadataDoc(activeTableName, item.id, { ...item, allow_subscribe: status, is_allowed_import: legacyAllowed, allow_import: legacyAllowed }, isDemoUser);
      }

      if (status === 'Disabled') {
        if (activeTab === 'groups') {
          for (const grpItem of items) {
            await triggerGroupCascadeDisallow(String((grpItem as any).group || ''));
          }
        }
      }
      setSelectedIds(new Set());
    } catch (err) {
      alert("Error updating subscribe permission: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleBatchDelete = async () => {
    if (!activeTableName || selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected item(s) from ${activeTableName}?`)) return;
    const items = activeItems.filter(item => selectedIds.has(item.id));
    try {
      for (const item of items) {
        const displayVal = getItemValueString(item as unknown as Record<string, unknown>);
        await deleteDefaultMetadataDoc(activeTableName, item.id, displayVal, isDemoUser);
      }
      setSelectedIds(new Set());
    } catch (err) {
      alert("Error deleting items: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // 3-state cycling: Enabled → Enabled-Admin → Disabled → Enabled
  const handleCycleSingleAllowSubscribe = async (table: string, item: any) => {
    // Freeze current displayed order so row stays exactly in place without bouncing
    if (table === 'dim_member') {
      if (memberFrozenOrderRef.current.length === 0) {
        memberFrozenOrderRef.current = sortedMembers.map(m => m.id);
      }
    } else if (table === 'dim_group') {
      if (groupFrozenOrderRef.current.length === 0) {
        groupFrozenOrderRef.current = sortedGroups.map(g => g.id);
      }
    }

    const currentState = getAllowSubscribeState(item);
    let nextState: AllowSubscribeStatus;
    if (currentState === 'Enabled') nextState = 'Enabled-Admin';
    else if (currentState === 'Enabled-Admin') nextState = 'Disabled';
    else nextState = 'Enabled';

    const legacyAllowed = nextState !== 'Disabled';
    try {
      await updateDefaultMetadataDoc(table, item.id, { ...item, allow_subscribe: nextState, is_allowed_import: legacyAllowed, allow_import: legacyAllowed }, isDemoUser);

      if (nextState === 'Disabled') {
        if (table === 'dim_group') {
          await triggerGroupCascadeDisallow(item.group);
        }
      }
    } catch (err) {
      alert("Error updating subscribe permission: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Init temporary member draft row
  const handleStartAddMember = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setTempMember({
      member_name: '',
      color: 'White',
      group: '',
      country: '🇹🇭 TH',
      company: 'Individual',
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
    const subscribeState = getAllowSubscribeState(data);
    try {
      await updateDefaultMetadataDoc(table, id, data, isDemoUser);
      setEditingItem(null);

      if (subscribeState === 'Disabled') {
        if (table === 'dim_group') {
          await triggerGroupCascadeDisallow(String(data.group || ''));
        }
      }
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
        {/* Batch Action Bar */}
        {selectedIds.size > 0 && activeTab !== 'logs' && (
          <div className="batch-action-bar">
            <div className="batch-info">
              <span className="badge-pill primary" style={{ fontWeight: 600 }}>{selectedIds.size} item(s) selected</span>
            </div>
            <div className="batch-buttons">
              {(activeTab === 'members' || activeTab === 'groups') && (
                <>
                  <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleBatchSetAllowSubscribe('Enabled')}>
                    <CheckCircle size={13} /> Enabled
                  </button>
                  <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleBatchSetAllowSubscribe('Enabled-Admin')} title="Only visible to Web Admins">
                    🛡️ Enabled-Admin
                  </button>
                  <button type="button" className="btn btn-secondary btn-xs" onClick={() => handleBatchSetAllowSubscribe('Disabled')}>
                    <XCircle size={13} /> Disabled
                  </button>
                </>
              )}
              <button type="button" className="btn btn-danger btn-xs" onClick={handleBatchDelete}>
                <Trash2 size={13} /> Delete Selected ({selectedIds.size})
              </button>
              <button type="button" className="btn btn-secondary btn-xs icon-only" onClick={() => setSelectedIds(new Set())} title="Clear selection">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* DEFAULT MEMBERS TAB */}
        {activeTab === 'members' && (
          <div>
            <div className="tab-header">
              <h2>default_dim_member</h2>
              <div className="tab-header-row">
                <div className="filter-select-wrapper">
                  <select
                    className="filter-select"
                    value={memberCompanyFilter}
                    onChange={(e) => {
                      setMemberCompanyFilter(e.target.value);
                      setMemberGroupFilter('');
                    }}
                  >
                    <option value="">All Companies ({companies.length})</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.company}>{c.company}</option>
                    ))}
                  </select>

                  <select
                    className="filter-select"
                    value={memberGroupFilter}
                    onChange={(e) => setMemberGroupFilter(e.target.value)}
                  >
                    <option value="">All Groups ({groups.length})</option>
                    {groups
                      .filter(g => (!memberCompanyFilter || g.company === memberCompanyFilter) && (!memberCountryFilter || g.country === memberCountryFilter))
                      .map(g => (
                        <option key={g.id} value={g.group}>{g.group}</option>
                      ))}
                  </select>

                  <select
                    className="filter-select"
                    value={memberCountryFilter}
                    onChange={(e) => setMemberCountryFilter(e.target.value)}
                  >
                    <option value="">All Countries</option>
                    {Array.from(new Set(members.map(m => m.country).filter(Boolean))).sort().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    className="filter-select"
                    value={memberAllowSubscribeFilter}
                    onChange={(e) => setMemberAllowSubscribeFilter(e.target.value)}
                  >
                    <option value="all">All Allow Subscribe</option>
                    <option value="Enabled">✓ Enabled</option>
                    <option value="Enabled-Admin">🛡️ Enabled-Admin</option>
                    <option value="Disabled">✕ Disabled</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleStartAddMember} disabled={Boolean(tempMember)}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="dim-table member-table">
                <thead>
                  <tr>
                    <th style={{ width: '38px', textAlign: 'center' }}>
                      <input type="checkbox" checked={isAllSelected} onChange={handleToggleSelectAll} />
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('member_image')}>
                      Avatar {memberSortKey === 'member_image' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
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
                    <th className="sortable-th" onClick={() => handleSortMembers('is_allowed_import')}>
                      Allow Subscribe {memberSortKey === 'is_allowed_import' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('x_profile')}>
                      X Profile {memberSortKey === 'x_profile' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortMembers('date_added')}>
                      Date Added {memberSortKey === 'date_added' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th>Date Modified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempMember && !isMobile && (
                    <tr className="temp-row">
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ minWidth: '160px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MemberAvatar 
                            src={tempMember.member_image} 
                            name={tempMember.member_name || 'New'} 
                            size={28} 
                            colorHex={colors.find(c => c.color === tempMember.color)?.color_code} 
                          />
                          <input 
                            type="text" 
                            className="table-input" 
                            placeholder="Image URL" 
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
                          {(colors.length > 0 ? colors : DEFAULT_COLORS).map((c: any) => (
                            <option key={c.id || c.color} value={c.color}>{c.color}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select 
                          className="table-select" 
                          value={tempMember.group} 
                          onChange={(e) => {
                            const newGrp = e.target.value;
                            const mapped = groupLookup[newGrp];
                            setTempMember({
                              ...tempMember,
                              group: newGrp,
                              country: mapped?.country || tempMember.country,
                              company: mapped?.company || tempMember.company,
                            });
                          }}
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.group}>{g.group}</option>
                          ))}
                        </select>
                      </td>
                      <td className="locked-cell">{tempMember.country}</td>
                      <td className="locked-cell">{tempMember.company}</td>
                      <td>
                        <span className="badge-toggle allowed" style={{ cursor: 'default' }}>✓ Enabled</span>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input" 
                          placeholder="@handle or URL" 
                          value={tempMember.x_profile} 
                          onChange={(e) => setTempMember({ ...tempMember, x_profile: e.target.value })}
                        />
                      </td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveTempMember}><Save size={13} /> Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setTempMember(null)}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {filteredMembers.map((m) => {
                    const colorObj = colors.find(c => c.color === m.color);
                    const isSelected = selectedIds.has(m.id);

                    return (
                      <tr key={m.id} className={isSelected ? 'selected-row' : ''}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(m.id)} />
                        </td>
                        <td>
                          <MemberAvatar 
                            src={m.member_image} 
                            name={m.member_name} 
                            size={32} 
                            colorHex={colorObj?.color_code} 
                          />
                        </td>
                        <td className="bold">{m.member_name}</td>
                        <td>{m.color}</td>
                        <td>{m.group}</td>
                        <td>{m.country}</td>
                        <td>{m.company}</td>
                        <td>
                          {renderAllowSubscribeBadge(m, 'dim_member')}
                        </td>
                        <td>
                          {m.x_profile ? (
                            <a 
                              href={m.x_profile.startsWith('http') ? m.x_profile : `https://x.com/${m.x_profile.replace('@', '')}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="x-link"
                            >
                              Link
                            </a>
                          ) : '-'}
                        </td>
                        <td className="mono">{formatBrowserTimestamp(m.date_added, m.createdAt)}</td>
                        <td className="mono">{formatBrowserTimestamp(m.date_modified, m.updatedAt)}</td>
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
              <div className="tab-header-row">
                <div className="filter-select-wrapper">
                  <select
                    className="filter-select"
                    value={groupCompanyFilter}
                    onChange={(e) => setGroupCompanyFilter(e.target.value)}
                  >
                    <option value="">All Companies ({companies.length})</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.company}>{c.company}</option>
                    ))}
                  </select>
                  <select
                    className="filter-select"
                    value={groupCountryFilter}
                    onChange={(e) => setGroupCountryFilter(e.target.value)}
                  >
                    <option value="">All Countries</option>
                    {Array.from(new Set(groups.map(g => g.country).filter(Boolean))).sort().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="filter-select"
                    value={groupAllowSubscribeFilter}
                    onChange={(e) => setGroupAllowSubscribeFilter(e.target.value)}
                  >
                    <option value="all">All Allow Subscribe</option>
                    <option value="Enabled">✓ Enabled</option>
                    <option value="Enabled-Admin">🛡️ Enabled-Admin</option>
                    <option value="Disabled">✕ Disabled</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setTempGroup({ group: '', country: '🇹🇭 TH', company: 'Individual' })} disabled={Boolean(tempGroup)} style={{ marginLeft: 'auto' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th style={{ width: '38px', textAlign: 'center' }}>
                      <input type="checkbox" checked={isAllSelected} onChange={handleToggleSelectAll} />
                    </th>
                    <th className="sortable-th" onClick={() => handleSortGroups('group')}>
                      Group {groupSortKey === 'group' ? (groupSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortGroups('country')}>
                      Country {groupSortKey === 'country' ? (groupSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortGroups('company')}>
                      Company {groupSortKey === 'company' ? (groupSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortGroups('is_allowed_import')}>
                      Allow Subscribe {groupSortKey === 'is_allowed_import' ? (groupSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th>Date Added</th>
                    <th>Date Modified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempGroup && !isMobile && (
                    <tr className="temp-row">
                      <td style={{ textAlign: 'center' }}>-</td>
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
                        <select 
                          className="table-select" 
                          value={tempGroup.country} 
                          onChange={(e) => setTempGroup({ ...tempGroup, country: e.target.value })}
                        >
                          {(countries.length > 0 ? countries : DEFAULT_COUNTRIES).map((c: any) => {
                            const val = c.displayed_country || c.country;
                            return (
                              <option key={c.id || val} value={val}>{val}</option>
                            );
                          })}
                        </select>
                      </td>
                      <td>
                        <select 
                          className="table-select" 
                          value={tempGroup.company || 'Individual'} 
                          onChange={(e) => setTempGroup({ ...tempGroup, company: e.target.value })}
                        >
                          <option value="Individual">Individual</option>
                          {companies.filter(c => c.company !== 'Individual').map((c) => (
                            <option key={c.id} value={c.company}>{c.company}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className="badge-toggle allowed" style={{ cursor: 'default' }}>✓ Enabled</span>
                      </td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveTempGroup}><Save size={13} /> Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setTempGroup(null)}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {filteredGroups.map((g) => {
                    const isSelected = selectedIds.has(g.id);

                    return (
                      <tr key={g.id} className={isSelected ? 'selected-row' : ''}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(g.id)} />
                        </td>
                        <td className="bold">{g.group}</td>
                        <td>{g.country}</td>
                        <td>{g.company}</td>
                        <td>
                          {renderAllowSubscribeBadge(g, 'dim_group')}
                        </td>
                        <td className="mono">{formatBrowserTimestamp(g.date_added, g.createdAt)}</td>
                        <td className="mono">{formatBrowserTimestamp(g.date_modified, g.updatedAt)}</td>
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
                    );
                  })}
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
              <div className="tab-header-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setTempCompany({ company: '' })} disabled={Boolean(tempCompany)} style={{ marginLeft: 'auto' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th style={{ width: '38px', textAlign: 'center' }}>
                      <input type="checkbox" checked={isAllSelected} onChange={handleToggleSelectAll} />
                    </th>
                    <th className="sortable-th" onClick={() => handleSortCompanies('company')}>
                      Company {companySortKey === 'company' ? (companySortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th>Date Added</th>
                    <th>Date Modified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tempCompany && !isMobile && (
                    <tr className="temp-row">
                      <td style={{ textAlign: 'center' }}>-</td>
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
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-primary btn-xs" onClick={handleSaveTempCompany}><Save size={13} /> Save</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => setTempCompany(null)}><X size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {sortedCompanies.map((c) => {
                    const isSelected = selectedIds.has(c.id);

                    return (
                      <tr key={c.id} className={isSelected ? 'selected-row' : ''}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(c.id)} />
                        </td>
                        <td className="bold">{c.company}</td>
                        <td className="mono">{formatBrowserTimestamp(c.date_added, c.createdAt)}</td>
                        <td className="mono">{formatBrowserTimestamp(c.date_modified, c.updatedAt)}</td>
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
                    );
                  })}
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
              <div className="tab-header-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setTempColor({ color: '', color_code: '#ffffff' })} disabled={Boolean(tempColor)} style={{ marginLeft: 'auto' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Color Name</th>
                    <th>Color Preview</th>
                    <th>Hex Code & Picker</th>
                    <th>Date Added</th>
                    <th>Date Modified</th>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="color" 
                            className="color-picker-input" 
                            value={tempColor.color_code && tempColor.color_code.startsWith('#') ? tempColor.color_code : '#ffffff'} 
                            onChange={(e) => setTempColor({ ...tempColor, color_code: e.target.value })}
                          />
                          <input 
                            type="text" 
                            className="table-input mono" 
                            placeholder="#ffffff" 
                            value={tempColor.color_code} 
                            onChange={(e) => setTempColor({ ...tempColor, color_code: e.target.value })}
                          />
                        </div>
                      </td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
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
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="color" 
                            className="color-picker-input" 
                            value={c.color_code && c.color_code.startsWith('#') ? c.color_code : '#ffffff'} 
                            disabled
                            style={{ opacity: 0.8, cursor: 'not-allowed' }}
                            title="Click edit button (pen icon) to modify color"
                          />
                          <span className="mono">{c.color_code}</span>
                        </div>
                      </td>
                      <td className="mono">{formatBrowserTimestamp(c.date_added, c.createdAt)}</td>
                      <td className="mono">{formatBrowserTimestamp(c.date_modified, c.updatedAt)}</td>
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
              <div className="tab-header-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setTempType({ type: '' })} disabled={Boolean(tempType)} style={{ marginLeft: 'auto' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Date Added</th>
                    <th>Date Modified</th>
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
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
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
                      <td className="mono">{formatBrowserTimestamp(t.date_added, t.createdAt)}</td>
                      <td className="mono">{formatBrowserTimestamp(t.date_modified, t.updatedAt)}</td>
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
              <div className="tab-header-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setTempCountry({ country: 'JP', displayed_country: '🇯🇵 JP' })} disabled={Boolean(tempCountry)} style={{ marginLeft: 'auto' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Country Display</th>
                    <th>Date Added</th>
                    <th>Date Modified</th>
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
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
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
                      <td className="mono">{formatBrowserTimestamp(c.date_added, c.createdAt)}</td>
                      <td className="mono">{formatBrowserTimestamp(c.date_modified, c.updatedAt)}</td>
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
              <div className="tab-header-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setTempLocation({ location: '' })} disabled={Boolean(tempLocation)} style={{ marginLeft: 'auto' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Location Name</th>
                    <th>Date Added</th>
                    <th>Date Modified</th>
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
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
                      <td className="mono">{new Date().toISOString().split('T')[0]}</td>
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
                      <td className="mono">{formatBrowserTimestamp(loc.date_added, loc.createdAt)}</td>
                      <td className="mono">{formatBrowserTimestamp(loc.date_modified, loc.updatedAt)}</td>
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
              {editingItem.table === 'dim_member' && (
                <>
                  <div className="form-group span-2">
                    <label>Member Name *</label>
                    <input
                      type="text"
                      required
                      className="input-control"
                      value={String(editingItem.data.member_name || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, member_name: e.target.value } })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Color</label>
                    <select
                      className="input-control"
                      value={String(editingItem.data.color || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, color: e.target.value } })}
                    >
                      <option value="">-- Select Color --</option>
                      {colors.map((c) => (
                        <option key={c.id} value={c.color}>{c.color}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Group</label>
                    <select
                      className="input-control"
                      value={String(editingItem.data.group || '')}
                      onChange={(e) => {
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
                      }}
                    >
                      <option value="">-- Select Group --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.group}>{g.group}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Country 🔒</label>
                    <input
                      type="text"
                      className="input-control"
                      disabled
                      value={String(editingItem.data.country || '')}
                      title="Auto-mapped from Group"
                    />
                  </div>

                  <div className="form-group">
                    <label>Company 🔒</label>
                    <input
                      type="text"
                      className="input-control"
                      disabled
                      value={String(editingItem.data.company || '')}
                      title="Auto-mapped from Group"
                    />
                  </div>

                  <div className="form-group">
                    <label>Allow Subscribe</label>
                    <select
                      className="input-control"
                      value={getAllowSubscribeState(editingItem.data)}
                      onChange={(e) => {
                        const val = e.target.value as AllowSubscribeStatus;
                        const legacyAllowed = val !== 'Disabled';
                        setEditingItem({
                          ...editingItem,
                          data: {
                            ...editingItem.data,
                            allow_subscribe: val,
                            is_allowed_import: legacyAllowed,
                            allow_import: legacyAllowed
                          }
                        });
                      }}
                    >
                      <option value="Enabled">Enabled (All Users)</option>
                      <option value="Enabled-Admin">Enabled-Admin (Web Admin Only)</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Date Added</label>
                    <input
                      type="date"
                      className="input-control"
                      value={String(editingItem.data.date_added || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, date_added: e.target.value } })}
                    />
                  </div>

                  <div className="form-group span-2">
                    <label>Member Image URL</label>
                    <input
                      type="url"
                      className="input-control"
                      value={String(editingItem.data.member_image || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, member_image: e.target.value } })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-group span-2">
                    <label>X Profile</label>
                    <input
                      type="text"
                      className="input-control"
                      value={String(editingItem.data.x_profile || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, x_profile: e.target.value } })}
                      placeholder="@username"
                    />
                  </div>
                </>
              )}

              {editingItem.table === 'dim_group' && (
                <>
                  <div className="form-group">
                    <label>Group Name *</label>
                    <input
                      type="text"
                      required
                      className="input-control"
                      value={String(editingItem.data.group || '')}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, group: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <select
                      className="input-control"
                      value={String(editingItem.data.country || '')}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, country: e.target.value }
                      })}
                    >
                      {(countries.length > 0 ? countries : DEFAULT_COUNTRIES).map((c: any) => {
                        const val = c.displayed_country || c.country;
                        return (
                          <option key={c.id || val} value={val}>{val}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <select
                      className="input-control"
                      value={String(editingItem.data.company || 'Individual')}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, company: e.target.value }
                      })}
                    >
                      <option value="Individual">Individual</option>
                      {companies.filter(c => c.company !== 'Individual').map((c) => (
                        <option key={c.id} value={c.company}>{c.company}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Allow Subscribe</label>
                    <select
                      className="input-control"
                      value={getAllowSubscribeState(editingItem.data)}
                      onChange={(e) => {
                        const val = e.target.value as AllowSubscribeStatus;
                        const legacyAllowed = val !== 'Disabled';
                        setEditingItem({
                          ...editingItem,
                          data: {
                            ...editingItem.data,
                            allow_subscribe: val,
                            is_allowed_import: legacyAllowed,
                            allow_import: legacyAllowed
                          }
                        });
                      }}
                    >
                      <option value="Enabled">Enabled (All Users)</option>
                      <option value="Enabled-Admin">Enabled-Admin (Web Admin Only)</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>
                </>
              )}

              {editingItem.table === 'dim_color' && (
                <>
                  <div className="form-group">
                    <label>Color Name *</label>
                    <input
                      type="text"
                      required
                      className="input-control"
                      value={String(editingItem.data.color || '')}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, color: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Hex Code &amp; Color Picker</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="color"
                        className="color-picker-input"
                        value={String(editingItem.data.color_code || '#ffffff').startsWith('#') ? String(editingItem.data.color_code) : '#ffffff'}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          data: { ...editingItem.data, color_code: e.target.value }
                        })}
                      />
                      <input
                        type="text"
                        className="input-control mono"
                        value={String(editingItem.data.color_code || '')}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          data: { ...editingItem.data, color_code: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </>
              )}

              {editingItem.table !== 'dim_group' && editingItem.table !== 'dim_color' && editingItem.table !== 'dim_member' && (
                Object.keys(editingItem.data)
                  .filter(k => k !== 'id' && k !== 'userId' && k !== 'createdAt' && k !== 'updatedAt' && k !== 'date_added' && k !== 'date_modified' && (editingItem.table !== 'dim_company' || (k !== 'allow_import' && k !== 'is_allowed_import' && k !== 'allow_subscribe')))
                  .map(key => (
                    <div key={key} className={`form-group ${key === 'member_image' || key === 'x_profile' ? 'span-2' : ''}`}>
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
                  ))
              )}

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
      {/* Mobile Add Dim Modal */}
      {isMobile && (tempMember || tempGroup || tempCompany || tempColor || tempType || tempCountry || tempLocation) && (
        <div className="modal-backdrop" onClick={() => {
          setTempMember(null); setTempGroup(null); setTempCompany(null);
          setTempColor(null); setTempType(null); setTempCountry(null); setTempLocation(null);
        }}>
          <div className="modal-dialog card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {tempMember && '📸 Add New Member'}
                {tempGroup && '📸 Add New Group'}
                {tempCompany && '📸 Add New Company'}
                {tempColor && '📸 Add New Color'}
                {tempType && '📸 Add New Type'}
                {tempCountry && '📸 Add New Country'}
                {tempLocation && '📸 Add New Location'}
              </h3>
              <button className="btn-close-modal" onClick={() => {
                setTempMember(null); setTempGroup(null); setTempCompany(null);
                setTempColor(null); setTempType(null); setTempCountry(null); setTempLocation(null);
              }}>
                <X size={18} />
              </button>
            </div>

            {tempMember && (
              <div className="modal-form">
                <div className="form-group span-2">
                  <label>Member Name *</label>
                  <input type="text" className="input-control" value={tempMember.member_name} onChange={(e) => setTempMember({ ...tempMember, member_name: e.target.value })} placeholder="Member name" autoFocus />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <select className="input-control" value={tempMember.color} onChange={(e) => setTempMember({ ...tempMember, color: e.target.value })}>
                    {colors.map(c => <option key={c.id} value={c.color}>{c.color}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Group</label>
                  <select className="input-control" value={tempMember.group} onChange={(e) => {
                    const grpName = e.target.value;
                    const matchG = groups.find(g => g.group === grpName);
                    setTempMember({
                      ...tempMember,
                      group: grpName,
                      country: matchG?.country || tempMember.country,
                      company: matchG?.company || tempMember.company,
                    });
                  }}>
                    <option value="">Select Group...</option>
                    {groups.map(g => <option key={g.id} value={g.group}>{g.group}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Country (Auto)</label>
                  <input type="text" className="input-control" value={tempMember.country} readOnly style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group">
                  <label>Company (Auto)</label>
                  <input type="text" className="input-control" value={tempMember.company} readOnly style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group span-2">
                  <label>Member Image URL</label>
                  <input type="text" className="input-control" value={tempMember.member_image} onChange={(e) => setTempMember({ ...tempMember, member_image: e.target.value })} placeholder="https://..." />
                </div>
                <div className="form-group span-2">
                  <label>X Profile URL</label>
                  <input type="text" className="input-control" value={tempMember.x_profile} onChange={(e) => setTempMember({ ...tempMember, x_profile: e.target.value })} placeholder="https://x.com/..." />
                </div>
                <div className="modal-actions" style={{ marginTop: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setTempMember(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveTempMember}><Save size={14} /> Save Member</button>
                </div>
              </div>
            )}

            {tempGroup && (
              <div className="modal-form">
                <div className="form-group span-2">
                  <label>Group Name *</label>
                  <input type="text" className="input-control" value={tempGroup.group} onChange={(e) => setTempGroup({ ...tempGroup, group: e.target.value })} placeholder="Group name" autoFocus />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <select 
                    className="input-control" 
                    value={tempGroup.country} 
                    onChange={(e) => setTempGroup({ ...tempGroup, country: e.target.value })}
                  >
                    {(countries.length > 0 ? countries : DEFAULT_COUNTRIES).map((c: any) => {
                      const val = c.displayed_country || c.country;
                      return (
                        <option key={c.id || val} value={val}>{val}</option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <select className="input-control" value={tempGroup.company} onChange={(e) => setTempGroup({ ...tempGroup, company: e.target.value })}>
                    <option value="Individual">Individual</option>
                    {companies.filter(c => c.company !== 'Individual').map(c => <option key={c.id} value={c.company}>{c.company}</option>)}
                  </select>
                </div>
                <div className="modal-actions" style={{ marginTop: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setTempGroup(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveTempGroup}><Save size={14} /> Save Group</button>
                </div>
              </div>
            )}

            {tempCompany && (
              <div className="modal-form">
                <div className="form-group span-2">
                  <label>Company Name *</label>
                  <input type="text" className="input-control" value={tempCompany.company} onChange={(e) => setTempCompany({ company: e.target.value })} placeholder="Company name" autoFocus />
                </div>
                <div className="modal-actions" style={{ marginTop: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setTempCompany(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveTempCompany}><Save size={14} /> Save Company</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .backoffice-page {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
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
          flex-wrap: wrap;
          padding-bottom: 4px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          white-space: nowrap;
          transition: all var(--transition-fast);

          &:hover {
            color: var(--text-main);
            border-color: var(--border-strong);
          }

          &.active {
            background-color: var(--accent-primary-subtle);
            color: var(--accent-primary);
            border-color: rgba(212, 168, 75, 0.4);
            font-weight: 600;
          }
        }

        .table-card {
          padding: 15px;
        }

        .tab-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
          width: 100%;

          h2 {
            margin: 0;
            font-size: 1.1rem;
            color: var(--text-main);
          }
        }

        .tab-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          gap: 12px;
        }

        .table-wrapper {
          overflow-x: auto;
          width: calc(100% + 20px);
          max-width: calc(100% + 20px);
          margin-left: -10px;
          margin-right: -10px;
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

        .color-picker-input {
          width: 32px;
          height: 32px;
          padding: 0;
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          background: none;
          cursor: pointer;
          flex-shrink: 0;
          -webkit-appearance: none;
        }
        .color-picker-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        .color-picker-input::-webkit-color-swatch {
          border: none;
          border-radius: 5px;
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

        :global(.status-tag) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 14px;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
          border: 1px solid transparent;
        }
        :global(.status-tag.active) { background: rgba(34, 197, 94, 0.18) !important; color: #22c55e !important; border-color: rgba(34, 197, 94, 0.45) !important; }
        :global(.status-tag.inactive) { background: rgba(239, 68, 68, 0.18) !important; color: #ef4444 !important; border-color: rgba(239, 68, 68, 0.45) !important; }

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
          padding: 12px;
        }

        .modal-dialog {
          width: 100%;
          max-width: 620px;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-strong);
          border-radius: 12px;
          padding: 20px;
          max-height: calc(100vh - 24px);
          overflow-y: auto;
        }

        .modal-dialog.modal-confirm-dialog {
          max-width: 450px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
          h3 { margin: 0; font-size: 1.05rem; color: var(--text-main); }
        }

        .btn-close-modal {
          background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center;
          &:hover { color: var(--text-main); background: var(--bg-surface-2); }
        }

        .modal-form {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .form-group {
          display: flex; flex-direction: column; gap: 6px;
          label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
        }

        .form-group.span-2,
        .modal-actions {
          grid-column: span 2;
        }

        @media (max-width: 540px) {
          .modal-dialog { padding: 16px; }
          .modal-form {
            grid-template-columns: 1fr;
          }
          .form-group.span-2,
          .modal-actions {
            grid-column: span 1;
          }
        }

        .input-control {
          background-color: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-main);
          font-size: 0.9rem;
          outline: none;
          width: 100%;
          &:focus { border-color: var(--accent-primary); }
          &:disabled { opacity: 0.5; cursor: not-allowed; background: var(--bg-surface-3); }
        }

        .modal-actions {
          display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;
        }

        .modal-body {
          padding: 8px 0;
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

        .batch-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(212, 168, 75, 0.08);
          border: 1px solid rgba(212, 168, 75, 0.3);
          border-radius: 8px;
          padding: 8px 14px;
          margin-bottom: 10px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .batch-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .btn-xs {
          padding: 5px 10px;
          font-size: 0.78rem;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--border-subtle);
          background: var(--bg-surface-2);
          color: var(--text-main);
          &:hover { border-color: var(--border-strong); }
          &.icon-only { padding: 5px; }
        }

        .filter-select-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: nowrap;
        }

        .filter-select {
          background: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 5px 10px;
          color: var(--text-main);
          font-size: 0.82rem;
          outline: none;
          &:focus { border-color: var(--accent-primary); }
        }

        .table-filter-group {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: nowrap;
          flex: 1;
          min-width: 0;
        }

        .selected-row td {
          background-color: rgba(212, 168, 75, 0.06) !important;
        }

        .btn-primary.btn-sm {
            margin-left: auto;
        }



        :global(.badge-toggle) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 14px;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          border: 1px solid transparent;
          transition: all 0.15s;
        }
        :global(.badge-toggle.allowed) {
          background: rgba(34, 197, 94, 0.18) !important;
          color: #22c55e !important;
          border-color: rgba(34, 197, 94, 0.45) !important;
        }
        :global(.badge-toggle.allowed:hover) { background: rgba(34, 197, 94, 0.3) !important; }
        :global(.badge-toggle.admin-only) {
          background: rgba(212, 168, 75, 0.18) !important;
          color: #d4a84b !important;
          border-color: rgba(212, 168, 75, 0.45) !important;
        }
        :global(.badge-toggle.admin-only:hover) { background: rgba(212, 168, 75, 0.3) !important; }
        :global(.badge-toggle.disallowed) {
          background: rgba(239, 68, 68, 0.18) !important;
          color: #ef4444 !important;
          border-color: rgba(239, 68, 68, 0.45) !important;
        }
        :global(.badge-toggle.disallowed:hover) { background: rgba(239, 68, 68, 0.3) !important; }
      `}</style>
    </div>
  );
}
