import { BookOpen, Dumbbell, Palette, Lightbulb, Heart } from 'lucide-react';

export const ACTIVITY_TEMPLATES = [
  {
    id: 'academic',
    name: 'Học thuật',
    icon: BookOpen,
    color: 'blue',
    description: 'Hoạt động học tập, seminar, workshop',
    example: 'Workshop lập trình Python, Hội thảo khoa học',
    defaultDescription: 'Tham gia hoạt động học thuật này để phát triển kỹ năng chuyên môn.',
    maxParticipants: 40,
    activityTypeName: 'Học thuật',
    organizationLevelName: 'Trường',
  },
  {
    id: 'sports',
    name: 'Thể thao',
    icon: Dumbbell,
    color: 'red',
    description: 'Các hoạt động thể thao, trò chơi tập thể',
    example: 'Bóng đá, Cầu lông, Marathon trường',
    defaultDescription: 'Cùng tham gia hoạt động thể thao để rèn luyện sức khỏe.',
    maxParticipants: 50,
    activityTypeName: 'Thể thao',
    organizationLevelName: 'Trường',
  },
  {
    id: 'arts',
    name: 'Văn nghệ',
    icon: Palette,
    color: 'purple',
    description: 'Hoạt động nghệ thuật, văn hóa, biểu diễn',
    example: 'Hòa tấu âm nhạc, Vẽ tranh, Hát karaoke',
    defaultDescription: 'Khám phá và phát huy tài năng nghệ thuật của bạn.',
    maxParticipants: 60,
    activityTypeName: 'Văn hóa - Nghệ thuật',
    organizationLevelName: 'Trường',
  },
  {
    id: 'skills',
    name: 'Kỹ năng mềm',
    icon: Lightbulb,
    color: 'amber',
    description: 'Huấn luyện kỹ năng sống, giao tiếp',
    example: 'Kỹ năng giao tiếp, Lãnh đạo nhóm, Giải quyết xung đột',
    defaultDescription: 'Phát triển kỹ năng cần thiết cho sự thành công.',
    maxParticipants: 35,
    activityTypeName: 'Kỹ năng mềm',
    organizationLevelName: 'Trường',
  },
  {
    id: 'volunteer',
    name: 'Tình nguyện',
    icon: Heart,
    color: 'green',
    description: 'Hoạt động thiện nguyện, cộng đồng',
    example: 'Hiến máu, Dọn dẹp môi trường, Hỗ trợ người già',
    defaultDescription: 'Góp sức cho cộng đồng thông qua hoạt động tình nguyện.',
    maxParticipants: 100,
    activityTypeName: 'Tình nguyện',
    organizationLevelName: 'Trường',
  },
];

interface ActivityTemplateSelectorProps {
  selectedTemplate: string | null;
  onSelect: (templateId: string) => void;
  onClear: () => void;
}

export function ActivityTemplateSelector({
  selectedTemplate,
  onSelect,
  onClear,
}: ActivityTemplateSelectorProps) {
  return (
    <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">📋 Chọn mẫu hoạt động (Tùy chọn)</h3>
        {selectedTemplate && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Xóa mẫu
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ACTIVITY_TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.id;
          const colorClasses = {
            blue: 'from-blue-100 to-blue-200 border-blue-300 text-blue-800',
            red: 'from-red-100 to-red-200 border-red-300 text-red-800',
            purple: 'from-purple-100 to-purple-200 border-purple-300 text-purple-800',
            amber: 'from-amber-100 to-amber-200 border-amber-300 text-amber-800',
            green: 'from-green-100 to-green-200 border-green-300 text-green-800',
          };

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={`relative p-3 border-2 rounded-lg text-left transition-all ${
                isSelected
                  ? `bg-gradient-to-br ${colorClasses[template.color as keyof typeof colorClasses]} shadow-lg scale-105`
                  : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <Icon className={`w-5 h-5 ${isSelected ? '' : 'text-gray-600'}`} />
                <div>
                  <div className="font-semibold text-sm">{template.name}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{template.description}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 italic">VD: {template.example}</div>
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
