'use client';
import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  section: string;
}

export function SectionErrorBoundary({ children, section }: SectionErrorBoundaryProps) {
  const fallback = (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Lỗi trong phần {section}</h3>
      <p className="text-red-600 mb-4">
        Phần này gặp sự cố. Các phần khác của ứng dụng vẫn hoạt động bình thường.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Tải lại trang
      </button>
    </div>
  );

  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}
