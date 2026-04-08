import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  message,
  action,
}: EmptyStateProps) {
  const displayText = description ?? message ?? '';

  return (
    <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>

      <p className="text-gray-600 mb-4 max-w-md mx-auto">{displayText}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
