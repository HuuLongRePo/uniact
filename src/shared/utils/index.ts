import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatVietnamDateTime, formatVietnamWithOptions } from '@/lib/timezone';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string): string {
  return formatVietnamWithOptions(date, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string): string {
  return formatVietnamDateTime(date, 'time');
}

export function getPlantStage(growth: number): string {
  if (growth < 25) return '🌱';
  if (growth < 50) return '🌿';
  if (growth < 75) return '🪴';
  return '🌳';
}

export function getPlantProgress(growth: number): { stage: string; progress: number } {
  if (growth < 25) return { stage: 'Hạt giống', progress: growth };
  if (growth < 50) return { stage: 'Cây non', progress: growth };
  if (growth < 75) return { stage: 'Cây trưởng thành', progress: growth };
  return { stage: 'Cây ra hoa', progress: growth };
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'published':
      return 'Đã công bố';
    case 'draft':
      return 'Bản nháp';
    case 'cancelled':
      return 'Đã hủy';
    case 'completed':
      return 'Đã hoàn thành';
    default:
      return status;
  }
}
