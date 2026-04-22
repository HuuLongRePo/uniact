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
      <h2 className="text-xl font-bold mb-4">Cấp Tổ Chức - Hệ Số Nhân</h2>
      <p className="text-gray-600 mb-6">
        Hệ số nhân dựa trên quy mô tổ chức. Hoạt động cấp cao hơn sẽ có hệ số lớn hơn.
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2 text-left">Cấp Độ</th>
            <th className="border px-4 py-2 text-right">Hệ Số</th>
            <th className="border px-4 py-2 text-left">Ví Dụ</th>
            <th className="border px-4 py-2 text-center">Thao Tác</th>
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
                    onChange={(e) =>
                      setEditData({ ...editData, multiplier: parseFloat(e.target.value) })
                    }
                    className="w-20 px-2 py-1 border rounded text-right"
                    min="0"
                    max="10"
                  />
                ) : (
                  <span className="font-bold text-green-600">×{level.multiplier}</span>
                )}
              </td>
              <td className="border px-4 py-2 text-sm text-gray-600">
                10 điểm × {level.multiplier} = {10 * level.multiplier} điểm
              </td>
              <td className="border px-4 py-2 text-center">
                {editingId === level.id ? (
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(level)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Sửa
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
