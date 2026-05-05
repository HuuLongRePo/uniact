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
  const [editData, setEditData] = useState<Pick<ActivityTypeConfig, 'id' | 'base_points' | 'color'>>({
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
      <h2 className="mb-4 text-xl font-bold">Loai hoat dong va diem co ban</h2>
      <p className="mb-6 text-gray-600">
        Dieu chinh diem co ban va mau nhan cho tung loai hoat dong truoc khi nhan voi he so cap to
        chuc va muc danh gia.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Loai</th>
              <th className="border px-4 py-2 text-left">Mau</th>
              <th className="border px-4 py-2 text-right">Diem co ban</th>
              <th className="border px-4 py-2 text-center">Thao tac</th>
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
                      onChange={(event) => setEditData({ ...editData, color: event.target.value })}
                      className="h-8 w-16 rounded border"
                    />
                  ) : (
                    <span
                      className="inline-block h-8 w-16 rounded border"
                      style={{ backgroundColor: type.color }}
                    />
                  )}
                </td>
                <td className="border px-4 py-2 text-right">
                  {editingId === type.id ? (
                    <input
                      type="number"
                      value={editData.base_points}
                      onChange={(event) =>
                        setEditData({
                          ...editData,
                          base_points: Number.parseInt(event.target.value || '0', 10),
                        })
                      }
                      className="w-20 rounded border px-2 py-1 text-right"
                      min="0"
                      max="100"
                    />
                  ) : (
                    <span className="font-bold text-blue-600">{type.base_points}</span>
                  )}
                </td>
                <td className="border px-4 py-2 text-center">
                  {editingId === type.id ? (
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
                      onClick={() => handleEdit(type)}
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
