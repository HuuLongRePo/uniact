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
      <h2 className="mb-4 text-xl font-bold">Giai thuong va diem cong them</h2>
      <p className="mb-6 text-gray-600">
        Dinh nghia diem thuong bo sung cho cac thanh tich co xep hang hoac danh hieu dac biet.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Giai thuong</th>
              <th className="border px-4 py-2 text-right">Diem thuong</th>
              <th className="border px-4 py-2 text-left">Mo ta</th>
              <th className="border px-4 py-2 text-center">Thao tac</th>
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
                      onChange={(event) =>
                        setEditData({
                          ...editData,
                          bonus_points: Number.parseInt(event.target.value || '0', 10),
                        })
                      }
                      className="w-20 rounded border px-2 py-1 text-right"
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
                      onChange={(event) => setEditData({ ...editData, description: event.target.value })}
                      className="w-full rounded border px-2 py-1"
                    />
                  ) : (
                    <span className="text-sm text-gray-600">{award.description}</span>
                  )}
                </td>
                <td className="border px-4 py-2 text-center">
                  {editingId === award.id ? (
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
                      onClick={() => handleEdit(award)}
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
