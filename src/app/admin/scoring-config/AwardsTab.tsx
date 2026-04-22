'use client';

import { useState } from 'react';
import { type AwardBonusConfig } from './types';

export default function AwardsTab({
  awards,
  onUpdate,
  saving,
}: {
  awards: AwardBonusConfig[];
  onUpdate: (
    data: Pick<AwardBonusConfig, 'id' | 'award_type' | 'bonus_points' | 'description'>
  ) => void;
  saving: boolean;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<
    Pick<AwardBonusConfig, 'id' | 'award_type' | 'bonus_points' | 'description'>
  >({
    id: 0,
    award_type: '',
    bonus_points: 0,
    description: '',
  });

  const handleEdit = (award: AwardBonusConfig) => {
    setEditingId(award.id);
    setEditData({
      id: award.id,
      award_type: award.award_type,
      bonus_points: award.bonus_points,
      description: award.description,
    });
  };

  const handleSave = () => {
    onUpdate(editData);
    setEditingId(null);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Giải Thưởng - Điểm Thưởng</h2>
      <p className="text-gray-600 mb-6">
        Các giải thưởng cấp nhất giải với điểm thưởng tương ứng. Áp dụng cho hoạt động có xếp hạng.
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2 text-left">Giải Thưởng</th>
            <th className="border px-4 py-2 text-right">Điểm Thưởng</th>
            <th className="border px-4 py-2 text-left">Mô Tả</th>
            <th className="border px-4 py-2 text-center">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {awards.map((award) => (
            <tr key={award.id} className="hover:bg-gray-50">
              <td className="border px-4 py-2 font-medium">{award.name}</td>
              <td className="border px-4 py-2 text-right">
                {editingId === award.id ? (
                  <input
                    type="number"
                    value={editData.bonus_points}
                    onChange={(e) =>
                      setEditData({ ...editData, bonus_points: parseInt(e.target.value) })
                    }
                    className="w-20 px-2 py-1 border rounded text-right"
                    min="0"
                  />
                ) : (
                  <span className="font-bold text-yellow-600">+{award.bonus_points}</span>
                )}
              </td>
              <td className="border px-4 py-2">
                {editingId === award.id ? (
                  <input
                    type="text"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                ) : (
                  <span className="text-sm text-gray-600">{award.description}</span>
                )}
              </td>
              <td className="border px-4 py-2 text-center">
                {editingId === award.id ? (
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
                    onClick={() => handleEdit(award)}
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
