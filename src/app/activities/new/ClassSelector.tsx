interface Class {
  id: number;
  name: string;
  level: number;
}

interface ClassSelectorProps {
  classes: Class[];
  selectedClassIds: number[];
  onClassChange: (classId: number, checked: boolean) => void;
  selectAllClasses: () => void;
  clearAllClasses: () => void;
}

export function ClassSelector({
  classes,
  selectedClassIds,
  onClassChange,
  selectAllClasses,
  clearAllClasses,
}: ClassSelectorProps) {
  const groupedClasses = classes.reduce(
    (acc, cls) => {
      if (!acc[cls.level]) acc[cls.level] = [];
      acc[cls.level].push(cls);
      return acc;
    },
    {} as Record<number, Class[]>
  );

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Lớp tham gia <span className="text-red-500">*</span>
        </label>
        <div className="space-x-2">
          <button
            type="button"
            onClick={selectAllClasses}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Chọn tất cả
          </button>
          <button
            type="button"
            onClick={clearAllClasses}
            className="text-xs text-gray-600 hover:text-gray-800 underline"
          >
            Bỏ chọn tất cả
          </button>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
        {Object.keys(groupedClasses).length === 0 && (
          <p className="text-sm text-gray-500 italic">Không có lớp nào</p>
        )}
        {Object.entries(groupedClasses).map(([level, levelClasses]) => (
          <div key={level} className="mb-3 last:mb-0">
            <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
              Khối {level}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {levelClasses.map((cls) => (
                <label
                  key={cls.id}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    selectedClassIds.includes(cls.id)
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(cls.id)}
                    onChange={(e) => onClassChange(cls.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">{cls.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {selectedClassIds.length > 0 && (
        <p className="text-xs text-gray-600 mt-2">Đã chọn: {selectedClassIds.length} lớp</p>
      )}
    </div>
  );
}
