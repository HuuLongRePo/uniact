'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Eye,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

type ActivityFile = {
  id: number;
  activity_id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  uploaded_by: string;
};

function getFileIcon(fileType: string, fileName: string) {
  if (/image\/(jpeg|png|gif|webp)/.test(fileType)) {
    return <ImageIcon className="h-5 w-5 text-emerald-600" />;
  }
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return <FileText className="h-5 w-5 text-rose-600" />;
  }
  if (fileType.includes('sheet') || fileName.match(/\.(xlsx?)$/i)) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  if (fileType.includes('word') || fileName.match(/\.(docx?)$/i)) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }
  return <FileIcon className="h-5 w-5 text-slate-600" />;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, index)) * 100) / 100} ${sizes[index]}`;
}

function isImageFile(fileType: string) {
  return /image\/(jpeg|png|gif|webp)/.test(fileType);
}

export default function ActivityFilesPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [files, setFiles] = useState<ActivityFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [previewFile, setPreviewFile] = useState<ActivityFile | null>(null);
  const [fileToDelete, setFileToDelete] = useState<ActivityFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'teacher' && user.role !== 'admin') {
      toast.error('Chi giang vien moi co quyen quan ly tep dinh kem');
      router.push('/teacher/dashboard');
      return;
    }

    if (user && activityId) {
      void fetchFiles();
    }
  }, [activityId, authLoading, router, user]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/activities/${activityId}/files`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai danh sach file');
      }

      setFiles(payload?.files ?? payload?.data?.files ?? []);
      setActivityTitle(payload?.activity_title ?? payload?.data?.activity_title ?? '');
    } catch (error: unknown) {
      console.error('Error loading activity files:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach file');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || uploading) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    const toastId = toast.loading('Dang tai tep len...');

    try {
      const response = await fetch(`/api/activities/${activityId}/files`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai tep len');
      }

      toast.success(payload?.message || 'Tai tep thanh cong', { id: toastId });
      await fetchFiles();
    } catch (error: unknown) {
      console.error('Error uploading activity file:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai tep len', {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/files/${fileId}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the xoa file');
      }

      setFiles((current) => current.filter((item) => item.id !== fileId));
      toast.success(payload?.message || 'Xoa file thanh cong');
    } catch (error: unknown) {
      console.error('Error deleting activity file:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the xoa file');
    }
  };

  const handleDownloadFile = (file: ActivityFile) => {
    const link = document.createElement('a');
    link.href = `/api/activities/${activityId}/files/${file.id}/download`;
    link.download = file.file_name;
    link.click();
    toast.success('Dang tai file');
  };

  if (authLoading || loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl p-6">
          <div className="page-surface rounded-[1.75rem] px-5 py-10 text-center sm:px-7">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="mt-3 text-sm text-slate-600">Dang tai tep dinh kem...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href={`/teacher/activities/${activityId}`}
                className="mb-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lai hub hoat dong
              </Link>

              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                Activity files
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Quan ly tep dinh kem</h1>
              <p className="mt-2 text-sm text-slate-600">
                Luu tru tai lieu, bieu mau, hinh anh va file van hanh phuc vu cho hoat dong hien tai.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                <span>{activityTitle || `Hoat dong #${activityId}`}</span>
                <span>{files.length} tep hien co</span>
              </div>
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
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? <UploadCloud className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {uploading ? 'Dang tai len...' : 'Tai tep len'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="page-surface rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong tep</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{files.length}</div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Tep hinh anh</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {files.filter((file) => isImageFile(file.file_type)).length}
            </div>
          </div>
          <div className="page-surface rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Tong dung luong</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatFileSize(files.reduce((sum, file) => sum + Number(file.file_size || 0), 0))}
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Danh sach tep</h2>
              <p className="mt-1 text-sm text-slate-600">
                Uu tien tai cac file can cho van hanh, sau do xoa bot tep rac hoac tep trung lap.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              {files.length} tep
            </div>
          </div>

          {files.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <div className="mt-4 text-lg font-semibold text-slate-700">Chua co tep nao</div>
              <p className="mt-2 text-sm text-slate-500">
                Bat dau bang cach tai bieu mau, tai lieu huong dan, anh su kien hoac danh sach lien quan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file) => (
                <article
                  key={file.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-slate-100 p-3">
                        {getFileIcon(file.file_type, file.file_name)}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-slate-900">{file.file_name}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            {formatFileSize(file.file_size)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            {formatVietnamDateTime(file.uploaded_at, 'date')}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                            {file.uploaded_by || 'Khong ro nguoi tai'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isImageFile(file.file_type) ? (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <Eye className="h-4 w-4" />
                          Xem truoc
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <Download className="h-4 w-4" />
                        Tai xuong
                      </button>
                      <button
                        onClick={() => setFileToDelete(file)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xoa tep
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {previewFile && isImageFile(previewFile.file_type) ? (
        <div className="app-modal-backdrop p-4" onClick={() => setPreviewFile(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-file-preview-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-4xl p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 id="teacher-file-preview-title" className="text-base font-semibold text-slate-900">
                  {previewFile.file_name}
                </h3>
                <div className="mt-1 text-sm text-slate-500">
                  {formatFileSize(previewFile.file_size)} • {previewFile.uploaded_by}
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Dong
              </button>
            </div>

            <div className="overflow-hidden rounded-[1rem] bg-slate-100 p-2">
              <img
                src={`/api/activities/${activityId}/files/${previewFile.id}/preview`}
                alt={previewFile.file_name}
                className="max-h-[70vh] w-full rounded-[0.75rem] object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={fileToDelete !== null}
        title="Xoa tep dinh kem"
        message={
          fileToDelete
            ? `Ban co chac chan muon xoa tep "${fileToDelete.file_name}" khoi hoat dong nay?`
            : ''
        }
        confirmText="Xoa tep"
        cancelText="Huy"
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
