'use client';

import { useState } from 'react';
import { type ActivityTypeConfig } from './types';

export default function ActivityTypeManager({
  types,
  onUpdate,
  saving,
}: {
  types: ActivityTypeConfig[];
  onUpdate: (data: Pick<ActivityTypeConfig, 'id' | 'base_points' | 'color'>) => void;
  saving: boolean;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<
    Pick<ActivityTypeConfig, 'id' | 'base_points' | 'color'>
  >({
    id: 0,
    base_points: 0,
    color: '#3B82F6',
  });

  const handleEdit = (type: ActivityTypeConfig) => {
    setEditingId(type.id);
    setEditData({ id: type.id, base_points: type.base_points, color: type.color });
  };

  const handleSave = () => {
    onUpdate(editData);
    setEditingId(null);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Loại Hoạt Động - Điểm Cơ Bản</h2>
      <p className="text-gray-600 mb-6">
        Điều chỉnh điểm cơ bản cho từng loại hoạt động. Điểm này sẽ được nhân với hệ số cấp độ và
        đánh giá.
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2 text-left">Loại</th>
            <th className="border px-4 py-2 text-left">Màu</th>
            <th className="border px-4 py-2 text-right">Điểm Cơ Bản</th>
            <th className="border px-4 py-2 text-center">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type.id} className="hover:bg-gray-50">
              <td className="border px-4 py-2 font-medium">{type.name}</td>
              <td className="border px-4 py-2">
                {editingId === type.id ? (
                  <input
                    type="color"
                    value={editData.color}
                    onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                    className="w-16 h-8 border rounded"
                  />
                ) : (
                  <span
                    className="inline-block w-16 h-8 rounded border"
                    style={{ backgroundColor: type.color }}
                  />
                )}
              </td>
              <td className="border px-4 py-2 text-right">
                {editingId === type.id ? (
                  <input
                    type="number"
                    value={editData.base_points}
                    onChange={(e) =>
                      setEditData({ ...editData, base_points: parseInt(e.target.value) })
                    }
                    className="w-20 px-2 py-1 border rounded text-right"
                    min="0"
                    max="100"
                  />
                ) : (
                  <span className="font-bold text-blue-600">{type.base_points}</span>
                )}
              </td>
              <td className="border px-4 py-2 text-center">
                {editingId === type.id ? (
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
                    onClick={() => handleEdit(type)}
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
