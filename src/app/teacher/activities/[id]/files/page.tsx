'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Plus, Image as ImageIcon, File, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ActivityFile {
  id: number;
  activity_id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  uploaded_by: string;
}

export default function ActivityFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [files, setFiles] = useState<ActivityFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityTitle, setActivityTitle] = useState('');
  const [previewFile, setPreviewFile] = useState<ActivityFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<ActivityFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [id]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/activities/${id}/files`);
      if (!response.ok) throw new Error('Không thể tải danh sách file');
      const data = await response.json();
      setFiles(data.files || []);
      setActivityTitle(data.activity_title || '');
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách file');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    try {
      const response = await fetch(`/api/activities/${id}/files/${fileId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Không thể xóa file');
      setFiles(files.filter((f) => f.id !== fileId));
      toast.success('Xóa file thành công');
    } catch (error) {
      console.error(error);
      toast.error('Không thể xóa file');
    }
  };

  const handleDownloadFile = (file: ActivityFile) => {
    const link = document.createElement('a');
    link.href = `/api/activities/${id}/files/${file.id}/download`;
    link.download = file.file_name;
    link.click();
    toast.success('Tải file thành công');
  };

  const handleUploadClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // allow selecting the same file again
    e.target.value = '';

    if (!file) return;
    if (uploading) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    const toastId = toast.loading('Đang tải lên...');
    try {
      const response = await fetch(`/api/activities/${id}/files`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error || payload?.message || 'Không thể tải file lên';
        throw new Error(message);
      }

      toast.success(payload?.message || 'Tải file thành công', { id: toastId });
      await fetchFiles();
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải file lên', {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    if (/image\/(jpeg|png|gif|webp)/.test(fileType)) {
      return <ImageIcon className="w-5 h-5 text-green-600" />;
    }
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-600" />;
    }
    if (fileType.includes('word') || fileName.match(/\.(docx?)$/i)) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (fileType.includes('sheet') || fileName.match(/\.(xlsx?)$/i)) {
      return <FileText className="w-5 h-5 text-green-600" />;
    }
    return <File className="w-5 h-5 text-gray-600" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const isImageFile = (fileType: string) => /image\/(jpeg|png|gif|webp)/.test(fileType);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quản lý file</h1>
              <p className="text-gray-600 mt-1">{activityTitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelected}
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
              />
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded transition"
                title="Tải file lên"
              >
                <Plus className="w-5 h-5" />
                Tải lên
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Chưa có file nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded">
                    {getFileIcon(file.file_type, file.file_name)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{file.file_name}</h3>
                    <div className="flex gap-4 text-sm text-gray-600 mt-1">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>{new Date(file.uploaded_at).toLocaleDateString('vi-VN')}</span>
                      <span>Bởi {file.uploaded_by}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isImageFile(file.file_type) && (
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded transition"
                        title="Xem trước"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-2 hover:bg-green-100 text-green-600 rounded transition"
                      title="Tải xuống"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setFileToDelete(file)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded transition"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewFile && isImageFile(previewFile.file_type) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl max-h-96 p-4 relative">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
            >
              ✕
            </button>
            <img
              src={`/api/activities/${id}/files/${previewFile.id}/preview`}
              alt={previewFile.file_name}
              className="max-w-full max-h-96 object-contain"
            />
            <p className="text-sm text-gray-600 mt-2">{previewFile.file_name}</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={fileToDelete !== null}
        title="Xóa file"
        message={
          fileToDelete
            ? `Bạn có chắc chắn muốn xóa file "${fileToDelete.file_name}" khỏi hoạt động này?`
            : ''
        }
        confirmText="Xóa file"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setFileToDelete(null)}
        onConfirm={async () => {
          if (!fileToDelete) return;
          await handleDeleteFile(fileToDelete.id);
          setFileToDelete(null);
        }}
      />
    </div>
  );
}
