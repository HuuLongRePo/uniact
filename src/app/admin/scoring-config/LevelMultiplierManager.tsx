'use client';

import { useState } from 'react';
import { type OrganizationLevelConfig } from './types';

export default function LevelMultiplierManager({
  levels,
  onUpdate,
  saving,
}: {
  levels: OrganizationLevelConfig[];
  onUpdate: (data: Pick<OrganizationLevelConfig, 'id' | 'multiplier'>) => void;
  saving: boolean;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Pick<OrganizationLevelConfig, 'id' | 'multiplier'>>({
    id: 0,
    multiplier: 1,
  });

  const handleEdit = (level: OrganizationLevelConfig) => {
    setEditingId(level.id);
    setEditData({ id: level.id, multiplier: level.multiplier });
  };

  const handleSave = () => {
    onUpdate(editData);
    setEditingId(null);
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Cap to chuc va he so nhan</h2>
      <p className="mb-6 text-gray-600">
        He so nhan phan biet quy mo to chuc. Hoat dong cap cao hon se nhan tong diem lon hon.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Cap do</th>
              <th className="border px-4 py-2 text-right">He so</th>
              <th className="border px-4 py-2 text-left">Vi du</th>
              <th className="border px-4 py-2 text-center">Thao tac</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => (
              <tr key={level.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2 font-medium">{level.name}</td>
                <td className="border px-4 py-2 text-right">
                  {editingId === level.id ? (
                    <input
                      type="number"
                      step="0.1"
                      value={editData.multiplier}
                      onChange={(event) =>
                        setEditData({
                          ...editData,
                          multiplier: Number.parseFloat(event.target.value || '0') || 0,
                        })
                      }
                      className="w-20 rounded border px-2 py-1 text-right"
                      min="0"
                      max="10"
                    />
                  ) : (
                    <span className="font-bold text-green-600">x{level.multiplier}</span>
                  )}
                </td>
                <td className="border px-4 py-2 text-sm text-gray-600">
                  10 diem x {level.multiplier} = {10 * level.multiplier} diem
                </td>
                <td className="border px-4 py-2 text-center">
                  {editingId === level.id ? (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Luu
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded bg-gray-400 px-3 py-1 text-white hover:bg-gray-500"
                      >
                        Huy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(level)}
                      className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                    >
                      Sua
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
