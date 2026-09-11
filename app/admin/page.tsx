'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { 
  addMetadataDoc, 
  updateMetadataDoc, 
  deleteMetadataDoc, 
  getAdminLogs, 
  getItemValueString,
  getUserSubscriptions,
  saveUserSubscriptions,
  subscribeDefaultMetadata,
  UserSubscriptionConfig
} from '@/lib/dataStore';
import { DEFAULT_COUNTRIES, DEFAULT_COMPANIES, DEFAULT_GROUPS, DEFAULT_MEMBERS } from '@/lib/seedData';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { Plus, Edit2, Trash2, Shield, Users, Building, Layers, X, Save, ArrowUpDown, ExternalLink, Lock, Sparkles, Sliders, Check } from 'lucide-react';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { formatDisplayName, formatBrowserTimestamp } from '@/lib/imageUtils';

type MemberSortKey = 'date_added' | 'member_name' | 'color' | 'group' | 'country' | 'company' | 'is_active';
type GroupSortKey = 'group' | 'country' | 'company' | 'is_active';
type CompanySortKey = 'company' | 'is_active';

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

export default function AdminPage() {
  const { user, isDemoUser } = useAuth();
  const { members, companies, groups, colors, types, countries, userId, loading } = useChekiData();

  const [activeTab, setActiveTab] = useState<'members' | 'groups' | 'companies' | 'logs'>('members');
  const [editingItem, setEditingItem] = useState<{ table: string; data: Record<string, unknown> } | null>(null);

  // Subscribe Modal State
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [subConfig, setSubConfig] = useState<UserSubscriptionConfig>({
    subscribeAll: true,
    countries: [],
    companies: [],
    groups: [],
  });

  // Default raw metadata list from Back Office for subscribe selection modal
  const [defaultMembers, setDefaultMembers] = useState<any[]>([]);
  const [defaultGroups, setDefaultGroups] = useState<any[]>([]);
  const [defaultCompanies, setDefaultCompanies] = useState<any[]>([]);
  const [defaultCountries, setDefaultCountries] = useState<any[]>([]);

  useEffect(() => {
    const unsubMem = subscribeDefaultMetadata<any>('dim_member', DEFAULT_MEMBERS, setDefaultMembers, isDemoUser);
    const unsubGrp = subscribeDefaultMetadata<any>('dim_group', DEFAULT_GROUPS, setDefaultGroups, isDemoUser);
    const unsubCmp = subscribeDefaultMetadata<any>('dim_company', DEFAULT_COMPANIES, setDefaultCompanies, isDemoUser);
    const unsubCnt = subscribeDefaultMetadata<any>('dim_country', DEFAULT_COUNTRIES, setDefaultCountries, isDemoUser);
    return () => {
      unsubMem();
      unsubGrp();
      unsubCmp();
      unsubCnt();
    };
  }, [isDemoUser]);

  useEffect(() => {
    if (userId) {
      setSubConfig(getUserSubscriptions(userId));
    }
  }, [userId]);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Sorting states
  const [memberSortKey, setMemberSortKey] = useState<MemberSortKey>('date_added');
  const [memberSortAsc, setMemberSortAsc] = useState<boolean>(false);
  const [groupSortKey, setGroupSortKey] = useState<GroupSortKey>('group');
  const [groupSortAsc, setGroupSortAsc] = useState<boolean>(true);
  const [companySortKey, setCompanySortKey] = useState<CompanySortKey>('company');
  const [companySortAsc, setCompanySortAsc] = useState<boolean>(true);

  // Draft states
  const [tempMember, setTempMember] = useState<TempMemberRow | null>(null);
  const [tempGroup, setTempGroup] = useState<{ group: string; country: string; company: string } | null>(null);
  const [tempCompany, setTempCompany] = useState<{ company: string } | null>(null);

  const [inlineNewModal, setInlineNewModal] = useState<{ table: string; fieldKey: string; name: string } | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    table: string;
    id: string;
    displayValue: string;
  } | null>(null);

  // Table search & filter states
  const [filterMemberGroup, setFilterMemberGroup] = useState<string>('all');
  const [filterMemberCompany, setFilterMemberCompany] = useState<string>('all');
  const [filterGroupCompany, setFilterGroupCompany] = useState<string>('all');

  const logs = getAdminLogs(userId);

  const groupLookup = useMemo(() => {
    const map: Record<string, { company: string; country: string }> = {};
    groups.forEach((g) => {
      map[g.group] = { company: g.company, country: g.country };
    });
    return map;
  }, [groups]);

  // Options for subscribe modal
  // Raw default lists filtered by allow_import !== false
  const rawDefaultCountries = useMemo(() => {
    const list = defaultCountries.length > 0 ? defaultCountries : DEFAULT_COUNTRIES;
    return list.filter(c => c.allow_import !== false);
  }, [defaultCountries]);

  const rawDefaultCompanies = useMemo(() => {
    const list = defaultCompanies.length > 0 ? defaultCompanies : DEFAULT_COMPANIES;
    return list.filter(c => c.allow_import !== false);
  }, [defaultCompanies]);

  const rawDefaultGroups = useMemo(() => {
    const list = defaultGroups.length > 0 ? defaultGroups : DEFAULT_GROUPS;
    return list.filter(g => g.allow_import !== false);
  }, [defaultGroups]);

  // Options for subscribe modal (with cascading filter across Country, Company, Group)
  // Request 3: Subscribe by Country should only show available countries from unique countries in default_dim_group
  const availableSubCountries = useMemo(() => {
    const list = defaultGroups.length > 0 ? defaultGroups : DEFAULT_GROUPS;
    const allowedGroups = list.filter(g => g.allow_import !== false);
    const countrySet = new Set<string>();
    allowedGroups.forEach(g => {
      if (g.country && typeof g.country === 'string' && g.country.trim()) {
        countrySet.add(g.country.trim());
      }
    });
    return Array.from(countrySet).sort();
  }, [defaultGroups]);

  const availableSubCompanies = useMemo(() => {
    let list = rawDefaultCompanies;
    if (subConfig.countries.length > 0 && !subConfig.subscribeAll) {
      list = list.filter(comp => {
        const compCountry = comp.country;
        if (compCountry && subConfig.countries.includes(compCountry)) return true;
        return rawDefaultGroups.some(g => g.company === comp.company && subConfig.countries.includes(g.country));
      });
    }
    const names = list.map(c => c.company).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [rawDefaultCompanies, rawDefaultGroups, subConfig.countries, subConfig.subscribeAll]);

  const availableSubGroups = useMemo(() => {
    let list = rawDefaultGroups;
    if (!subConfig.subscribeAll) {
      if (subConfig.countries.length > 0) {
        list = list.filter(g => subConfig.countries.includes(g.country));
      }
      if (subConfig.companies.length > 0) {
        list = list.filter(g => subConfig.companies.includes(g.company));
      }
    }
    const names = list.map(g => g.group).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [rawDefaultGroups, subConfig.countries, subConfig.companies, subConfig.subscribeAll]);

  // Request 4: Check if all currently visible groups are selected
  const isAllVisibleGroupsSelected = useMemo(() => {
    if (availableSubGroups.length === 0) return false;
    if (subConfig.subscribeAll) return true;
    return availableSubGroups.every(grp => subConfig.groups.includes(grp));
  }, [availableSubGroups, subConfig.groups, subConfig.subscribeAll]);

  // Sort handlers
  const handleSortMembers = (key: MemberSortKey) => {
    if (memberSortKey === key) {
      setMemberSortAsc(!memberSortAsc);
    } else {
      setMemberSortKey(key);
      setMemberSortAsc(true);
    }
  };

  const handleSortGroups = (key: GroupSortKey) => {
    if (groupSortKey === key) {
      setGroupSortAsc(!groupSortAsc);
    } else {
      setGroupSortKey(key);
      setGroupSortAsc(true);
    }
  };

  const handleSortCompanies = (key: CompanySortKey) => {
    if (companySortKey === key) {
      setCompanySortAsc(!companySortAsc);
    } else {
      setCompanySortKey(key);
      setCompanySortAsc(true);
    }
  };

  // Toggle Active/Inactive status for user
  const handleToggleUserActive = async (table: string, item: any) => {
    const nextActive = item.is_active === false ? true : false;
    try {
      await updateMetadataDoc(table, item.id, userId, { ...item, is_active: nextActive }, isDemoUser);
    } catch (err) {
      alert("Error updating active status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Save Subscribe Config
  const handleSaveSubscriptions = () => {
    saveUserSubscriptions(userId, subConfig);
    setIsSubscribeModalOpen(false);
  };

  // Request 2: Toggle Subscribe All Default Data
  const handleToggleSubscribeAll = () => {
    const nextSubAll = !subConfig.subscribeAll;
    if (nextSubAll) {
      setSubConfig({
        subscribeAll: true,
        countries: [...availableSubCountries],
        companies: [...availableSubCompanies],
        groups: [...availableSubGroups],
      });
    } else {
      setSubConfig({
        subscribeAll: false,
        countries: [],
        companies: [],
        groups: [],
      });
    }
  };

  const handleToggleSubCountry = (cnt: string) => {
    const activeCountries = subConfig.subscribeAll ? availableSubCountries : subConfig.countries;
    const activeCompanies = subConfig.subscribeAll ? availableSubCompanies : subConfig.companies;
    const activeGroups = subConfig.subscribeAll ? availableSubGroups : subConfig.groups;

    const isSelected = activeCountries.includes(cnt);
    let nextCountries = isSelected
      ? activeCountries.filter(c => c !== cnt)
      : [...activeCountries, cnt];

    let nextCompanies = activeCompanies;
    let nextGroups = activeGroups;

    if (isSelected && nextCountries.length > 0) {
      nextCompanies = nextCompanies.filter(compName => {
        const compObj = rawDefaultCompanies.find(c => c.company === compName);
        if (compObj && compObj.country && nextCountries.includes(compObj.country)) return true;
        return rawDefaultGroups.some(g => g.company === compName && nextCountries.includes(g.country));
      });
      nextGroups = nextGroups.filter(grpName => {
        const grpObj = rawDefaultGroups.find(g => g.group === grpName);
        return grpObj ? nextCountries.includes(grpObj.country) : true;
      });
    }

    setSubConfig({
      subscribeAll: false,
      countries: nextCountries,
      companies: nextCompanies,
      groups: nextGroups
    });
  };

  const handleToggleSubCompany = (comp: string) => {
    const activeCountries = subConfig.subscribeAll ? availableSubCountries : subConfig.countries;
    const activeCompanies = subConfig.subscribeAll ? availableSubCompanies : subConfig.companies;
    const activeGroups = subConfig.subscribeAll ? availableSubGroups : subConfig.groups;

    const isSelected = activeCompanies.includes(comp);
    let nextCompanies = isSelected
      ? activeCompanies.filter(c => c !== comp)
      : [...activeCompanies, comp];

    let nextCountries = [...activeCountries];
    let nextGroups = activeGroups;

    if (!isSelected) {
      const compObj = rawDefaultCompanies.find(c => c.company === comp);
      const parentCountry = compObj?.country || rawDefaultGroups.find(g => g.company === comp)?.country;
      if (parentCountry && !nextCountries.includes(parentCountry)) {
        nextCountries.push(parentCountry);
      }
    } else if (nextCompanies.length > 0) {
      nextGroups = nextGroups.filter(grpName => {
        const grpObj = rawDefaultGroups.find(g => g.group === grpName);
        return grpObj ? nextCompanies.includes(grpObj.company) : true;
      });
    }

    setSubConfig({
      subscribeAll: false,
      countries: nextCountries,
      companies: nextCompanies,
      groups: nextGroups
    });
  };

  const handleToggleSubGroup = (grp: string) => {
    const activeCountries = subConfig.subscribeAll ? availableSubCountries : subConfig.countries;
    const activeCompanies = subConfig.subscribeAll ? availableSubCompanies : subConfig.companies;
    const activeGroups = subConfig.subscribeAll ? availableSubGroups : subConfig.groups;

    const isSelected = activeGroups.includes(grp);
    let nextGroups = isSelected
      ? activeGroups.filter(g => g !== grp)
      : [...activeGroups, grp];

    let nextCompanies = [...activeCompanies];
    let nextCountries = [...activeCountries];

    if (!isSelected) {
      const grpObj = rawDefaultGroups.find(g => g.group === grp);
      if (grpObj) {
        if (grpObj.company && !nextCompanies.includes(grpObj.company)) {
          nextCompanies.push(grpObj.company);
        }
        if (grpObj.country && !nextCountries.includes(grpObj.country)) {
          nextCountries.push(grpObj.country);
        }
      }
    }

    setSubConfig({
      subscribeAll: false,
      countries: nextCountries,
      companies: nextCompanies,
      groups: nextGroups
    });
  };

  // Request 4: Toggle Select All Groups currently appearing
  const handleToggleSelectAllGroups = () => {
    const activeCountries = subConfig.subscribeAll ? availableSubCountries : subConfig.countries;
    const activeCompanies = subConfig.subscribeAll ? availableSubCompanies : subConfig.companies;
    const activeGroups = subConfig.subscribeAll ? availableSubGroups : subConfig.groups;

    if (isAllVisibleGroupsSelected) {
      const nextGroups = activeGroups.filter(g => !availableSubGroups.includes(g));
      setSubConfig({
        subscribeAll: false,
        countries: activeCountries,
        companies: activeCompanies,
        groups: nextGroups
      });
    } else {
      const nextGroupsSet = new Set([...activeGroups, ...availableSubGroups]);
      const nextCountriesSet = new Set([...activeCountries]);
      const nextCompaniesSet = new Set([...activeCompanies]);

      availableSubGroups.forEach(grpName => {
        const grpObj = rawDefaultGroups.find(g => g.group === grpName);
        if (grpObj) {
          if (grpObj.company) nextCompaniesSet.add(grpObj.company);
          if (grpObj.country) nextCountriesSet.add(grpObj.country);
        }
      });

      setSubConfig({
        subscribeAll: false,
        countries: Array.from(nextCountriesSet),
        companies: Array.from(nextCompaniesSet),
        groups: Array.from(nextGroupsSet)
      });
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (filterMemberCompany !== 'all' && m.company !== filterMemberCompany) return false;
      if (filterMemberGroup !== 'all' && m.group !== filterMemberGroup) return false;
      return true;
    });
  }, [members, filterMemberCompany, filterMemberGroup]);

  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      let valA: any = a[memberSortKey] ?? '';
      let valB: any = b[memberSortKey] ?? '';

      if (memberSortKey === 'is_active') {
        valA = a.is_active ? 1 : 0;
        valB = b.is_active ? 1 : 0;
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return memberSortAsc ? -1 : 1;
      if (valA > valB) return memberSortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredMembers, memberSortKey, memberSortAsc]);

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      if (filterGroupCompany !== 'all' && g.company !== filterGroupCompany) return false;
      return true;
    });
  }, [groups, filterGroupCompany]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      let valA: any = a[groupSortKey] ?? '';
      let valB: any = b[groupSortKey] ?? '';
      if (groupSortKey === 'is_active') {
        valA = a.is_active ? 1 : 0;
        valB = b.is_active ? 1 : 0;
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }
      if (valA < valB) return groupSortAsc ? -1 : 1;
      if (valA > valB) return groupSortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredGroups, groupSortKey, groupSortAsc]);

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      let valA: any = a[companySortKey] ?? '';
      let valB: any = b[companySortKey] ?? '';
      if (companySortKey === 'is_active') {
        valA = a.is_active ? 1 : 0;
        valB = b.is_active ? 1 : 0;
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }
      if (valA < valB) return companySortAsc ? -1 : 1;
      if (valA > valB) return companySortAsc ? 1 : -1;
      return 0;
    });
  }, [companies, companySortKey, companySortAsc]);

  // Combined Status badge helper (Column 2)
  const renderStatusBadge = (table: string, item: any, isSubscribed: boolean) => {
    const isActive = item.is_active !== false;
    let label = 'Active';
    let className = 'status-tag active';

    if (!isActive) {
      label = 'Inactive';
      className = 'status-tag inactive';
    } else if (isSubscribed) {
      label = 'Sub';
      className = 'status-tag sub';
    } else {
      label = 'Active';
      className = 'status-tag active';
    }

    return (
      <button
        type="button"
        className={className}
        onClick={() => handleToggleUserActive(table, item)}
        title="Click to toggle Active / Inactive status for your account"
      >
        {label}
      </button>
    );
  };

  const handleStartAddMember = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const firstGroup = groups[0]?.group || '';
    const mapped = groupLookup[firstGroup];
    setTempMember({
      member_name: '',
      color: colors[0]?.color || 'White',
      group: firstGroup,
      country: mapped?.country || '🇹🇭 TH',
      company: mapped?.company || 'Individual',
      is_active: true,
      x_profile: '',
      member_image: '',
      date_added: todayStr,
    });
  };

  const handleSaveTempMember = async () => {
    if (!tempMember || !tempMember.member_name.trim()) return;
    try {
      await addMetadataDoc('dim_member', userId, {
        ...tempMember,
        start_date: '1000-12-26',
        end_date: '9999-12-31',
      }, isDemoUser);
      setTempMember(null);
    } catch (err) {
      alert("Error saving custom member: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveTempGroup = async () => {
    if (!tempGroup || !tempGroup.group.trim()) return;
    try {
      await addMetadataDoc('dim_group', userId, { ...tempGroup, is_active: true }, isDemoUser);
      setTempGroup(null);
    } catch (err) {
      alert("Error saving group: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveTempCompany = async () => {
    if (!tempCompany || !tempCompany.company.trim()) return;
    try {
      await addMetadataDoc('dim_company', userId, { ...tempCompany, is_active: true }, isDemoUser);
      setTempCompany(null);
    } catch (err) {
      alert("Error saving company: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveInlineOption = async () => {
    if (!inlineNewModal || !inlineNewModal.name.trim()) return;
    const { table, name } = inlineNewModal;
    try {
      let defaultObj: Record<string, unknown> = {};
      if (table === 'dim_color') defaultObj = { color: name.trim(), color_code: '#ffffff' };
      else if (table === 'dim_group') defaultObj = { group: name.trim(), country: '🇹🇭 TH', company: 'Individual' };
      else if (table === 'dim_company') defaultObj = { company: name.trim() };
      else defaultObj = { [inlineNewModal.fieldKey]: name.trim() };

      await addMetadataDoc(table, userId, defaultObj, isDemoUser);
      if (tempMember) {
        if (table === 'dim_color') setTempMember({ ...tempMember, color: name.trim() });
        if (table === 'dim_group') setTempMember({ ...tempMember, group: name.trim(), country: '🇹🇭 TH', company: 'Individual' });
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
    await updateMetadataDoc(table, data.id as string, userId, data, isDemoUser);
    setEditingItem(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal) return;
    const { table, id, displayValue } = deleteConfirmModal;
    await deleteMetadataDoc(table, id, userId, displayValue, isDemoUser);
    setDeleteConfirmModal(null);
  };

  if (!user && !isDemoUser) return <LoginPrompt />;
  if (loading) return <CircularSpinner />;

  return (
    <div className="admin-page">
      {/* Navigation Tabs */}
      <div className="tabs-bar">
        <button type="button" className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          <Users size={16} /> Members ({members.length})
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
          <Layers size={16} /> Groups ({groups.length})
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`} onClick={() => setActiveTab('companies')}>
          <Building size={16} /> Companies ({companies.length})
        </button>
        <button type="button" className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          <Shield size={16} /> Audit Logs ({logs.length})
        </button>
      </div>

      {/* Main Table Card */}
      <div className="table-card card">
        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div>
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setIsSubscribeModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sliders size={14} /> Manage Subscriptions
                </button>
                {/* Filter by Company & Group */}
                <select 
                  className="table-select" 
                  style={{ width: 'auto', minWidth: '130px' }}
                  value={filterMemberCompany}
                  onChange={(e) => setFilterMemberCompany(e.target.value)}
                >
                  <option value="all">All Companies</option>
                  {Array.from(new Set(members.map(m => m.company).filter(Boolean))).sort().map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
                <select 
                  className="table-select" 
                  style={{ width: 'auto', minWidth: '130px' }}
                  value={filterMemberGroup}
                  onChange={(e) => setFilterMemberGroup(e.target.value)}
                >
                  <option value="all">All Groups</option>
                  {Array.from(new Set(members.map(m => m.group).filter(Boolean))).sort().map(grp => (
                    <option key={grp} value={grp}>{grp}</option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleStartAddMember} disabled={Boolean(tempMember)}>
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table member-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th className="sortable-th" onClick={() => handleSortMembers('is_active')}>
                      Status {memberSortKey === 'is_active' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
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
                    <th>X Profile</th>
                    <th className="sortable-th" onClick={() => handleSortMembers('date_added')}>
                      Date Added {memberSortKey === 'date_added' ? (memberSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Temp Draft Row */}
                  {tempMember && !isMobile && (
                    <tr className="temp-row">
                      <td>
                        <div className="action-btns">
                          <button type="button" className="btn btn-primary btn-xs" onClick={handleSaveTempMember}><Save size={13} /> Save</button>
                          <button type="button" className="btn btn-secondary btn-xs" onClick={() => setTempMember(null)}><X size={13} /></button>
                        </div>
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
                      <td><input type="text" disabled className="table-input disabled" value={tempMember.country} /></td>
                      <td><input type="text" disabled className="table-input disabled" value={tempMember.company} /></td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input" 
                          placeholder="X Profile" 
                          value={tempMember.x_profile} 
                          onChange={(e) => setTempMember({ ...tempMember, x_profile: e.target.value })}
                        />
                      </td>
                      <td className="mono">{tempMember.date_added}</td>
                    </tr>
                  )}

                  {/* Sorted Members List */}
                  {sortedMembers.map((m) => {
                    const colorObj = colors.find(c => c.color === m.color);
                    const xUrl = m.x_profile 
                      ? (m.x_profile.startsWith('http') ? m.x_profile : `https://x.com/${m.x_profile.replace('@', '')}`)
                      : '';
                    const isSubscribed = Boolean(m.isDefault || m.is_imported || m.id?.startsWith('default_'));

                    return (
                      <tr key={m.id}>
                        <td>
                          <button 
                            type="button"
                            className="btn-icon" 
                            onClick={() => setEditingItem({ table: 'dim_member', data: { ...m } })}
                            title={isSubscribed ? "View / edit subscribed member" : "Edit custom member"}
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                        <td>
                          {renderStatusBadge('dim_member', m, isSubscribed)}
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
                        <td>
                          {xUrl ? (
                            <a href={xUrl} target="_blank" rel="noreferrer" className="x-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <ExternalLink size={13} /> Link
                            </a>
                          ) : '-'}
                        </td>
                        <td className="mono">{formatBrowserTimestamp(m.date_added, m.createdAt)}</td>
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
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setIsSubscribeModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sliders size={14} /> Manage Subscriptions
                </button>
                {/* Filter by Company */}
                <select 
                  className="table-select" 
                  style={{ width: 'auto', minWidth: '140px' }}
                  value={filterGroupCompany}
                  onChange={(e) => setFilterGroupCompany(e.target.value)}
                >
                  <option value="all">All Companies</option>
                  {Array.from(new Set(groups.map(g => g.company).filter(Boolean))).sort().map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditingItem({ table: 'dim_group', data: { group: '', country: '🇹🇭 TH', company: 'Individual' } })}>
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th className="sortable-th" onClick={() => handleSortGroups('is_active')}>
                      Status {groupSortKey === 'is_active' ? (groupSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortGroups('group')}>
                      Group Name {groupSortKey === 'group' ? (groupSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortGroups('country')}>
                      Country {groupSortKey === 'country' ? (groupSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortGroups('company')}>
                      Company {groupSortKey === 'company' ? (groupSortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroups.map((g) => {
                    const isSubscribed = Boolean(g.isDefault || g.is_imported || g.id?.startsWith('default_'));
                    return (
                      <tr key={g.id}>
                        <td>
                          <button 
                            type="button"
                            className="btn-icon" 
                            onClick={() => setEditingItem({ table: 'dim_group', data: { ...g } })}
                            title={isSubscribed ? "View / edit subscribed group" : "Edit custom group"}
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                        <td>
                          {renderStatusBadge('dim_group', g, isSubscribed)}
                        </td>
                        <td><strong>{g.group}</strong></td>
                        <td>{g.country}</td>
                        <td>{g.company}</td>
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
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setIsSubscribeModalOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sliders size={14} /> Manage Subscriptions
                </button>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditingItem({ table: 'dim_company', data: { company: '' } })}>
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th className="sortable-th" onClick={() => handleSortCompanies('is_active')}>
                      Status {companySortKey === 'is_active' ? (companySortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                    <th className="sortable-th" onClick={() => handleSortCompanies('company')}>
                      Company Name {companySortKey === 'company' ? (companySortAsc ? '▲' : '▼') : <ArrowUpDown size={12} />}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompanies.map((c) => {
                    const isSubscribed = Boolean(c.isDefault || c.is_imported || c.id?.startsWith('default_'));
                    return (
                      <tr key={c.id}>
                        <td>
                          <button 
                            type="button"
                            className="btn-icon" 
                            onClick={() => setEditingItem({ table: 'dim_company', data: { ...c } })}
                            title={isSubscribed ? "View / edit subscribed company" : "Edit custom company"}
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                        <td>
                          {renderStatusBadge('dim_company', c, isSubscribed)}
                        </td>
                        <td><strong>{c.company}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {activeTab === 'logs' && (
          <div>
            <div className="tab-header" style={{ marginBottom: '14px' }}>
              <h2>User Audit Logs</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Historical mutations and updates for your user account.</p>
            </div>
            <div className="table-wrapper">
              <table className="dim-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action / Change Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                        No audit logs recorded yet.
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="mono">{log.timestamp}</td>
                      <td>{log.actionDetail || log.actionType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Record Modal */}
      {editingItem && (() => {
        const isSubscribed = Boolean(editingItem.data.isDefault || editingItem.data.is_imported || String(editingItem.data.id || '').startsWith('default_'));
        return (
          <div className="modal-overlay" onClick={() => setEditingItem(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingItem.data.id ? (isSubscribed ? 'View Subscribed Record' : 'Edit Custom Record') : 'Add Custom Record'}</h3>
                <button type="button" className="btn-close" onClick={() => setEditingItem(null)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="modal-form">
                {isSubscribed && (
                  <div className="form-group span-2" style={{ background: 'rgba(212, 168, 75, 0.12)', border: '1px solid rgba(212, 168, 75, 0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    Subscribed live from Back Office. Record properties (name, photo, group, company) are managed globally. You can toggle your Active/Inactive status preference below.
                  </div>
                )}

                {editingItem.table === 'dim_member' && (
                  <>
                    <div className="form-group">
                      <label>Member Name *</label>
                      <input
                        type="text"
                        required
                        disabled={isSubscribed}
                        value={String(editingItem.data.member_name || '')}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, member_name: e.target.value } })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Color</label>
                      <select
                        disabled={isSubscribed}
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
                        {!isSubscribed && <option value="__CREATE_NEW__">+ Create New Color...</option>}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Group</label>
                      <select
                        disabled={isSubscribed}
                        value={String(editingItem.data.group || '')}
                        onChange={(e) => {
                          const grpVal = e.target.value;
                          if (grpVal === '__CREATE_NEW__') {
                            setInlineNewModal({ table: 'dim_group', fieldKey: 'group', name: '' });
                          } else {
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
                        {!isSubscribed && <option value="__CREATE_NEW__">+ Create New Group...</option>}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Country <span title="Locked & auto-mapped by Group"><Lock size={12} /></span>
                      </label>
                      <input
                        type="text"
                        disabled
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
                        value={String(editingItem.data.company || 'Individual')}
                        title="Company is locked and auto-mapped by Group"
                      />
                    </div>

                    <div className="form-group">
                      <label>Date Added</label>
                      <input
                        type="date"
                        disabled={isSubscribed}
                        value={String(editingItem.data.date_added || new Date().toISOString().split('T')[0])}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, date_added: e.target.value } })}
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
                      <label>Member Avatar Image URL</label>
                      <input
                        type="url"
                        disabled={isSubscribed}
                        value={String(editingItem.data.member_image || '')}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, member_image: e.target.value } })}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="form-group span-2">
                      <label>X / Twitter Profile</label>
                      <input
                        type="text"
                        disabled={isSubscribed}
                        value={String(editingItem.data.x_profile || '')}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, x_profile: e.target.value } })}
                        placeholder="https://x.com/username or @username"
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
                        disabled={isSubscribed}
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
                        disabled={isSubscribed}
                        value={String(editingItem.data.country || '')}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          data: { ...editingItem.data, country: e.target.value }
                        })}
                      >
                        {countries.map((c) => (
                          <option key={c.id} value={c.displayed_country}>{c.displayed_country}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Company</label>
                      <select
                        disabled={isSubscribed}
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
                      <label>Status</label>
                      <select
                        value={editingItem.data.is_active !== false ? 'active' : 'inactive'}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, is_active: e.target.value === 'active' } })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </>
                )}

                {editingItem.table === 'dim_company' && (
                  <>
                    <div className="form-group">
                      <label>Company Name *</label>
                      <input
                        type="text"
                        required
                        disabled={isSubscribed}
                        value={String(editingItem.data.company || '')}
                        onChange={(e) => setEditingItem({
                          ...editingItem,
                          data: { ...editingItem.data, company: e.target.value }
                        })}
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
                  </>
                )}

                <div className="form-actions span-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {!isSubscribed && (
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        onClick={() => {
                          const itemVal = getItemValueString(editingItem.data);
                          const itemId = String(editingItem.data.id || '');
                          const itemTable = editingItem.table;
                          setEditingItem(null);
                          setDeleteConfirmModal({ table: itemTable, id: itemId, displayValue: itemVal });
                        }}
                      >
                        <Trash2 size={14} /> Delete Record
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Record (Confirm)</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MANAGE SUBSCRIPTIONS MODAL */}
      {isSubscribeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSubscribeModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} /> Manage Back Office Subscriptions
              </h3>
              <button type="button" className="btn-close" onClick={() => setIsSubscribeModalOpen(false)}><X size={18} /></button>
            </div>
            
            <div style={{ padding: '4px 0 16px 0' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Choose which default metadata scopes to subscribe to. Subscribed items automatically update in real-time when changed in Back Office.
              </p>

              {/* Option A: Subscribe All Toggle */}
              <div style={{ 
                background: subConfig.subscribeAll ? 'rgba(212, 168, 75, 0.15)' : 'var(--bg-surface-2)',
                border: subConfig.subscribeAll ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onClick={handleToggleSubscribeAll}
              >
                <div>
                  <div style={{ fontWeight: 700, color: subConfig.subscribeAll ? 'var(--accent-primary)' : 'var(--text-main)', fontSize: '0.95rem' }}>
                    🌐 Subscribe All Default Data
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Automatically subscribe to all available Back Office countries, companies, and groups.
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={subConfig.subscribeAll} 
                  onChange={handleToggleSubscribeAll} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Request 2: Always show options; highlight as selected when subscribeAll is true */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* By Country */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-main)' }}>Subscribe by Country</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availableSubCountries.map(cnt => {
                      const isChecked = subConfig.subscribeAll || subConfig.countries.includes(cnt);
                      return (
                        <button
                          key={cnt}
                          type="button"
                          className={`badge-pill ${isChecked ? 'gold-outline' : 'dark'}`}
                          style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem' }}
                          onClick={() => handleToggleSubCountry(cnt)}
                        >
                          {isChecked ? '✓ ' : '+ '} {cnt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* By Company */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-main)' }}>Subscribe by Company</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availableSubCompanies.map(comp => {
                      const isChecked = subConfig.subscribeAll || subConfig.companies.includes(comp);
                      return (
                        <button
                          key={comp}
                          type="button"
                          className={`badge-pill ${isChecked ? 'gold-outline' : 'dark'}`}
                          style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem' }}
                          onClick={() => handleToggleSubCompany(comp)}
                        >
                          {isChecked ? '✓ ' : '+ '} {comp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* By Group */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0 }}>Subscribe by Group</h4>
                    {availableSubGroups.length > 0 && (
                      <button
                        type="button"
                        className={`badge-pill ${isAllVisibleGroupsSelected ? 'gold-outline' : 'dark'}`}
                        style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.78rem' }}
                        onClick={handleToggleSelectAllGroups}
                      >
                        {isAllVisibleGroupsSelected ? '✓ Deselect All Groups' : '+ Select All Groups'}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                    {availableSubGroups.map(grp => {
                      const isChecked = subConfig.subscribeAll || subConfig.groups.includes(grp);
                      return (
                        <button
                          key={grp}
                          type="button"
                          className={`badge-pill ${isChecked ? 'gold-outline' : 'dark'}`}
                          style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem' }}
                          onClick={() => handleToggleSubGroup(grp)}
                        >
                          {isChecked ? '✓ ' : '+ '} {grp}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsSubscribeModalOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveSubscriptions}>
                  <Check size={14} /> Save Subscriptions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmModal(null)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--color-danger)' }}>Confirm Deletion</h2>
              <button type="button" className="btn-close" onClick={() => setDeleteConfirmModal(null)}><X size={18} /></button>
            </div>
            <p style={{ margin: '14px 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Are you sure you want to delete this custom <strong>{deleteConfirmModal.table.replace('dim_', '')}</strong> record?
            </p>

            <div style={{ 
              background: 'var(--bg-surface-2)', 
              padding: '10px 12px', 
              borderRadius: '6px', 
              fontSize: '0.85rem',
              marginBottom: '16px',
              border: '1px solid var(--border-subtle)'
            }}>
              <div><strong>Value:</strong> {deleteConfirmModal.displayValue}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>ID: {deleteConfirmModal.id}</div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmModal(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmDelete}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for complete theme alignment */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .modal-card {
          width: 100%;
          max-width: 620px;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 24px;
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }

        .modal-card.small {
          max-width: 450px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .btn-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .btn-close:hover {
          color: var(--text-main);
          background: var(--bg-surface-2);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .admin-page {
          padding: 24px;
          min-height: 100vh;
          max-width: 1600px;
          margin: 0 auto;
        }

        .tabs-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 12px;
          overflow-x: auto;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tab-btn:hover {
          background: var(--bg-surface-2);
          color: var(--text-main);
        }

        .tab-btn.active {
          background: rgba(212, 168, 75, 0.18);
          color: var(--accent-primary);
          border-color: var(--accent-primary);
          font-weight: 600;
        }

        .table-card {
          background-color: var(--bg-surface-1);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          padding: 15px;
        }

        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .tab-header h2 {
          margin: 0;
          font-size: 1.1rem;
          color: var(--text-main);
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
        }

        .dim-table th, .dim-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid var(--border-subtle);
        }

        .dim-table th {
          color: var(--text-muted);
          font-weight: 600;
          background-color: var(--bg-surface-2);
          white-space: nowrap;
        }

        .dim-table tr:hover td {
          background-color: rgba(255,255,255,0.02);
        }

        .btn {
          padding: 8px 16px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
          border: none;
        }

        .btn-primary {
          background-color: var(--accent-primary);
          color: #000000;
          font-weight: 700;
        }

        .btn-primary:hover {
          opacity: 0.9;
        }

        .btn-secondary {
          background-color: var(--bg-surface-2);
          color: var(--text-main);
          border: 1px solid var(--border-subtle);
        }

        .btn-secondary:hover {
          background-color: var(--bg-surface-3);
          border-color: var(--border-strong);
        }

        .btn-outline {
          background-color: transparent;
          color: var(--text-main);
          border: 1px solid var(--border-subtle);
        }

        .btn-outline:hover {
          border-color: var(--border-strong);
          background-color: var(--bg-surface-2);
        }

        .btn-outline.danger-text {
          color: #e74c3c;
          border-color: rgba(231, 76, 60, 0.4);
        }

        .btn-outline.danger-text:hover {
          background-color: rgba(231, 76, 60, 0.15);
        }

        .btn-danger {
          background-color: var(--color-danger);
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-danger:hover {
          opacity: 0.9;
        }

        .sortable-th {
          cursor: pointer;
          user-select: none;
        }
        .sortable-th:hover {
          color: var(--accent-primary);
        }

        .bold { font-weight: 700; color: var(--text-main); }
        .mono { font-family: monospace; font-size: 0.82rem; }

        .table-input, .table-select {
          width: 100%;
          background-color: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 6px 8px;
          color: var(--text-main);
          font-size: 0.85rem;
          outline: none;
        }
        .table-input:focus, .table-select:focus {
          border-color: var(--accent-primary);
        }
        .table-input.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .badge-pill {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-block;
        }

        .badge-pill.gold-outline {
          background-color: rgba(212, 168, 75, 0.15);
          color: var(--accent-primary);
          border: 1px solid var(--accent-primary);
        }

        .badge-pill.dark {
          background-color: var(--bg-surface-2);
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
        }

        .status-tag {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.76rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .status-tag.active {
          background: rgba(46, 204, 113, 0.18);
          color: #2ecc71;
          border: 1px solid rgba(46, 204, 113, 0.4);
        }

        .status-tag.sub {
          background: rgba(212, 168, 75, 0.2);
          color: var(--accent-primary);
          border: 1px solid rgba(212, 168, 75, 0.5);
        }

        .status-tag.inactive {
          background: rgba(231, 76, 60, 0.18);
          color: #e74c3c;
          border: 1px solid rgba(231, 76, 60, 0.4);
        }

        .status-tag:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .action-btns {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-icon {
          background: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          cursor: pointer;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .btn-icon:hover:not(:disabled) {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .btn-icon.danger:hover:not(:disabled) {
          color: #e74c3c;
          background: rgba(231, 76, 60, 0.15);
          border-color: rgba(231, 76, 60, 0.4);
        }

        .btn-icon:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .x-link {
          color: var(--accent-primary);
          text-decoration: none;
        }
        .x-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
