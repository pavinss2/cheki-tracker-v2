'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { CircularSpinner } from '@/components/common/CircularSpinner';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Download, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Search, 
  X,
  Award,
  FolderOpen
} from 'lucide-react';
import { toJpeg, toPng } from 'html-to-image';

interface Tier {
  id: string;
  label: string;
  color: string;
  memberIds: string[];
}

interface SavedSetup {
  id: string;
  name: string;
  savedAt: string;
  tiers: Tier[];
}

const PRESET_COLORS = [
  { name: 'Red', hex: '#ff4757' },
  { name: 'Orange', hex: '#ffa502' },
  { name: 'Yellow', hex: '#eccc68' },
  { name: 'Green', hex: '#2ed573' },
  { name: 'Cyan', hex: '#00d2d3' },
  { name: 'Blue', hex: '#1e90ff' },
  { name: 'Purple', hex: '#a55eea' },
  { name: 'Pink', hex: '#ff6b81' },
  { name: 'Slate', hex: '#747d8c' },
];

const DEFAULT_TIERS: Tier[] = [
  { id: 'tier-s', label: 'S', color: '#ff4757', memberIds: [] },
  { id: 'tier-a', label: 'A', color: '#ffa502', memberIds: [] },
  { id: 'tier-b', label: 'B', color: '#eccc68', memberIds: [] },
  { id: 'tier-c', label: 'C', color: '#2ed573', memberIds: [] },
  { id: 'tier-d', label: 'D', color: '#1e90ff', memberIds: [] },
];

const LOCAL_SETUPS_KEY = 'cheki_tiermaker_saved_setups_v2';

export default function TierMakerPage() {
  const { user, isDemoUser } = useAuth();
  const { members, colors, loading } = useChekiData();

  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null);
  const [activeTierMember, setActiveTierMember] = useState<{ tierId: string; memberName: string } | null>(null);
  const [draggedMemberName, setDraggedMemberName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [editingTier, setEditingTier] = useState<{ id: string; label: string; color: string } | null>(null);
  
  // Saved Setups Management
  const [savedSetups, setSavedSetups] = useState<SavedSetup[]>([]);
  const [activeSetupId, setActiveSetupId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [setupNameInput, setSetupNameInput] = useState('');
  
  const [isExporting, setIsExporting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);

  // Filter out inactive members
  const activeMembers = useMemo(() => {
    return members.filter((m) => m.is_active !== false);
  }, [members]);

  // Options for Group & Company filters
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    activeMembers.forEach((m) => {
      if (m.group && m.group.trim()) set.add(m.group.trim());
    });
    return Array.from(set).sort();
  }, [activeMembers]);

  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    activeMembers.forEach((m) => {
      if (m.company && m.company.trim()) set.add(m.company.trim());
    });
    return Array.from(set).sort();
  }, [activeMembers]);

  // Load saved configurations from localStorage on initial render
  useEffect(() => {
    try {
      const savedStr = localStorage.getItem(LOCAL_SETUPS_KEY);
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        if (Array.isArray(parsed)) {
          setSavedSetups(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load saved tier setups:", err);
    }
  }, []);

  // Map for fast member lookup (active members only)
  const memberMap = useMemo(() => {
    const map: Record<string, typeof activeMembers[0]> = {};
    activeMembers.forEach((m) => {
      map[m.member_name] = m;
    });
    return map;
  }, [activeMembers]);

  // Color code map for member avatars
  const colorHexMap = useMemo(() => {
    const map: Record<string, string> = {};
    colors.forEach((c) => {
      map[c.color] = c.color_code;
    });
    return map;
  }, [colors]);

  // Set of member names placed in any tier
  const placedMemberNames = useMemo(() => {
    const set = new Set<string>();
    tiers.forEach((t) => {
      t.memberIds.forEach((mName) => set.add(mName));
    });
    return set;
  }, [tiers]);

  // Unassigned pool of active members with group/company/search filters
  const unassignedMembers = useMemo(() => {
    return activeMembers.filter((m) => {
      if (placedMemberNames.has(m.member_name)) return false;
      if (selectedGroup && m.group !== selectedGroup) return false;
      if (selectedCompany && m.company !== selectedCompany) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.member_name.toLowerCase().includes(q) ||
          (m.group && m.group.toLowerCase().includes(q)) ||
          (m.company && m.company.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeMembers, placedMemberNames, selectedGroup, selectedCompany, searchQuery]);

  // Move member into a target tier (or remove if targetTierId is null)
  const moveMemberToTier = (memberName: string, targetTierId: string | null) => {
    setTiers((prevTiers) => {
      return prevTiers.map((tier) => {
        const filtered = tier.memberIds.filter((m) => m !== memberName);
        if (tier.id === targetTierId) {
          return { ...tier, memberIds: [...filtered, memberName] };
        }
        return { ...tier, memberIds: filtered };
      });
    });
    setSelectedMemberName(null);
  };

  // Add a new tier (max 7 tiers)
  const handleAddTier = () => {
    if (tiers.length >= 7) {
      alert("Maximum limit of 7 tiers reached.");
      return;
    }

    const unusedColor = PRESET_COLORS[tiers.length % PRESET_COLORS.length].hex;
    const newTier: Tier = {
      id: `tier-custom-${Date.now()}`,
      label: `TIER ${tiers.length + 1}`,
      color: unusedColor,
      memberIds: [],
    };
    setTiers([...tiers, newTier]);
  };

  // Delete a tier (returns its members back to pool)
  const handleDeleteTier = (tierId: string) => {
    if (tiers.length <= 1) {
      alert("At least one tier must remain on the board.");
      return;
    }
    setTiers(tiers.filter((t) => t.id !== tierId));
  };

  // Move tier row up/down
  const handleMoveTier = (index: number, direction: 'up' | 'down') => {
    const newTiers = [...tiers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTiers.length) return;

    const temp = newTiers[index];
    newTiers[index] = newTiers[targetIndex];
    newTiers[targetIndex] = temp;
    setTiers(newTiers);
  };

  // Open Save Setup Modal
  const handleOpenSaveModal = () => {
    const activeSetup = savedSetups.find(s => s.id === activeSetupId);
    setSetupNameInput(activeSetup ? activeSetup.name : `My Tier List ${savedSetups.length + 1}`);
    setShowSaveModal(true);
  };

  // Save current tier layout as a named setup
  const handleConfirmSaveSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = setupNameInput.trim();
    if (!name) return;

    const todayDateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    let updatedSetups: SavedSetup[];
    let targetId = activeSetupId;

    const existingIndex = savedSetups.findIndex(s => s.id === activeSetupId || s.name.toLowerCase() === name.toLowerCase());

    if (existingIndex >= 0) {
      // Overwrite existing setup
      targetId = savedSetups[existingIndex].id;
      updatedSetups = savedSetups.map((s, idx) => 
        idx === existingIndex ? { ...s, name, savedAt: todayDateStr, tiers } : s
      );
    } else {
      // Create new saved setup
      targetId = `setup_${Date.now()}`;
      const newSetup: SavedSetup = {
        id: targetId,
        name,
        savedAt: todayDateStr,
        tiers,
      };
      updatedSetups = [newSetup, ...savedSetups];
    }

    setSavedSetups(updatedSetups);
    setActiveSetupId(targetId);
    try {
      localStorage.setItem(LOCAL_SETUPS_KEY, JSON.stringify(updatedSetups));
    } catch (err) {
      console.error("Failed persisting saved setups:", err);
    }

    setShowSaveModal(false);
    setSaveSuccessMsg(`Saved setup "${name}"!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Load a selected saved setup
  const handleSelectSavedSetup = (setupId: string) => {
    if (!setupId) {
      setActiveSetupId(null);
      return;
    }
    const target = savedSetups.find(s => s.id === setupId);
    if (target) {
      setTiers(target.tiers);
      setActiveSetupId(target.id);
      setSaveSuccessMsg(`Loaded setup "${target.name}"!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Delete an existing saved setup
  const handleDeleteSavedSetup = (setupId: string) => {
    const target = savedSetups.find(s => s.id === setupId);
    if (!target) return;
    if (!confirm(`Are you sure you want to delete the saved setup "${target.name}"?`)) return;

    const updated = savedSetups.filter(s => s.id !== setupId);
    setSavedSetups(updated);
    if (activeSetupId === setupId) setActiveSetupId(null);

    try {
      localStorage.setItem(LOCAL_SETUPS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed saving updated setups:", err);
    }
  };

  // Reset to default 5 tiers (S-A-B-C-D) and unassign all members
  const handleResetTiers = () => {
    if (!confirm("Are you sure you want to reset all tiers to default S-A-B-C-D? This will clear current placements.")) return;
    setTiers(DEFAULT_TIERS);
    setSelectedMemberName(null);
    setActiveSetupId(null);
  };

  // Save edit tier name & color
  const handleSaveTierEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier || !editingTier.label.trim()) return;

    setTiers(tiers.map((t) => (t.id === editingTier.id ? { ...t, label: editingTier.label.trim().toUpperCase(), color: editingTier.color } : t)));
    setEditingTier(null);
  };

  // Export board as JPG image
  const handleExportJpg = async () => {
    if (!boardRef.current) return;
    setIsExporting(true);

    try {
      await new Promise((r) => setTimeout(r, 150));

      const options = {
        quality: 0.95,
        backgroundColor: '#0d0f15',
        cacheBust: false,
        skipFonts: true,
        imagePlaceholder: 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><rect width="44" height="44" fill="%23202433"/></svg>',
      };

      let dataUrl: string;
      try {
        dataUrl = await toJpeg(boardRef.current, options);
      } catch (err) {
        console.warn("toJpeg failed, attempting toPng fallback:", err);
        dataUrl = await toPng(boardRef.current, options);
      }

      const link = document.createElement('a');
      const todayStr = new Date().toISOString().split('T')[0];
      link.download = `cheki-tier-maker-${todayStr}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export error:", err);
      const errMsg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'type' in err ? `Image element load error (${(err as Event).type})` : String(err));
      alert("Failed exporting image: " + errMsg);
    } finally {
      setIsExporting(false);
    }
  };

  if (!user && !isDemoUser) return <LoginPrompt />;
  if (loading) return <CircularSpinner />;

  const activeSetupObj = savedSetups.find(s => s.id === activeSetupId);

  return (
    <div className="tier-maker-page">
      {/* Action Header Bar */}
      <div className="tier-actions-bar card" style={{ padding: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} style={{ color: 'var(--accent-primary)' }} /> Tier Maker
          </h2>
          <span className="badge-pill dark" style={{ fontSize: '0.78rem' }}>{tiers.length} / 7 Tiers</span>
          {activeSetupObj && (
            <span className="badge-pill gold-outline" style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <FolderOpen size={12} /> {activeSetupObj.name}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Saved Setups Selector */}
          {savedSetups.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select 
                className="table-select" 
                style={{ height: '32px', padding: '4px 8px', fontSize: '0.82rem', width: 'auto', maxWidth: '180px' }}
                value={activeSetupId || ''} 
                onChange={(e) => handleSelectSavedSetup(e.target.value)}
              >
                <option value="">-- Load Saved Setup --</option>
                {savedSetups.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.savedAt})</option>
                ))}
              </select>

              {activeSetupId && (
                <button 
                  className="btn-icon danger" 
                  onClick={() => handleDeleteSavedSetup(activeSetupId)} 
                  title="Delete current saved setup"
                  style={{ padding: '4px' }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleAddTier} 
            disabled={tiers.length >= 7}
            title={tiers.length >= 7 ? 'Maximum limit of 7 tiers reached' : 'Add a new tier row'}
          >
            <Plus size={14} /> Add Tier
          </button>

          <button className="btn btn-secondary btn-sm" onClick={handleOpenSaveModal} title="Save current setup with a custom name">
            <Save size={14} /> Save As...
          </button>

          <button className="btn btn-secondary btn-sm danger-text" onClick={handleResetTiers} title="Reset to default S-A-B-C-D tiers">
            <RotateCcw size={14} /> Reset
          </button>

          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleExportJpg} 
            disabled={isExporting}
            style={{ marginLeft: '6px' }}
            title="Download Tier List as high resolution JPG image"
          >
            <Download size={14} /> {isExporting ? 'Exporting...' : 'Export as JPG'}
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="success-toast">
          <Check size={16} /> {saveSuccessMsg}
        </div>
      )}

      {/* Main Board Container (Captured for JPG export) */}
      <div className="table-card card" style={{ padding: '15px' }}>
        <div ref={boardRef} className="tier-board-container" onClick={() => setActiveTierMember(null)}>
          <div className="board-watermark">CHEKI TRACKER • TIER LIST</div>

          {tiers.map((tier, index) => {
            const isTargeted = selectedMemberName !== null;

            return (
              <div 
                key={tier.id} 
                className={`tier-row ${draggedMemberName ? 'drag-active' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedMemberName) {
                    moveMemberToTier(draggedMemberName, tier.id);
                    setDraggedMemberName(null);
                  }
                }}
                onClick={() => {
                  if (selectedMemberName) {
                    moveMemberToTier(selectedMemberName, tier.id);
                  }
                }}
              >
                {/* Clean Tier Label Box (Double click to edit label/color) */}
                <div 
                  className="tier-label-box" 
                  style={{ backgroundColor: tier.color, color: '#0d0f15', cursor: 'pointer' }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingTier({ id: tier.id, label: tier.label, color: tier.color });
                  }}
                  title="Double-click to edit tier label & color"
                >
                  <span className="tier-name-text">{tier.label}</span>
                </div>

                {/* Tier Content Drop Area (Clean, No Empty Text Hint) */}
                <div className={`tier-content-area ${isTargeted ? 'clickable-target' : ''}`}>
                  <div className="tier-members-grid">
                    {tier.memberIds.map((mName) => {
                      const mObj = memberMap[mName];
                      const colorCode = mObj ? colorHexMap[mObj.color] : undefined;
                      const isSelectedInTier = activeTierMember?.tierId === tier.id && activeTierMember?.memberName === mName;

                      return (
                        <div 
                          key={mName} 
                          className={`tier-member-card ${isSelectedInTier ? 'selected' : ''}`}
                          draggable
                          onDragStart={() => setDraggedMemberName(mName)}
                          onDragEnd={() => setDraggedMemberName(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTierMember(isSelectedInTier ? null : { tierId: tier.id, memberName: mName });
                          }}
                          title={isSelectedInTier ? `Tap X to remove ${mName}` : `Click to select ${mName}`}
                        >
                          <MemberAvatar 
                            src={mObj?.member_image} 
                            name={mName} 
                            size={44} 
                            colorHex={colorCode}
                          />
                          <span className="tier-member-name">{mName}</span>
                          {isSelectedInTier && (
                            <button 
                              className="remove-card-btn" 
                              title={`Remove ${mName} from tier`}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveMemberToTier(mName, null);
                                setActiveTierMember(null);
                              }}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tier Controls (Edit / Up / Down / Delete) */}
                <div className="tier-row-controls">
                  <button 
                    className="tier-control-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTier({ id: tier.id, label: tier.label, color: tier.color });
                    }}
                    title="Edit Tier Label & Color"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    className="tier-control-btn" 
                    disabled={index === 0} 
                    onClick={(e) => { e.stopPropagation(); handleMoveTier(index, 'up'); }}
                    title="Move Tier Up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button 
                    className="tier-control-btn" 
                    disabled={index === tiers.length - 1} 
                    onClick={(e) => { e.stopPropagation(); handleMoveTier(index, 'down'); }}
                    title="Move Tier Down"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button 
                    className="tier-control-btn danger" 
                    onClick={(e) => { e.stopPropagation(); handleDeleteTier(tier.id); }}
                    title="Delete Tier Row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned Members Pool */}
      <div className="table-card card" style={{ padding: '15px', marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>
              Unassigned Members ({unassignedMembers.length})
            </h3>
            {selectedMemberName && (
              <span className="badge-pill gold-outline" style={{ fontSize: '0.78rem' }}>
                Selected: <strong>{selectedMemberName}</strong> (Click any tier above to place)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Group Filter */}
            <select 
              className="table-select" 
              style={{ height: '34px', fontSize: '0.82rem', padding: '4px 8px', width: 'auto' }}
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">All Groups</option>
              {groupOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Company Filter */}
            <select 
              className="table-select" 
              style={{ height: '34px', fontSize: '0.82rem', padding: '4px 8px', width: 'auto' }}
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value="">All Companies</option>
              {companyOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '160px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '30px', height: '34px', fontSize: '0.84rem' }}
              />
            </div>
          </div>
        </div>

        {/* Pool Grid */}
        <div 
          className="pool-container"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedMemberName) {
              moveMemberToTier(draggedMemberName, null);
              setDraggedMemberName(null);
            }
          }}
        >
          {unassignedMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {searchQuery ? 'No members found matching search query.' : '✨ All members have been assigned to tiers!'}
            </div>
          ) : (
            <div className="pool-grid">
              {unassignedMembers.map((m) => {
                const colorCode = colorHexMap[m.color];
                const isSelected = selectedMemberName === m.member_name;

                return (
                  <div 
                    key={m.id}
                    className={`pool-member-card ${isSelected ? 'selected' : ''}`}
                    draggable
                    onDragStart={() => setDraggedMemberName(m.member_name)}
                    onDragEnd={() => setDraggedMemberName(null)}
                    onClick={() => {
                      setSelectedMemberName(isSelected ? null : m.member_name);
                    }}
                    title="Drag into tier or tap to select & assign tier"
                  >
                    <MemberAvatar 
                      src={m.member_image} 
                      name={m.member_name} 
                      size={44} 
                      colorHex={colorCode}
                    />
                    <div className="pool-member-info">
                      <span className="pool-member-name">{m.member_name}</span>
                      <span className="pool-member-group">{m.group || m.company}</span>
                    </div>

                    {/* Mobile & Shortcut Tier Assignment Option */}
                    {isSelected && (
                      <div className="tier-shortcut-options" onClick={(e) => e.stopPropagation()}>
                        <span className="shortcut-hint">Assign to:</span>
                        {tiers.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="tier-shortcut-btn"
                            style={{
                              backgroundColor: t.color,
                              color: '#0d0f15',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveMemberToTier(m.member_name, t.id);
                            }}
                            title={`Assign ${m.member_name} to Tier ${t.label}`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Save Setup Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Save Setup As...</h2>
              <button className="btn-close" onClick={() => setShowSaveModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleConfirmSaveSetup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Setup Name *</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  maxLength={30}
                  value={setupNameInput} 
                  onChange={(e) => setSetupNameInput(e.target.value)}
                  placeholder="e.g. My Oshi Tier 2026, Best Live Outfits"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Setup</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tier Edit Modal */}
      {editingTier && (
        <div className="modal-overlay" onClick={() => setEditingTier(null)}>
          <div className="modal-card small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Tier Row</h2>
              <button className="btn-close" onClick={() => setEditingTier(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveTierEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Tier Name / Label *</label>
                <input 
                  type="text" 
                  required
                  maxLength={12}
                  value={editingTier.label} 
                  onChange={(e) => setEditingTier({ ...editingTier, label: e.target.value })}
                  placeholder="e.g. S, S+, GOD, S-TIER"
                />
              </div>

              <div className="form-group">
                <label>Tier Color</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', margin: '6px 0' }}>
                  {PRESET_COLORS.map((c) => {
                    const isSelected = editingTier.color === c.hex;
                    return (
                      <button 
                        key={c.hex} 
                        type="button" 
                        onClick={() => setEditingTier({ ...editingTier, color: c.hex })}
                        style={{
                          backgroundColor: c.hex,
                          height: '32px',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {isSelected && <Check size={14} style={{ color: '#000' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTier(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .tier-maker-page {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
          max-width: 100%;
          min-width: 0;
        }

        .success-toast {
          background: rgba(39, 174, 96, 0.15);
          color: var(--color-success);
          border: 1px solid rgba(39, 174, 96, 0.3);
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 0.85rem;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tier-board-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: #0d0f15;
          padding: 12px;
          border-radius: 8px;
          position: relative;
          min-height: 240px;
        }

        .board-watermark {
          position: absolute;
          bottom: 6px;
          right: 12px;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.15);
          pointer-events: none;
        }

        .tier-row {
          display: flex;
          align-items: stretch;
          background: #161922;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 6px;
          min-height: 72px;
          overflow: hidden;
          transition: border-color 0.15s;
        }

        .tier-row.drag-active {
          border-color: rgba(212, 168, 75, 0.4);
        }

        .tier-label-box {
          width: 85px;
          min-width: 85px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px;
          position: relative;
          user-select: none;
        }

        .tier-name-text {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-align: center;
          word-break: break-word;
          line-height: 1.1;
        }

        .tier-content-area {
          flex: 1;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          background: rgba(0,0,0,0.2);
          min-height: 72px;
          overflow-x: auto;
        }

        .tier-content-area.clickable-target {
          cursor: pointer;
        }
        .tier-content-area.clickable-target:hover {
          background: rgba(212, 168, 75, 0.08);
        }

        .tier-members-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          width: 100%;
          min-height: 52px;
        }

        .tier-member-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #1c202b;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 6px 8px 4px 8px;
          position: relative;
          cursor: grab;
          transition: transform 0.12s, border-color 0.12s;
          user-select: none;
          min-width: 60px;
        }

        .tier-member-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary);
        }

        .tier-member-name {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-main);
          margin-top: 4px;
          text-align: center;
          max-width: 64px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remove-card-btn {
          display: flex;
          position: absolute;
          top: -5px;
          right: -5px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--color-danger, #ef4444);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.4);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: transform 0.1s, background-color 0.1s;
        }

        .remove-card-btn:hover {
          transform: scale(1.15);
          background: #dc2626;
        }

        .tier-row-controls {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
          padding: 4px;
          background: #11141c;
          border-left: 1px solid rgba(255,255,255,0.05);
        }

        .tier-control-btn {
          background: none;
          border: none;
          color: var(--text-subtle);
          padding: 3px 5px;
          border-radius: 4px;
          cursor: pointer;
        }
        .tier-control-btn:hover {
          color: var(--text-main);
          background: rgba(255,255,255,0.08);
        }
        .tier-control-btn.danger:hover {
          color: var(--color-danger, #ef4444);
        }
        .tier-control-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .pool-container {
          min-height: 120px;
          background: var(--bg-surface-2);
          border: 1px dashed var(--border-subtle);
          border-radius: 6px;
          padding: 12px;
        }

        .pool-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .pool-member-card {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 6px 10px;
          cursor: grab;
          user-select: none;
          transition: border-color 0.15s, background-color 0.15s;
        }

        .pool-member-card:hover {
          border-color: var(--accent-primary);
          background: var(--bg-surface-3);
        }

        .pool-member-card.selected {
          border-color: var(--accent-primary);
          background: var(--accent-primary-subtle);
        }

        .pool-member-info {
          display: flex;
          flex-direction: column;
        }

        .pool-member-name {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .pool-member-group {
          font-size: 0.72rem;
          color: var(--text-subtle);
        }

        .tier-shortcut-options {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
          padding-left: 8px;
          flex-wrap: wrap;
        }

        .shortcut-hint {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-subtle);
          margin-right: 2px;
        }

        .tier-shortcut-btn {
          border: none;
          border-radius: 5px;
          font-weight: 800;
          font-size: 0.78rem;
          padding: 4px 8px;
          min-width: 28px;
          height: 28px;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          transition: transform 0.1s, filter 0.1s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .tier-shortcut-btn:hover {
          filter: brightness(1.18);
        }

        .tier-shortcut-btn:active {
          transform: scale(0.92);
        }

        @media (max-width: 768px) {
          .tier-label-box {
            width: 60px !important;
            min-width: 60px !important;
            padding: 4px 2px !important;
          }

          .tier-name-text {
            font-size: 1.1rem !important;
          }

          .pool-member-card {
            width: 100%;
            justify-content: flex-start;
            padding: 10px 12px !important;
          }

          .pool-member-card.selected {
            flex-wrap: wrap;
            padding-bottom: 10px !important;
          }

          .tier-shortcut-options {
            width: 100%;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255,255,255,0.1);
            justify-content: flex-start;
            margin-left: 0;
            padding-left: 0;
          }
        }

        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px;
        }

        .modal-card {
          background: var(--bg-surface-1); border: 1px solid var(--border-strong); border-radius: var(--radius-md); padding: 24px; width: 100%; max-width: 580px;
        }
        .modal-card.small {
          max-width: 380px;
        }

        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .btn-close { background: none; border: none; color: var(--text-muted); cursor: pointer; }

        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
        .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
      `}</style>
    </div>
  );
}
