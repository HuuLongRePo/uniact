'use client';

import { useState } from 'react';
import { type AchievementMultiplierConfig } from './types';

export default function AchievementsTab({
  achievements,
  onUpdate,
  saving,
}: {
  achievements: AchievementMultiplierConfig[];
  onUpdate: (
    data: Pick<AchievementMultiplierConfig, 'achievement_level' | 'multiplier' | 'description'>
  ) => void;
  saving: boolean;
}) {
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editData, setEditData] = useState<
    Pick<AchievementMultiplierConfig, 'achievement_level' | 'multiplier' | 'description'>
  >({
    achievement_level: '',
    multiplier: 0,
    description: '',
  });

  const handleEdit = (achievement: AchievementMultiplierConfig) => {
    setEditingLevel(achievement.achievement_level);
    setEditData({
      achievement_level: achievement.achievement_level,
      multiplier: achievement.multiplier,
      description: achievement.description,
    });
  };

  const handleSave = () => {
    onUpdate(editData);
    setEditingLevel(null);
  };

  const getIcon = (level: string) => {
    switch (level) {
      case 'excellent':
        return '🥇';
      case 'good':
        return '🥈';
      case 'participated':
        return '✅';
      default:
        return '📌';
    }
  };

  const getLabel = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'Xuat sac';
      case 'good':
        return 'Tot';
      case 'participated':
        return 'Tham gia';
      default:
        return level;
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Muc danh gia va he so thanh tich</h2>
      <p className="mb-6 text-gray-600">
        He so nay duoc ap sau buoc cham danh gia cua giang vien, phan anh muc do dong gop cua hoc
        vien trong hoat dong.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Muc do</th>
              <th className="border px-4 py-2 text-right">He so</th>
              <th className="border px-4 py-2 text-left">Mo ta</th>
              <th className="border px-4 py-2 text-center">Thao tac</th>
            </tr>
          </thead>
          <tbody>
            {achievements.map((achievement) => (
              <tr key={achievement.achievement_level} className="hover:bg-gray-50">
                <td className="border px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getIcon(achievement.achievement_level)}</span>
                    <span className="font-medium">{getLabel(achievement.achievement_level)}</span>
                  </div>
                </td>
                <td className="border px-4 py-2 text-right">
                  {editingLevel === achievement.achievement_level ? (
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
                      max="5"
                    />
                  ) : (
                    <span className="font-bold text-purple-600">x{achievement.multiplier}</span>
                  )}
                </td>
                <td className="border px-4 py-2">
                  {editingLevel === achievement.achievement_level ? (
                    <input
                      type="text"
                      value={editData.description}
                      onChange={(event) => setEditData({ ...editData, description: event.target.value })}
                      className="w-full rounded border px-2 py-1"
                    />
                  ) : (
                    <span className="text-sm text-gray-600">{achievement.description}</span>
                  )}
                </td>
                <td className="border px-4 py-2 text-center">
                  {editingLevel === achievement.achievement_level ? (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Luu
                      </button>
                      <button
                        onClick={() => setEditingLevel(null)}
                        className="rounded bg-gray-400 px-3 py-1 text-white hover:bg-gray-500"
                      >
                        Huy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(achievement)}
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
