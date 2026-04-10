'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Lock, Save, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface ActivityType {
  id: number;
  name: string;
}

interface OrganizationLevel {
  id: number;
  name: string;
}

interface Class {
  id: number;
  name: string;
}

interface ParticipationPreviewStudent {
  id: number;
  name: string;
  email: string | null;
  participation_mode?: 'mandatory' | 'voluntary';
  resolved_mode?: 'mandatory' | 'voluntary';
  was_conflicted?: boolean;
}

interface ParticipationPreviewGroup {
  class_id: number;
  class_name: string;
  participation_mode?: 'mandatory' | 'voluntary';
  mandatory_count: number;
  voluntary_count: number;
  conflict_count: number;
  students: ParticipationPreviewStudent[];
}

interface ParticipationPreview {
  total_classes: number;
  mandatory_participants: number;
  voluntary_participants: number;
  conflict_count: number;
  groups: ParticipationPreviewGroup[];
}

interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  approval_status: 'draft' | 'requested' | 'approved' | 'rejected';
  rejected_reason?: string | null;
  max_participants: number | null;
  activity_type_id: number | null;
  organization_level_id: number | null;
  class_ids?: number[];
  mandatory_class_ids?: number[];
  voluntary_class_ids?: number[];
  classes?: Array<Class & { participation_mode?: 'mandatory' | 'voluntary' }>;
}

function extractActivity(payload: any): Activity {
  return payload?.activity || payload?.data?.activity || payload?.data || payload;
}

function canEditActivity(activity: Activity): boolean {
  return activity.status === 'draft' && ['draft', 'rejected'].includes(activity.approval_status);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [activityTypeId, setActivityTypeId] = useState<number | ''>('');
  const [organizationLevelId, setOrganizationLevelId] = useState<number | ''>('');
  const [mandatoryClassIds, setMandatoryClassIds] = useState<number[]>([]);
  const [voluntaryClassIds, setVoluntaryClassIds] = useState<number[]>([]);

  const [classes, setClasses] = useState<Class[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [organizationLevels, setOrganizationLevels] = useState<OrganizationLevel[]>([]);
  const [showParticipationPreview, setShowParticipationPreview] = useState(false);
  const [participationPreview, setParticipationPreview] = useState<ParticipationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const selectedClasses = Array.from(new Set([...mandatoryClassIds, ...voluntaryClassIds]));

  useEffect(() => {
    void fetchAllData();
  }, [id]);

  useEffect(() => {
    if (!showParticipationPreview) return;

    if (selectedClasses.length === 0) {
      setParticipationPreview(null);
      setPreviewError(null);
      return;
    }

    let active = true;

    const loadPreview = async () => {
      try {
        setPreviewLoading(true);
        setPreviewError(null);

        const response = await fetch('/api/activities/participation-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class_ids: selectedClasses,
            mandatory_class_ids: mandatoryClassIds,
            voluntary_class_ids: voluntaryClassIds,
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || 'Khong the tai preview tham gia');
        }

        if (!active) return;
        setParticipationPreview(data?.preview || null);
      } catch (error) {
        if (!active) return;
        setParticipationPreview(null);
        setPreviewError(getErrorMessage(error, 'Khong the tai preview tham gia'));
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      active = false;
    };
  }, [showParticipationPreview, selectedClasses, mandatoryClassIds, voluntaryClassIds]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [activityRes, classesRes, typesRes, levelsRes] = await Promise.all([
        fetch(`/api/activities/${id}`),
        fetch('/api/classes?mine=1'),
        fetch('/api/activity-types'),
        fetch('/api/organization-levels'),
      ]);

      if (!activityRes.ok) {
        throw new Error('Khong the tai hoat dong');
      }

      const nextActivity = extractActivity(await activityRes.json());
      if (!canEditActivity(nextActivity)) {
        toast.error('Chi co the chinh sua hoat dong nhap hoac bi tu choi');
        router.push('/teacher/activities');
        return;
      }

      setActivity(nextActivity);
      setTitle(nextActivity.title || '');
      setDescription(nextActivity.description || '');

      const [dateOnly, timeOnly = '00:00'] = String(nextActivity.date_time || '').split('T');
      setDate(dateOnly || '');
      setTime(timeOnly.slice(0, 5) || '00:00');

      setLocation(nextActivity.location || '');
      setMaxParticipants(nextActivity.max_participants || '');
      setActivityTypeId(nextActivity.activity_type_id || '');
      setOrganizationLevelId(nextActivity.organization_level_id || '');
      const fetchedMandatoryClassIds =
        nextActivity.mandatory_class_ids ||
        nextActivity.classes
          ?.filter((item) => (item.participation_mode || 'mandatory') === 'mandatory')
          .map((item) => item.id) ||
        nextActivity.class_ids ||
        [];
      const fetchedVoluntaryClassIds =
        nextActivity.voluntary_class_ids ||
        nextActivity.classes
          ?.filter((item) => (item.participation_mode || 'mandatory') === 'voluntary')
          .map((item) => item.id) ||
        [];
      setMandatoryClassIds(fetchedMandatoryClassIds);
      setVoluntaryClassIds(fetchedVoluntaryClassIds);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setActivityTypes(typesData.activity_types || typesData.activityTypes || typesData.types || []);
      }

      if (levelsRes.ok) {
        const levelsData = await levelsRes.json();
        setOrganizationLevels(
          levelsData.organization_levels || levelsData.organizationLevels || levelsData.levels || []
        );
      }
    } catch (error) {
      console.error(error);
      toast.error('Khong the tai du lieu');
      router.push('/teacher/activities');
    } finally {
      setLoading(false);
    }
  };

  const submitActivity = async (mode: 'draft' | 'submit') => {
    if (!title.trim()) {
      toast.error('Vui long nhap ten hoat dong');
      return;
    }

    if (!description.trim()) {
      toast.error('Vui long nhap mo ta');
      return;
    }

    if (!date) {
      toast.error('Vui long chon ngay');
      return;
    }

    if (!location.trim()) {
      toast.error('Vui long nhap dia diem');
      return;
    }

    if (selectedClasses.length === 0) {
      toast.error('Vui long chon it nhat mot lop');
      return;
    }

    try {
      setSubmitting(true);

      const updatePayload = {
        title: title.trim(),
        description: description.trim(),
        date_time: time ? `${date}T${time}` : `${date}T00:00`,
        location: location.trim(),
        max_participants: maxParticipants ? parseInt(String(maxParticipants), 10) : 30,
        class_ids: selectedClasses,
        ...(activityTypeId ? { activity_type_id: Number(activityTypeId) } : {}),
        ...(organizationLevelId ? { organization_level_id: Number(organizationLevelId) } : {}),
      };

      const updateRes = await fetch(`/api/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const updateData = await updateRes.json().catch(() => null);

      if (!updateRes.ok) {
        throw new Error(
          updateData?.message || updateData?.error || 'Khong the cap nhat hoat dong'
        );
      }

      if (mode === 'submit') {
        const submitRes = await fetch(`/api/activities/${id}/submit-approval`, {
          method: 'POST',
        });
        const submitData = await submitRes.json().catch(() => null);

        if (!submitRes.ok) {
          throw new Error(
            submitData?.message ||
              submitData?.error ||
              'Hoat dong da cap nhat nhung gui duyet that bai'
          );
        }
      }

      toast.success(mode === 'draft' ? 'Luu nhap thanh cong' : 'Gui duyet thanh cong');
      router.push('/teacher/activities');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Khong the cap nhat hoat dong'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitActivity('draft');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="mt-4 text-gray-600">Dang tai...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow">
            <p className="text-gray-600">Khong tim thay hoat dong</p>
          </div>
        </div>
      </div>
    );
  }

  const isRejected = activity.approval_status === 'rejected';
  const canEdit = canEditActivity(activity);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/teacher/activities')}
            className="flex items-center gap-2 text-gray-600 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Quay lai
          </button>

          {!canEdit && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">
              <Lock className="h-5 w-5" />
              <span className="font-medium">Khong the chinh sua hoat dong nay</span>
            </div>
          )}
        </div>

        {isRejected && (
          <div className="mb-6 flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
            <div>
              <p className="font-medium text-orange-900">Hoat dong bi tu choi</p>
              <p className="mt-1 text-sm text-orange-700">
                Vui long cap nhat hoat dong va gui lai de duyet.
              </p>
              {activity.rejected_reason && (
                <p className="mt-2 text-sm text-orange-800">
                  Ly do: {activity.rejected_reason}
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">Thong tin hoat dong</h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Ten hoat dong *</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nhap ten hoat dong"
                required
                disabled={!canEdit}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Mo ta *</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Nhap mo ta chi tiet"
                rows={4}
                required
                disabled={!canEdit}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">Thoi gian va dia diem</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Ngay *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Gio</label>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Dia diem *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Nhap dia diem"
                  required
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">Loai va dung luong</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Loai hoat dong
                </label>
                <select
                  value={activityTypeId}
                  onChange={(event) =>
                    setActivityTypeId(event.target.value ? parseInt(event.target.value, 10) : '')
                  }
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- Chon loai --</option>
                  {activityTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Cap to chuc
                </label>
                <select
                  value={organizationLevelId}
                  onChange={(event) =>
                    setOrganizationLevelId(
                      event.target.value ? parseInt(event.target.value, 10) : ''
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- Chon cap --</option>
                  {organizationLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  So luong toi da
                </label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(event) =>
                    setMaxParticipants(event.target.value ? parseInt(event.target.value, 10) : '')
                  }
                  placeholder="So luong"
                  disabled={!canEdit}
                  min="0"
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">De trong se dung mac dinh 30.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-900">Lop hoc *</h2>
              <button
                type="button"
                onClick={() => setShowParticipationPreview((current) => !current)}
                disabled={!canEdit}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showParticipationPreview ? 'An preview tham gia' : 'Xem preview tham gia'}
              </button>
            </div>
            <div className="space-y-2">
              {classes.length === 0 ? (
                <p className="text-gray-600">Khong co lop nao</p>
              ) : (
                classes.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(item.id)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setMandatoryClassIds((current) =>
                            current.includes(item.id) ? current : [...current, item.id]
                          );
                          setVoluntaryClassIds((current) =>
                            current.filter((classId) => classId !== item.id)
                          );
                        } else {
                          setMandatoryClassIds((current) =>
                            current.filter((classId) => classId !== item.id)
                          );
                          setVoluntaryClassIds((current) =>
                            current.filter((classId) => classId !== item.id)
                          );
                        }
                      }}
                      disabled={!canEdit}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700">{item.name}</span>
                  </label>
                ))
              )}
            </div>
            {showParticipationPreview && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="mb-2 text-sm font-semibold text-blue-900">
                  Preview participation hien tai
                </div>
                {selectedClasses.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Chon it nhat mot lop de xem danh sach tham gia bat buoc.
                  </p>
                ) : previewLoading ? (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                    Dang tai preview...
                  </div>
                ) : previewError ? (
                  <p className="text-sm text-red-600">{previewError}</p>
                ) : participationPreview ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-white p-3">
                        <div className="text-gray-500">So lop</div>
                        <div className="text-lg font-bold text-gray-900">
                          {participationPreview.total_classes}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <div className="text-gray-500">Bat buoc</div>
                        <div className="text-lg font-bold text-orange-700">
                          {participationPreview.mandatory_participants}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      Preview hien tai dang nhom theo lop. Backbone se mo rong them voluntary va
                      conflict preview o batch sau.
                    </div>
                    <div className="space-y-2">
                      {participationPreview.groups.map((group) => (
                        <details
                          key={group.class_id}
                          className="rounded-lg border border-blue-200 bg-white p-3"
                        >
                          <summary className="cursor-pointer list-none font-medium text-gray-800">
                            {group.class_name} • {group.mandatory_count} hoc vien bat buoc
                          </summary>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            {group.students.map((student) => (
                              <div key={student.id} className="flex justify-between gap-3">
                                <span>{student.name}</span>
                                <span className="text-xs text-gray-500">
                                  {student.email || `ID ${student.id}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void submitActivity('draft')}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-200 px-6 py-3 font-bold text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                Luu nhap
              </button>
              <button
                type="button"
                onClick={() => void submitActivity('submit')}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
                Gui duyet
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
