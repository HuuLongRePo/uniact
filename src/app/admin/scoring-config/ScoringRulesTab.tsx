'use client';

import { useState } from 'react';
import { type ScoringRuleConfig } from './types';

export default function ScoringRulesTab({
  rules,
  onUpdate,
  saving,
}: {
  rules: ScoringRuleConfig[];
  onUpdate: (
    data: Pick<ScoringRuleConfig, 'id' | 'name' | 'formula' | 'description' | 'is_active'>
  ) => void;
  saving: boolean;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<
    Pick<ScoringRuleConfig, 'id' | 'name' | 'formula' | 'description' | 'is_active'>
  >({
    id: 0,
    name: '',
    formula: '',
    description: '',
    is_active: 0,
  });

  const handleEdit = (rule: ScoringRuleConfig) => {
    setEditingId(rule.id);
    setEditData({
      id: rule.id,
      name: rule.name,
      formula: rule.formula,
      description: rule.description,
      is_active: rule.is_active,
    });
  };

  const handleSave = () => {
    onUpdate(editData);
    setEditingId(null);
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Cong thuc tinh diem</h2>
      <p className="mb-6 text-gray-600">
        Doi soat cac cong thuc dang duoc luu trong he thong, uu tien giu duy nhat mot cong thuc
        active cho moi dot tinh diem.
      </p>

      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-lg border p-4 hover:bg-gray-50">
            {editingId === rule.id ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Ten cong thuc</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(event) => setEditData({ ...editData, name: event.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Cong thuc</label>
                  <textarea
                    value={editData.formula}
                    onChange={(event) => setEditData({ ...editData, formula: event.target.value })}
                    className="w-full rounded border px-3 py-2 font-mono text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Mo ta</label>
                  <textarea
                    value={editData.description}
                    onChange={(event) => setEditData({ ...editData, description: event.target.value })}
                    className="w-full rounded border px-3 py-2"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Luu
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded bg-gray-400 px-4 py-2 text-white hover:bg-gray-500"
                  >
                    Huy
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{rule.name}</h3>
                    {rule.is_active ? (
                      <div className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        Dang active
                      </div>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    Sua
                  </button>
                </div>
                <p className="mb-2 rounded bg-gray-50 p-2 font-mono text-sm text-gray-700">
                  {rule.formula}
                </p>
                <p className="text-sm text-gray-600">{rule.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
