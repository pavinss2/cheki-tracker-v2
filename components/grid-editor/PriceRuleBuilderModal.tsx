'use client';

import React, { useState } from 'react';
import { PriceRule } from '@/types/cheki';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Check } from 'lucide-react';

interface PriceRuleBuilderModalProps {
  rules: PriceRule[];
  onSave: (rules: PriceRule[]) => void;
  onClose: () => void;
}

export const PriceRuleBuilderModal: React.FC<PriceRuleBuilderModalProps> = ({
  rules,
  onSave,
  onClose,
}) => {
  const [ruleList, setRuleList] = useState<PriceRule[]>([...rules]);

  const handleAddRule = () => {
    const newRule: PriceRule = {
      id: 'rule_' + Date.now(),
      name: 'New Price Rule',
      conditions: [{ field: 'type', operator: 'equals', value: 'Cheki' }],
      price: 300,
      priority: ruleList.length + 1,
      enabled: true,
    };
    setRuleList([...ruleList, newRule]);
  };

  const handleRemoveRule = (id: string) => {
    setRuleList(ruleList.filter(r => r.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const nextIdx = direction === 'up' ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= ruleList.length) return;
    const copy = [...ruleList];
    const temp = copy[index];
    copy[index] = copy[nextIdx];
    copy[nextIdx] = temp;

    // re-assign priority
    copy.forEach((r, idx) => r.priority = idx + 1);
    setRuleList(copy);
  };

  const handleConditionChange = (
    ruleId: string,
    field: 'type' | 'country' | 'group' | 'location' | 'member' | 'company',
    value: string
  ) => {
    setRuleList(ruleList.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          conditions: [{ field, operator: 'equals', value }],
        };
      }
      return r;
    }));
  };

  const handlePriceChange = (ruleId: string, price: number) => {
    setRuleList(ruleList.map(r => r.id === ruleId ? { ...r, price } : r));
  };

  const handleNameChange = (ruleId: string, name: string) => {
    setRuleList(ruleList.map(r => r.id === ruleId ? { ...r, name } : r));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Price Rule Builder (UI-driven IFS Logic)</h2>
            <p className="modal-sub">Rules evaluate from top to bottom. The first matching rule sets Total Price.</p>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="rules-list">
          {ruleList.map((rule, idx) => {
            const isCatchAll = rule.conditions.length === 0 || rule.id === 'rule_default';
            const cond = rule.conditions[0] || { field: 'type', value: '' };

            return (
              <div key={rule.id} className="rule-card">
                <div className="rule-rank">{idx + 1}</div>

                <div className="rule-fields">
                  <input
                    type="text"
                    className="rule-name"
                    value={rule.name}
                    onChange={(e) => handleNameChange(rule.id, e.target.value)}
                    placeholder="Rule Name"
                  />

                  {!isCatchAll ? (
                    <div className="rule-if">
                      <span>IF</span>
                      <select
                        value={cond.field}
                        onChange={(e) => handleConditionChange(rule.id, e.target.value as unknown as 'type', cond.value)}
                      >
                        <option value="type">Type</option>
                        <option value="country">Country</option>
                        <option value="group">Group</option>
                        <option value="member">Member</option>
                        <option value="company">Company</option>
                        <option value="location">Location</option>
                      </select>

                      <span>EQUALS</span>

                      <input
                        type="text"
                        value={cond.value}
                        onChange={(e) => handleConditionChange(rule.id, cond.field, e.target.value)}
                        placeholder="e.g. Free Cheki, 🇰🇷 KR, Deco Cheki"
                      />
                    </div>
                  ) : (
                    <div className="rule-if catchall">DEFAULT CATCH-ALL (Any remaining transaction)</div>
                  )}

                  <div className="rule-then">
                    <span>THEN PRICE = ฿</span>
                    <input
                      type="number"
                      className="rule-price"
                      value={rule.price}
                      onChange={(e) => handlePriceChange(rule.id, Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="rule-actions">
                  <button onClick={() => handleMove(idx, 'up')} disabled={idx === 0} className="btn-icon"><ArrowUp size={14} /></button>
                  <button onClick={() => handleMove(idx, 'down')} disabled={idx === ruleList.length - 1} className="btn-icon"><ArrowDown size={14} /></button>
                  {!isCatchAll && (
                    <button onClick={() => handleRemoveRule(rule.id)} className="btn-icon danger"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleAddRule}>
            <Plus size={16} /> Add Rule
          </button>
          <div className="footer-right">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { onSave(ruleList); onClose(); }}>
              <Check size={16} /> Save Rules
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.75);
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
          max-width: 780px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .modal-sub {
          font-size: 0.82rem;
          color: var(--text-muted);
        }

        .btn-close {
          background: none; border: none; color: var(--text-muted); cursor: pointer;
        }

        .rules-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-right: 6px;
          margin-bottom: 16px;
        }

        .rule-card {
          background: var(--bg-surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .rule-rank {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--bg-surface-3);
          color: var(--accent-primary);
          font-weight: 700;
          font-size: 0.78rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rule-fields {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .rule-name {
          font-weight: 600;
          border: none;
          background: none;
          color: var(--text-main);
          padding: 0;
          font-size: 0.9rem;
        }

        .rule-if {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .rule-if.catchall {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .rule-if select {
          width: 110px;
          padding: 4px 8px;
        }
        .rule-if input {
          flex: 1;
          padding: 4px 8px;
        }

        .rule-then {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          color: var(--color-success);
          font-weight: 600;
        }

        .rule-price {
          width: 90px;
          padding: 4px 8px;
        }

        .rule-actions {
          display: flex;
          gap: 4px;
        }

        .btn-icon {
          background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;
          &:hover { color: var(--text-main); }
          &.danger:hover { color: var(--color-danger); }
        }

        .modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid var(--border-subtle);
        }

        .footer-right {
          display: flex;
          gap: 10px;
        }
      `}</style>
    </div>
  );
};
