'use client';

import React, { useState } from 'react';
import { useChekiData } from '@/hooks/useChekiData';
import { addMetadataDoc, updateMetadataDoc, deleteMetadataDoc, getAdminLogs, seedUserDataToFirestore } from '@/lib/dataStore';
import { useAuth } from '@/context/AuthContext';
import { LoginPrompt } from '@/components/layout/LoginPrompt';
import { Plus, Edit2, Trash2, Shield, Users, Building, Flag, Palette, Layers, Tag, X, Database } from 'lucide-react';

export default function BackOfficePage() {
  const { user, isDemoUser } = useAuth();
  const { members, companies, groups, colors, types, countries, userId, loading } = useChekiData();

  const [activeTab, setActiveTab] = useState<'members' | 'groups' | 'companies' | 'colors' | 'types' | 'countries' | 'logs'>('members');
  const [editingItem, setEditingItem] = useState<{ table: string; data: Record<string, unknown> } | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Quick inline new option modal for creating missing choices on the fly
  const [inlineNewModal, setInlineNewModal] = useState<{ table: string; fieldKey: string; name: string } | null>(null);

  const logs = getAdminLogs(userId);

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { table, data } = editingItem;
    const docId = data.id as string | undefined;

    try {
      if (docId) {
        const { id: _i, ...rest } = data;
        await updateMetadataDoc(table, docId, userId, rest, isDemoUser);
      } else {
        await addMetadataDoc(table, userId, data, isDemoUser);
      }
      setEditingItem(null);
    } catch (err) {
      console.error("Save doc failed:", err);
    }
  };

  const handleCreateInlineChoice = async () => {
    if (!inlineNewModal || !inlineNewModal.name.trim()) return;
    const { table, fieldKey, name } = inlineNewModal;

    try {
      if (table === 'dim_company') await addMetadataDoc('dim_company', userId, { company: name.trim() }, isDemoUser);
      if (table === 'dim_group') await addMetadataDoc('dim_group', userId, { group: name.trim(), country: '🇹🇭 TH', company: 'Individual' }, isDemoUser);
      if (table === 'dim_color') await addMetadataDoc('dim_color', userId, { color: name.trim(), color_code: '#ffffff' }, isDemoUser);
      if (table === 'dim_country') await addMetadataDoc('dim_country', userId, { country: name.trim(), displayed_country: name.trim() }, isDemoUser);

      // Auto-select in current editing item
      if (editingItem) {
        setEditingItem({
          ...editingItem,
          data: { ...editingItem.data, [fieldKey]: name.trim() },
        });
      }

      setInlineNewModal(null);
    } catch (err) {
      console.error("Failed creating inline choice:", err);
    }
  };

  const handleDeleteDoc = async (table: string, id: string) => {
    if (confirm(`Delete this item from ${table}?`)) {
      await deleteMetadataDoc(table, id, userId, isDemoUser);
    }
  };

  if (!user && !isDemoUser) return <LoginPrompt />;
  if (loading) return <div className="loading-state">Loading Back Office Manager...</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Back Office</h1>
        </div>
      </div>

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
        <button className={`tab-btn ${activeTab === 'colors' ? 'active' : ''}`} onClick={() => setActiveTab('colors')}>
          <Palette size={16} /> Colors ({colors.length})
        </button>
        <button className={`tab-btn ${activeTab === 'types' ? 'active' : ''}`} onClick={() => setActiveTab('types')}>
          <Tag size={16} /> Types ({types.length})
        </button>
        <button className={`tab-btn ${activeTab === 'countries' ? 'active' : ''}`} onClick={() => setActiveTab('countries')}>
          <Flag size={16} /> Countries ({countries.length})
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
            <div className="tab-header">
              <h2>dim_member</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setEditingItem({ table: 'dim_member', data: { member_name: '', color: 'White', group: '', country: '🇹🇭 TH', company: 'Individual', is_active: true } })}>
                <Plus size={14} /> Add Member
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Member Name</th>
                  <th>Color</th>
                  <th>Group</th>
                  <th>Country</th>
                  <th>Company</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.member_image && m.member_image !== 'None' ? (
                        // eslint-disable-next-next/no-img-element
                        <img src={m.member_image} alt={m.member_name} className="avatar-img" />
                      ) : (
                        <div className="avatar-placeholder">{m.member_name.substring(0, 1)}</div>
                      )}
                    </td>
                    <td><strong>{m.member_name}</strong></td>
                    <td>{m.color}</td>
                    <td>{m.group}</td>
                    <td>{m.country}</td>
                    <td>{m.company}</td>
                    <td>{m.is_active ? <span className="status-badge active">Active</span> : <span className="status-badge">Inactive</span>}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_member', data: { ...m } })}><Edit2 size={15} /></button>
                        <button className="btn-icon danger" onClick={() => handleDeleteDoc('dim_member', m.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <div>
            <div className="tab-header">
              <h2>dim_group</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setEditingItem({ table: 'dim_group', data: { group: '', country: '🇹🇭 TH', company: 'Individual' } })}>
                <Plus size={14} /> Add Group
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Group Name</th>
                  <th>Country</th>
                  <th>Company</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td><strong>{g.group}</strong></td>
                    <td>{g.country}</td>
                    <td>{g.company}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_group', data: { ...g } })}><Edit2 size={15} /></button>
                        <button className="btn-icon danger" onClick={() => handleDeleteDoc('dim_group', g.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* COMPANIES TAB */}
        {activeTab === 'companies' && (
          <div>
            <div className="tab-header">
              <h2>dim_company</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setEditingItem({ table: 'dim_company', data: { company: '' } })}>
                <Plus size={14} /> Add Company
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.company}</strong></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_company', data: { ...c } })}><Edit2 size={15} /></button>
                        <button className="btn-icon danger" onClick={() => handleDeleteDoc('dim_company', c.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* COLORS TAB */}
        {activeTab === 'colors' && (
          <div>
            <div className="tab-header">
              <h2>dim_color</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setEditingItem({ table: 'dim_color', data: { color: '', color_code: '#ffffff' } })}>
                <Plus size={14} /> Add Color
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Color Name</th>
                  <th>Color Hex Code</th>
                  <th>Preview</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {colors.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.color}</strong></td>
                    <td><code>{c.color_code}</code></td>
                    <td><div className="color-swatch" style={{ backgroundColor: c.color_code }} /></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_color', data: { ...c } })}><Edit2 size={15} /></button>
                        <button className="btn-icon danger" onClick={() => handleDeleteDoc('dim_color', c.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TYPES TAB */}
        {activeTab === 'types' && (
          <div>
            <div className="tab-header">
              <h2>dim_type</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setEditingItem({ table: 'dim_type', data: { type: '' } })}>
                <Plus size={14} /> Add Type
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Type Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.type}</strong></td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_type', data: { ...t } })}><Edit2 size={15} /></button>
                        <button className="btn-icon danger" onClick={() => handleDeleteDoc('dim_type', t.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* COUNTRIES TAB */}
        {activeTab === 'countries' && (
          <div>
            <div className="tab-header">
              <h2>dim_country</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setEditingItem({ table: 'dim_country', data: { country: '', displayed_country: '' } })}>
                <Plus size={14} /> Add Country
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Country Name</th>
                  <th>Display Code & Emoji</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.country}</strong></td>
                    <td>{c.displayed_country}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setEditingItem({ table: 'dim_country', data: { ...c } })}><Edit2 size={15} /></button>
                        <button className="btn-icon danger" onClick={() => handleDeleteDoc('dim_country', c.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div>
            <div className="tab-header">
              <h2>fact_admin_log</h2>
            </div>
            <table>
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
                    <td>{l.actionDetail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Structured Edit Form Modal with Predefined Dropdowns & Create New Option */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem.data.id ? 'Edit' : 'Add New'} {editingItem.table} Record</h2>
              <button className="btn-close" onClick={() => setEditingItem(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveDoc} className="form-grid">
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
                          setEditingItem({ ...editingItem, data: { ...editingItem.data, group: e.target.value } });
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
                        <option key={c.id} value={c.displayed_country}>{c.displayed_country} ({c.country})</option>
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

                  <div className="form-group span-2">
                    <label>Member Avatar Image URL</label>
                    <input
                      type="url"
                      value={String(editingItem.data.member_image || '')}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, member_image: e.target.value } })}
                      placeholder="https://..."
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
                Object.keys(editingItem.data).filter(k => k !== 'id' && k !== 'userId' && k !== 'updatedAt').map((key) => (
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
                <button type="submit" className="btn btn-primary">Save Record</button>
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
            <div className="form-group">
              <label>Name / Value</label>
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
              <button type="button" className="btn btn-primary" onClick={handleCreateInlineChoice}>Add Choice</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-page { display: flex; flex-direction: column; gap: 20px; }
        .page-title { font-size: 1.6rem; }
        .page-subtitle { color: var(--text-muted); font-size: 0.88rem; margin-top: -12px; }

        .tabs-bar { display: flex; gap: 8px; flex-wrap: wrap; }
        .tab-btn {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: var(--bg-surface-1); border: 1px solid var(--border-subtle); color: var(--text-muted); border-radius: var(--radius-sm); font-weight: 500; font-size: 0.85rem; cursor: pointer;
          &.active { background: var(--accent-primary-subtle); color: var(--accent-primary); border-color: rgba(212, 168, 75, 0.4); font-weight: 600; }
        }

        .tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }

        .avatar-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .avatar-placeholder { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-surface-3); display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .status-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; background: var(--bg-surface-3); color: var(--text-subtle); &.active { background: rgba(16, 185, 129, 0.15); color: var(--color-success); } }
        .color-swatch { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); }
        .log-badge { background: var(--bg-surface-3); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-family: monospace; color: var(--accent-blue); }

        .action-btns { display: flex; gap: 6px; }
        .btn-icon { background: none; border: none; color: var(--text-muted); cursor: pointer; &:hover { color: var(--accent-primary); } &.danger:hover { color: var(--color-danger); } }

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
