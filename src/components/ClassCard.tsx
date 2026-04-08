import { ClassWithTeacher } from '@/types/database';
import Link from 'next/link';

interface ClassCardProps {
  classItem: ClassWithTeacher;
  showActions?: boolean;
}

export default function ClassCard({ classItem, showActions = false }: ClassCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{classItem.name}</h3>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {classItem.grade}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <span className="font-medium">Giảng viên:</span>
          <span className="ml-2">{classItem.teacher_name || 'Chưa phân công'}</span>
        </div>

        <div className="flex items-center">
          <span className="font-medium">Số học viên:</span>
          <span className="ml-2">{classItem.student_count || 0}</span>
        </div>

        {classItem.description && (
          <div>
            <span className="font-medium">Mô tả:</span>
            <p className="mt-1 text-gray-700">{classItem.description}</p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="mt-4 flex space-x-2">
          <Link
            href={`/classes/${classItem.id}`}
            className="flex-1 bg-green-600 text-white text-center py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Xem chi tiết
          </Link>
          <button className="bg-gray-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-600 transition-colors">
            Chỉnh sửa
          </button>
        </div>
      )}
    </div>
  );
}
