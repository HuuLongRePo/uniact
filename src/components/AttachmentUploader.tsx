'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { formatVietnamDateTime } from '@/lib/timezone';

interface Attachment {
  name: string;
  size: number;
  url: string;
  uploadedAt: string;
}

interface AttachmentUploaderProps {
  activityId: number;
  canUpload: boolean; // Teacher or admin only
}

export default function AttachmentUploader({ activityId, canUpload }: AttachmentUploaderProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAttachments();
  }, [activityId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/activities/${activityId}/attachments`);
      const data = await res.json();
      if (res.ok) {
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn! Kích thước tối đa: 10MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/activities/${activityId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Tải lên thành công!');
        fetchAttachments(); // Reload list
        event.target.value = ''; // Clear input
      } else {
        toast.error(data.error || 'Tải lên thất bại');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Lỗi khi tải file lên');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    if (['txt', 'csv'].includes(ext || '')) return '📋';
    return '📎';
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">📎 File đính kèm</h3>
        {canUpload && (
          <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer text-sm">
            {uploading ? 'Đang tải...' : '+ Tải lên file'}
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
          </label>
        )}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-4">Đang tải...</div>
      ) : attachments.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">📁</div>
          <p>Chưa có file đính kèm</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{file.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)} •{' '}
                    {formatVietnamDateTime(file.uploadedAt, 'date')}
                  </div>
                </div>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
              >
                Tải xuống
              </a>
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <div className="mt-4 text-xs text-gray-500">
          <p>Loại file hỗ trợ: Hình ảnh, PDF, Word, Excel, Text</p>
          <p>Kích thước tối đa: 10MB</p>
        </div>
      )}
    </div>
  );
}
