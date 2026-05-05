'use client';

import { useEffect, useRef, useState } from 'react';
import { GripVertical, Loader2, Save, Send, Upload, X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { formatVietnamDateTime, toVietnamDatetimeLocalValue } from '@/lib/timezone';
import LoadingSpinner, { FullScreenLoader } from './LoadingSpinner';
import {
  ACTIVITY_TEMPLATES,
  ActivityTemplateSelector,
} from '@/app/activities/new/ActivityTemplateSelector';

interface ActivityFormData {
  title: string;
  description: string;
  date_time: string;
  end_time: string;
  location: string;
  max_participants: number;
  registration_deadline: string;
  base_points: number;
  activity_type_id: number | null;
  organization_level_id: number | null;
  class_ids: number[];
}

interface ActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activityId?: number | null;
  initialData?: Partial<ActivityFormData>;
}

interface OptionItem {
  id: number;
  name: string;
}

const PARTICIPANT_OPTIONS = [30, 50, 100, 150, 200, 300, 500, 1000];

const EMPTY_FORM: ActivityFormData = {
  title: '',
  description: '',
  date_time: '',
  end_time: '',
  location: '',
  max_participants: 30,
  registration_deadline: '',
  base_points: 0,
  activity_type_id: null,
  organization_level_id: null,
  class_ids: [],
};
const EMPTY_INITIAL_DATA: Partial<ActivityFormData> = {};

function pickArray(payload: any, keys: string[]) {
  for (const key of keys) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

export default function ActivityDialog({
  isOpen,
  onClose,
  onSuccess,
  activityId = null,
  initialData,
}: ActivityDialogProps) {
  const safeInitialData = initialData ?? EMPTY_INITIAL_DATA;
  const [formData, setFormData] = useState<ActivityFormData>({ ...EMPTY_FORM, ...safeInitialData });
  const [classes, setClasses] = useState<OptionItem[]>([]);
  const [activityTypes, setActivityTypes] = useState<OptionItem[]>([]);
  const [orgLevels, setOrgLevels] = useState<OptionItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<'draft' | 'submit'>('draft');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [customParticipants, setCustomParticipants] = useState<number | null>(null);
  const [locationConflicts, setLocationConflicts] = useState<any[]>([]);
  const [scheduleWarnings, setScheduleWarnings] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    void fetchMetadata();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (activityId) {
      void fetchActivityData(activityId);
      return;
    }
    setFormData({ ...EMPTY_FORM, ...safeInitialData });
    setFiles([]);
    setSelectedTemplate(null);
    setCustomParticipants(null);
    setLocationConflicts([]);
    setScheduleWarnings([]);
    setSubmitMode('draft');
  }, [isOpen, activityId, safeInitialData]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (formData.location && formData.date_time) {
        void checkConflicts();
      } else {
        setLocationConflicts([]);
        setScheduleWarnings([]);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [isOpen, formData.location, formData.date_time]);

  const fetchMetadata = async () => {
    try {
      setFetching(true);
      const [classesRes, typesRes, levelsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/activity-types'),
        fetch('/api/organization-levels'),
      ]);

      if (classesRes.ok) {
        const payload = await classesRes.json().catch(() => ({}));
        setClasses(pickArray(payload, ['classes', 'data']).map((item: any) => ({ id: item.id, name: item.name })));
      }
      if (typesRes.ok) {
        const payload = await typesRes.json().catch(() => ({}));
        setActivityTypes(
          pickArray(payload, ['activityTypes', 'activity_types', 'types', 'data']).map((item: any) => ({
            id: item.id,
            name: item.name,
          }))
        );
      }
      if (levelsRes.ok) {
        const payload = await levelsRes.json().catch(() => ({}));
        setOrgLevels(
          pickArray(payload, ['organization_levels', 'levels', 'data']).map((item: any) => ({
            id: item.id,
            name: item.name,
          }))
        );
      }
    } catch (error) {
      console.error('ActivityDialog metadata fetch error:', error);
      toast.error('Khong the tai du lieu khoi tao.');
    } finally {
      setFetching(false);
    }
  };

  const fetchActivityData = async (id: number) => {
    try {
      setFetching(true);
      const res = await fetch(`/api/activities/${id}`);
      if (!res.ok) throw new Error('Khong the tai hoat dong.');
      const payload = await res.json().catch(() => ({}));
      const activity = payload?.activity || payload?.data?.activity;
      if (!activity) throw new Error('Khong tim thay du lieu hoat dong.');

      setFormData({
        title: activity.title || '',
        description: activity.description || '',
        date_time: toVietnamDatetimeLocalValue(activity.date_time),
        end_time: toVietnamDatetimeLocalValue(activity.end_time),
        location: activity.location || '',
        max_participants: Number(activity.max_participants || 30),
        registration_deadline: toVietnamDatetimeLocalValue(activity.registration_deadline),
        base_points: Number(activity.base_points || 0),
        activity_type_id: activity.activity_type_id ?? null,
        organization_level_id: activity.organization_level_id ?? null,
        class_ids: Array.isArray(activity.class_ids) ? activity.class_ids : [],
      });
    } catch (error) {
      console.error('ActivityDialog activity fetch error:', error);
      toast.error('Khong the tai thong tin hoat dong.');
    } finally {
      setFetching(false);
    }
  };

  const checkConflicts = async () => {
    try {
      setCheckingConflicts(true);
      const res = await fetch('/api/activities/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: formData.location,
          date_time: formData.date_time,
          duration: 120,
          exclude_activity_id: activityId,
        }),
      });
      if (!res.ok) return;
      const payload = await res.json().catch(() => ({}));
      const data = payload?.data || {};
      setLocationConflicts(Array.isArray(data.location_conflicts) ? data.location_conflicts : []);
      setScheduleWarnings(Array.isArray(data.schedule_warnings) ? data.schedule_warnings : []);
    } catch (error) {
      console.error('ActivityDialog conflict check error:', error);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = ACTIVITY_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    const nextType = activityTypes.find((type) => type.name === template.activityTypeName)?.id ?? null;
    const nextLevel = orgLevels.find((level) => level.name === template.organizationLevelName)?.id ?? null;

    setFormData((prev) => ({
      ...prev,
      description: template.defaultDescription,
      max_participants: template.maxParticipants,
      activity_type_id: nextType,
      organization_level_id: nextLevel,
    }));

    setCustomParticipants(
      PARTICIPANT_OPTIONS.includes(template.maxParticipants) ? null : template.maxParticipants
    );
    toast.success(`Da ap dung mau: ${template.name}`);
  };

  const handleTemplateClear = () => {
    setSelectedTemplate(null);
    setFormData((prev) => ({
      ...prev,
      description: '',
      max_participants: 30,
      activity_type_id: null,
      organization_level_id: null,
    }));
    setCustomParticipants(null);
    toast.success('Da xoa mau.');
  };

  const handleClassToggle = (classId: number) => {
    setFormData((prev) => {
      const exists = prev.class_ids.includes(classId);
      return {
        ...prev,
        class_ids: exists ? prev.class_ids.filter((id) => id !== classId) : [...prev.class_ids, classId],
      };
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length + files.length > 5) {
      toast.error('Toi da 5 file.');
      return;
    }
    const next = [...files, ...selected].filter(
      (file, idx, arr) => arr.findIndex((item) => item.name === file.name && item.size === file.size) === idx
    );
    setFiles(next.slice(0, 5));
    event.target.value = '';
  };

  const uploadFiles = async (targetActivityId: number) => {
    if (files.length === 0) return true;
    try {
      setUploading(true);
      const body = new FormData();
      files.forEach((file) => body.append('files', file));
      const res = await fetch(`/api/activities/${targetActivityId}/files`, { method: 'POST', body });
      if (!res.ok) throw new Error('Upload that bai.');
      return true;
    } catch (error) {
      console.error('ActivityDialog upload error:', error);
      toast.error('Khong the tai file len.');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({ ...EMPTY_FORM });
    setFiles([]);
    setSelectedTemplate(null);
    setSubmitMode('draft');
    setCustomParticipants(null);
    setLocationConflicts([]);
    setScheduleWarnings([]);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent, mode: 'draft' | 'submit') => {
    event.preventDefault();

    if (!formData.title.trim()) return toast.error('Vui long nhap ten hoat dong.');
    if (!formData.date_time) return toast.error('Vui long chon thoi gian bat dau.');
    if (!formData.location.trim()) return toast.error('Vui long nhap dia diem.');

    if (formData.registration_deadline) {
      const deadline = new Date(formData.registration_deadline).getTime();
      const start = new Date(formData.date_time).getTime();
      if (Number.isFinite(deadline) && Number.isFinite(start) && (start - deadline) / 36e5 < 24) {
        return toast.error('Deadline dang ky phai it nhat 24 gio truoc hoat dong.');
      }
    }

    try {
      setLoading(true);
      const url = activityId ? `/api/activities/${activityId}` : '/api/activities';
      const method = activityId ? 'PUT' : 'POST';
      const payload = { ...formData, status: 'draft' };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Co loi khi luu hoat dong.');

      const savedId = activityId || data?.activity?.id || data?.data?.activity?.id;
      if (!savedId) throw new Error('Khong xac dinh duoc hoat dong vua luu.');

      const uploaded = await uploadFiles(savedId);
      if (!uploaded) throw new Error('Khong the tai file len.');

      if (mode === 'submit') {
        const submitRes = await fetch(`/api/activities/${savedId}/submit-approval`, { method: 'POST' });
        const submitData = await submitRes.json().catch(() => ({}));
        if (!submitRes.ok) throw new Error(submitData?.error || 'Gui phe duyet that bai.');
      }

      toast.success(
        activityId
          ? 'Da cap nhat hoat dong.'
          : mode === 'draft'
            ? 'Da luu nhap hoat dong.'
            : 'Da tao hoat dong va gui phe duyet.'
      );
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('ActivityDialog submit error:', error);
      toast.error(error?.message || 'Khong the luu hoat dong.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const showCustomParticipantInput = !PARTICIPANT_OPTIONS.includes(formData.max_participants);

  return (
    <div className="app-modal-backdrop px-4 py-6" onClick={handleClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-dialog-title"
        className="app-modal-panel app-modal-panel-scroll relative w-full max-w-3xl rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 id="activity-dialog-title" className="text-xl font-bold text-gray-900">
            {activityId ? 'Chinh sua hoat dong' : 'Tao hoat dong moi'}
          </h2>
          <button type="button" onClick={handleClose} aria-label="Dong" className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event, submitMode)} className="space-y-6 p-6">
          {fetching ? (
            <LoadingSpinner variant="centered" size="lg" color="green" message="Dang tai du lieu..." />
          ) : (
            <>
              {!activityId ? (
                <ActivityTemplateSelector
                  selectedTemplate={selectedTemplate}
                  onSelect={handleTemplateSelect}
                  onClear={handleTemplateClear}
                />
              ) : null}

              <section className="space-y-4">
                <h3 className="border-b pb-2 font-semibold text-gray-900">Thong tin co ban</h3>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Nhap ten hoat dong"
                />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Mo ta chi tiet ve hoat dong"
                />
              </section>

              <section className="space-y-4">
                <h3 className="border-b pb-2 font-semibold text-gray-900">Thoi gian va dia diem</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    type="datetime-local"
                    name="date_time"
                    required
                    value={formData.date_time}
                    onChange={(event) => setFormData((prev) => ({ ...prev, date_time: event.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={(event) => setFormData((prev) => ({ ...prev, end_time: event.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="datetime-local"
                    name="registration_deadline"
                    value={formData.registration_deadline}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, registration_deadline: event.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="base_points"
                    value={formData.base_points}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, base_points: Number.parseInt(event.target.value || '0', 10) }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Diem co ban"
                  />
                </div>

                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Phong 201 - Toa A"
                />

                {checkingConflicts ? <p className="text-xs text-gray-500">Dang kiem tra xung dot...</p> : null}
                {locationConflicts.length > 0 ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    Phat hien {locationConflicts.length} xung dot dia diem.
                  </div>
                ) : null}
                {scheduleWarnings.length > 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    Co {scheduleWarnings.length} canh bao lich trinh gan nhau.
                  </div>
                ) : null}
              </section>

              <section className="space-y-4">
                <h3 className="border-b pb-2 font-semibold text-gray-900">Cai dat</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">So luong toi da</label>
                    <select
                      value={showCustomParticipantInput ? -1 : formData.max_participants}
                      onChange={(event) => {
                        const value = Number.parseInt(event.target.value, 10);
                        if (value === -1) {
                          setCustomParticipants(formData.max_participants || 50);
                          return;
                        }
                        setCustomParticipants(null);
                        setFormData((prev) => ({ ...prev, max_participants: value }));
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      {PARTICIPANT_OPTIONS.map((value) => (
                        <option key={value} value={value}>{`${value} nguoi`}</option>
                      ))}
                      <option value={-1}>Tuy chinh...</option>
                    </select>
                    {showCustomParticipantInput ? (
                      <input
                        type="number"
                        min={1}
                        value={customParticipants ?? formData.max_participants}
                        onChange={(event) => {
                          const value = Number.parseInt(event.target.value || '0', 10);
                          setCustomParticipants(value);
                          setFormData((prev) => ({ ...prev, max_participants: value }));
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="Nhap so luong"
                      />
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Loai hoat dong</label>
                    <select
                      value={formData.activity_type_id ?? ''}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          activity_type_id: event.target.value ? Number.parseInt(event.target.value, 10) : null,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="">Chon loai</option>
                      {activityTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Cap to chuc</label>
                  <select
                    value={formData.organization_level_id ?? ''}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        organization_level_id: event.target.value ? Number.parseInt(event.target.value, 10) : null,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Chon cap</option>
                    {orgLevels.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="border-b pb-2 font-semibold text-gray-900">Lop hoc tham gia</h3>
                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-gray-200 p-3 md:grid-cols-3">
                  {classes.map((cls) => (
                    <label key={cls.id} className="flex items-center gap-2 rounded p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.class_ids.includes(cls.id)}
                        onChange={() => handleClassToggle(cls.id)}
                      />
                      <span className="text-sm text-gray-700">{cls.name}</span>
                    </label>
                  ))}
                </div>
              </section>

              {!activityId ? (
                <section className="space-y-4">
                  <h3 className="border-b pb-2 font-semibold text-gray-900">Tai lieu dinh kem</h3>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2"
                    disabled={files.length >= 5}
                  >
                    <Upload className="h-4 w-4" />
                    Chon file (toi da 5)
                  </button>

                  <ul className="space-y-2">
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${index}`}
                        draggable
                        onDragStart={() => setDraggedIdx(index)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggedIdx === null || draggedIdx === index) return;
                          const next = [...files];
                          const [moved] = next.splice(draggedIdx, 1);
                          next.splice(index, 0, moved);
                          setFiles(next);
                          setDraggedIdx(index);
                        }}
                        onDragEnd={() => setDraggedIdx(null)}
                        className="flex items-center justify-between rounded border bg-gray-50 p-2"
                      >
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <span>{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== index))}
                          className="text-red-600"
                          aria-label={`Xoa file ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  {uploading ? (
                    <div className="flex items-center gap-2 rounded bg-blue-50 p-3 text-blue-600">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Dang tai file len...</span>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={handleClose} className="rounded-md border border-gray-300 px-4 py-2 text-gray-700">
                  Huy
                </button>
                {!activityId ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      setSubmitMode('draft');
                      void handleSubmit(event as unknown as React.FormEvent, 'draft');
                    }}
                    disabled={loading || uploading}
                    className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-white disabled:opacity-50"
                  >
                    {loading && submitMode === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Luu nhap
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(event) => {
                    setSubmitMode('submit');
                    void handleSubmit(event as unknown as React.FormEvent, 'submit');
                  }}
                  disabled={loading || uploading}
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-2 text-white disabled:opacity-50"
                >
                  {loading && submitMode === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : activityId ? <Save className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {activityId ? 'Luu thay doi' : 'Gui duyet'}
                </button>
              </div>
            </>
          )}
        </form>

        {loading ? (
          <FullScreenLoader
            message={activityId ? 'Dang cap nhat hoat dong...' : 'Dang tao hoat dong...'}
          />
        ) : null}
      </div>
    </div>
  );
}
