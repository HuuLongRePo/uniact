'use client';

import { useState } from 'react';

export default function AchievementsTab({
  achievements,
  onUpdate,
  saving,
}: {
  achievements: any[];
  onUpdate: (data: any) => void;
  saving: boolean;
}) {
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const handleEdit = (ach: any) => {
    setEditingLevel(ach.achievement_level);
    setEditData({
      achievement_level: ach.achievement_level,
      multiplier: ach.multiplier,
      description: ach.description,
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
        return 'Xuất Sắc';
      case 'good':
        return 'Tốt';
      case 'participated':
        return 'Tham Gia';
      default:
        return level;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Mức Đánh Giá - Hệ Số Thành Tích</h2>
      <p className="text-gray-600 mb-6">
        Hệ số dựa trên mức độ đóng góp của học viên trong hoạt động. Giảng viên sẽ đánh giá sau khi
        điểm danh.
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2 text-left">Mức Độ</th>
            <th className="border px-4 py-2 text-right">Hệ Số</th>
            <th className="border px-4 py-2 text-left">Mô Tả</th>
            <th className="border px-4 py-2 text-center">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {achievements.map((ach) => (
            <tr key={ach.achievement_level} className="hover:bg-gray-50">
              <td className="border px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getIcon(ach.achievement_level)}</span>
                  <span className="font-medium">{getLabel(ach.achievement_level)}</span>
                </div>
              </td>
              <td className="border px-4 py-2 text-right">
                {editingLevel === ach.achievement_level ? (
                  <input
                    type="number"
                    step="0.1"
                    value={editData.multiplier}
                    onChange={(e) =>
                      setEditData({ ...editData, multiplier: parseFloat(e.target.value) })
                    }
                    className="w-20 px-2 py-1 border rounded text-right"
                    min="0"
                    max="5"
                  />
                ) : (
                  <span className="font-bold text-purple-600">×{ach.multiplier}</span>
                )}
              </td>
              <td className="border px-4 py-2">
                {editingLevel === ach.achievement_level ? (
                  <input
                    type="text"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full px-2 py-1 border rounded"
                  />
                ) : (
                  <span className="text-sm text-gray-600">{ach.description}</span>
                )}
              </td>
              <td className="border px-4 py-2 text-center">
                {editingLevel === ach.achievement_level ? (
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => setEditingLevel(null)}
                      className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(ach)}
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
