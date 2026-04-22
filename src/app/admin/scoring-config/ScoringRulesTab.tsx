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
      <h2 className="text-xl font-bold mb-4">Công Thức Tính Điểm</h2>
      <p className="text-gray-600 mb-6">
        Định nghĩa các công thức tính điểm được sử dụng trong hệ thống.
      </p>

      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50">
            {editingId === rule.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên Công Thức</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Công Thức</label>
                  <textarea
                    value={editData.formula}
                    onChange={(e) => setEditData({ ...editData, formula: e.target.value })}
                    className="w-full px-3 py-2 border rounded font-mono text-sm"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mô Tả</label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{rule.name}</h3>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Sửa
                  </button>
                </div>
                <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded mb-2">
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
