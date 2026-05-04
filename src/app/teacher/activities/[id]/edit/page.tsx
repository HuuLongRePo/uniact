'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, AlertTriangle, ArrowLeft, Lock, Save, Send, X } from 'lucide-react';
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

interface StudentOption {
  id: number;
  name: string;
  email?: string | null;
  class_id?: number | null;
  class_name?: string | null;
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
  direct_students?: ParticipationPreviewStudent[];
}

interface ClassScheduleConflict {
  activity_id: number;
  title: string;
  teacher_name?: string | null;
  date_time: string;
  end_time?: string | null;
  class_id: number;
  class_name: string;
  overlap_minutes: number;
}

type SelectionChecklistItem = {
  id: number;
  label: string;
  meta?: string;
  disabled?: boolean;
};

type SelectionChecklistProps = {
  title: string;
  description: string;
  tone: 'mandatory' | 'voluntary';
  items: SelectionChecklistItem[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  actions?: React.ReactNode;
  emptyText: string;
};

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
  mandatory_student_ids?: number[];
  voluntary_student_ids?: number[];
  applies_to_all_students?: boolean;
  classes?: Array<Class & { participation_mode?: 'mandatory' | 'voluntary' }>;
}

type EditActivityFormSnapshot = {
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  maxParticipants: number | '';
  activityTypeId: number | '';
  organizationLevelId: number | '';
  mandatoryClassIds: number[];
  voluntaryClassIds: number[];
  mandatoryStudentIds: number[];
  voluntaryStudentIds: number[];
  appliesToAllStudents: boolean;
};

function extractActivity(payload: any): Activity {
  return payload?.activity || payload?.data?.activity || payload?.data || payload;
}

function canEditActivity(activity: Activity): boolean {
  return activity.status === 'draft' && ['draft', 'rejected'].includes(activity.approval_status);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function normalizeIdList(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

function createFormSnapshot(
  snapshot: EditActivityFormSnapshot
): Omit<
  EditActivityFormSnapshot,
  'mandatoryClassIds' | 'voluntaryClassIds' | 'mandatoryStudentIds' | 'voluntaryStudentIds'
> & {
  mandatoryClassIds: number[];
  voluntaryClassIds: number[];
  mandatoryStudentIds: number[];
  voluntaryStudentIds: number[];
} {
  return {
    ...snapshot,
    title: snapshot.title.trim(),
    description: snapshot.description.trim(),
    date: snapshot.date.trim(),
    time: snapshot.time.trim(),
    endTime: snapshot.endTime.trim(),
    location: snapshot.location.trim(),
    mandatoryClassIds: normalizeIdList(snapshot.mandatoryClassIds),
    voluntaryClassIds: normalizeIdList(snapshot.voluntaryClassIds),
    mandatoryStudentIds: normalizeIdList(snapshot.mandatoryStudentIds),
    voluntaryStudentIds: normalizeIdList(snapshot.voluntaryStudentIds),
  };
}

function serializeFormSnapshot(snapshot: EditActivityFormSnapshot): string {
  return JSON.stringify(createFormSnapshot(snapshot));
}

function SelectionChecklist({
  title,
  description,
  tone,
  items,
  selectedIds,
  onToggle,
  actions,
  emptyText,
}: SelectionChecklistProps) {
  const selectedSet = new Set(selectedIds);
  const palette =
    tone === 'mandatory'
      ? {
          border: 'border-orange-200',
          bg: 'bg-orange-50',
          titleClass: 'text-orange-900',
          textClass: 'text-orange-700',
          accent: 'accent-orange-600',
        }
      : {
          border: 'border-sky-200',
          bg: 'bg-sky-50',
          titleClass: 'text-sky-900',
          textClass: 'text-sky-700',
          accent: 'accent-sky-600',
        };

  return (
    <section className={`rounded-xl border ${palette.border} ${palette.bg} p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`text-sm font-semibold ${palette.titleClass}`}>{title}</h3>
          <p className={`mt-1 text-xs ${palette.textClass}`}>{description}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">
          {selectedIds.length} da chon
        </span>
      </div>

      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}

      {items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white/80 px-3 py-4 text-sm text-gray-500">
          {emptyText}
        </div>
      ) : (
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <label
              key={`${tone}-${item.id}`}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border border-white/80 bg-white px-3 py-2 shadow-sm transition hover:border-gray-200 ${
                item.disabled ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedSet.has(item.id)}
                disabled={item.disabled}
                onChange={() => onToggle(item.id)}
                className={`mt-1 h-4 w-4 ${palette.accent}`}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">{item.label}</span>
                {item.meta ? (
                  <span className="block text-xs text-gray-500">{item.meta}</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

export default function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [activityTypeId, setActivityTypeId] = useState<number | ''>('');
  const [organizationLevelId, setOrganizationLevelId] = useState<number | ''>('');
  const [mandatoryClassIds, setMandatoryClassIds] = useState<number[]>([]);
  const [voluntaryClassIds, setVoluntaryClassIds] = useState<number[]>([]);
  const [mandatoryStudentIds, setMandatoryStudentIds] = useState<number[]>([]);
  const [voluntaryStudentIds, setVoluntaryStudentIds] = useState<number[]>([]);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [appliesToAllStudents, setAppliesToAllStudents] = useState(false);

  const [classes, setClasses] = useState<Class[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [organizationLevels, setOrganizationLevels] = useState<OrganizationLevel[]>([]);
  const [showParticipationPreview, setShowParticipationPreview] = useState(false);
  const [participationPreview, setParticipationPreview] = useState<ParticipationPreview | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [classScheduleConflicts, setClassScheduleConflicts] = useState<ClassScheduleConflict[]>([]);
  const [checkingClassScheduleConflict, setCheckingClassScheduleConflict] = useState(false);
  const [classScheduleConflictError, setClassScheduleConflictError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'basic' | 'scope' | 'submit'>('basic');
  const selectedClasses = useMemo(
    () => Array.from(new Set([...mandatoryClassIds, ...voluntaryClassIds])),
    [mandatoryClassIds, voluntaryClassIds]
  );
  const hasBlockingClassScheduleConflict = classScheduleConflicts.length > 0;
  const filteredStudentOptions = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();
    if (!keyword) return studentOptions;

    return studentOptions.filter((student) => {
      const haystack = [student.name, student.email, student.class_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [studentOptions, studentSearch]);
  const filteredClasses = useMemo(() => {
    const keyword = classSearch.trim().toLowerCase();
    if (!keyword) return classes;

    return classes.filter((classItem) => classItem.name.toLowerCase().includes(keyword));
  }, [classSearch, classes]);
  const mandatoryClassItems = useMemo(
    () =>
      filteredClasses.map((classItem) => ({
        id: classItem.id,
        label: classItem.name,
        meta: 'Gán bắt buộc cho toàn bộ học viên trong lớp này',
      })),
    [filteredClasses]
  );
  const voluntaryClassItems = useMemo(
    () =>
      filteredClasses.map((classItem) => ({
        id: classItem.id,
        label: classItem.name,
        meta: mandatoryClassIds.includes(classItem.id)
          ? 'Đã thuộc nhóm bắt buộc nên không thể đồng thời ở nhóm đăng ký'
          : 'Cho phép học viên lớp này tự đăng ký tham gia',
        disabled: mandatoryClassIds.includes(classItem.id),
      })),
    [filteredClasses, mandatoryClassIds]
  );
  const mandatoryStudentItems = useMemo(
    () =>
      filteredStudentOptions.map((student) => ({
        id: student.id,
        label: student.name,
        meta:
          [student.class_name, student.email].filter(Boolean).join(' • ') || 'Chưa có thông tin lớp',
      })),
    [filteredStudentOptions]
  );
  const voluntaryStudentItems = useMemo(
    () =>
      filteredStudentOptions.map((student) => ({
        id: student.id,
        label: student.name,
        meta:
          [student.class_name, student.email].filter(Boolean).join(' • ') || 'Chưa có thông tin lớp',
        disabled: mandatoryStudentIds.includes(student.id),
      })),
    [filteredStudentOptions, mandatoryStudentIds]
  );
  const currentFormSnapshot = useMemo(
    () =>
      serializeFormSnapshot({
        title,
        description,
        date,
        time,
        endTime,
        location,
        maxParticipants,
        activityTypeId,
        organizationLevelId,
        mandatoryClassIds,
        voluntaryClassIds,
        mandatoryStudentIds,
        voluntaryStudentIds,
        appliesToAllStudents,
      }),
    [
      activityTypeId,
      appliesToAllStudents,
      date,
      description,
      endTime,
      location,
      mandatoryClassIds,
      mandatoryStudentIds,
      maxParticipants,
      organizationLevelId,
      time,
      title,
      voluntaryClassIds,
      voluntaryStudentIds,
    ]
  );
  const isFormDirty = useMemo(() => {
    if (loading || !activity || initialFormSnapshot === null) return false;
    return currentFormSnapshot !== initialFormSnapshot;
  }, [activity, currentFormSnapshot, initialFormSnapshot, loading]);

  useEffect(() => {
    void fetchAllData();
  }, [id]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isFormDirty || submitting) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty, submitting]);

  const toggleClassSelection = (scope: 'mandatory' | 'voluntary', classId: number) => {
    if (scope === 'mandatory') {
      setMandatoryClassIds((current) =>
        current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId]
      );
      setVoluntaryClassIds((current) => current.filter((id) => id !== classId));
      return;
    }

    if (mandatoryClassIds.includes(classId)) {
      return;
    }

    setVoluntaryClassIds((current) =>
      current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId]
    );
  };

  const applyClassSelection = (scope: 'mandatory' | 'voluntary', classIds: number[]) => {
    if (classIds.length === 0) return;

    if (scope === 'mandatory') {
      setMandatoryClassIds((current) => Array.from(new Set([...current, ...classIds])));
      setVoluntaryClassIds((current) => current.filter((id) => !classIds.includes(id)));
      return;
    }

    const allowedClassIds = classIds.filter((id) => !mandatoryClassIds.includes(id));
    setVoluntaryClassIds((current) => Array.from(new Set([...current, ...allowedClassIds])));
  };

  const clearClassSelection = (scope: 'mandatory' | 'voluntary') => {
    if (scope === 'mandatory') {
      setMandatoryClassIds([]);
      return;
    }

    setVoluntaryClassIds([]);
  };

  const toggleStudentSelection = (scope: 'mandatory' | 'voluntary', studentId: number) => {
    if (scope === 'mandatory') {
      setMandatoryStudentIds((current) =>
        current.includes(studentId)
          ? current.filter((id) => id !== studentId)
          : [...current, studentId]
      );
      setVoluntaryStudentIds((current) => current.filter((id) => id !== studentId));
      return;
    }

    if (mandatoryStudentIds.includes(studentId)) {
      return;
    }

    setVoluntaryStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  };

  const applyStudentSelection = (scope: 'mandatory' | 'voluntary', studentIds: number[]) => {
    if (studentIds.length === 0) return;

    if (scope === 'mandatory') {
      setMandatoryStudentIds((current) => Array.from(new Set([...current, ...studentIds])));
      setVoluntaryStudentIds((current) => current.filter((id) => !studentIds.includes(id)));
      return;
    }

    const allowedStudentIds = studentIds.filter((id) => !mandatoryStudentIds.includes(id));
    setVoluntaryStudentIds((current) => Array.from(new Set([...current, ...allowedStudentIds])));
  };

  const clearStudentSelection = (scope: 'mandatory' | 'voluntary') => {
    if (scope === 'mandatory') {
      setMandatoryStudentIds([]);
      return;
    }

    setVoluntaryStudentIds([]);
  };

  const addStudentsFromClassScope = (scope: 'mandatory' | 'voluntary') => {
    const sourceClassIds = scope === 'mandatory' ? mandatoryClassIds : voluntaryClassIds;
    const sourceStudentIds = studentOptions
      .filter((student) => sourceClassIds.includes(Number(student.class_id)))
      .map((student) => student.id);

    applyStudentSelection(scope, sourceStudentIds);
  };

  const ensureStudentOptionsLoaded = async () => {
    if (studentsLoaded || studentsLoading) return;

    try {
      setStudentsLoading(true);
      const response = await fetch('/api/teacher/students');
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Không thể tải danh sách học viên');
      }

      setStudentOptions(data?.students || data?.data?.students || []);
      setStudentsLoaded(true);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách học viên'));
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (!showParticipationPreview) return;

    if (
      appliesToAllStudents ||
      (selectedClasses.length === 0 &&
        mandatoryStudentIds.length === 0 &&
        voluntaryStudentIds.length === 0)
    ) {
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
            mandatory_student_ids: mandatoryStudentIds,
            voluntary_student_ids: voluntaryStudentIds,
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || 'Không thể tải danh sách xem trước tham gia');
        }

        if (!active) return;
        setParticipationPreview(data?.preview || null);
      } catch (error) {
        if (!active) return;
        setParticipationPreview(null);
        setPreviewError(getErrorMessage(error, 'Không thể tải danh sách xem trước tham gia'));
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
  }, [
    showParticipationPreview,
    selectedClasses,
    mandatoryClassIds,
    voluntaryClassIds,
    mandatoryStudentIds,
    voluntaryStudentIds,
    appliesToAllStudents,
  ]);

  useEffect(() => {
    const hasScopedClasses = !appliesToAllStudents && selectedClasses.length > 0;
    if (!date || !hasScopedClasses) {
      setClassScheduleConflicts([]);
      setClassScheduleConflictError(null);
      setCheckingClassScheduleConflict(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const scheduleCheck = window.setTimeout(async () => {
      try {
        setCheckingClassScheduleConflict(true);
        setClassScheduleConflictError(null);

        const response = await fetch('/api/activities/check-conflicts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            date_time: time ? `${date}T${time}` : `${date}T00:00`,
            ...(endTime ? { end_time: `${date}T${endTime}` } : {}),
            class_ids: selectedClasses,
            mandatory_class_ids: mandatoryClassIds,
            voluntary_class_ids: voluntaryClassIds,
            applies_to_all_students: appliesToAllStudents,
            exclude_activity_id: Number(id),
          }),
        });
        const data = await response.json().catch(() => null);

        if (!active) return;
        if (!response.ok) {
          throw new Error(data?.error || 'Không thể kiểm tra xung đột lịch lớp');
        }

        const conflicts =
          data?.class_schedule_conflicts || data?.data?.class_schedule_conflicts || [];
        setClassScheduleConflicts(Array.isArray(conflicts) ? conflicts : []);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setClassScheduleConflicts([]);
        setClassScheduleConflictError(getErrorMessage(error, 'Không thể kiểm tra xung đột lịch lớp'));
      } finally {
        if (active) {
          setCheckingClassScheduleConflict(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(scheduleCheck);
    };
  }, [
    id,
    date,
    time,
    endTime,
    selectedClasses,
    mandatoryClassIds,
    voluntaryClassIds,
    appliesToAllStudents,
  ]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setInitialFormSnapshot(null);

      const [activityRes, classesRes, typesRes, levelsRes] = await Promise.all([
        fetch(`/api/activities/${id}`),
        fetch('/api/classes'),
        fetch('/api/activity-types'),
        fetch('/api/organization-levels'),
      ]);

      if (!activityRes.ok) {
        throw new Error('Không thể tải hoạt động');
      }

      const nextActivity = extractActivity(await activityRes.json());
      if (!canEditActivity(nextActivity)) {
        toast.error('Chỉ có thể chỉnh sửa hoạt động nháp hoặc bị từ chối');
        router.push('/teacher/activities');
        return;
      }

      setActivity(nextActivity);
      setTitle(nextActivity.title || '');
      setDescription(nextActivity.description || '');

      const [dateOnly, timeOnly = '00:00'] = String(nextActivity.date_time || '').split('T');
      setDate(dateOnly || '');
      setTime(timeOnly.slice(0, 5) || '00:00');
      setEndTime(
        typeof (nextActivity as any).end_time === 'string'
          ? String((nextActivity as any).end_time)
              .split('T')[1]
              ?.slice(0, 5) || ''
          : ''
      );

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
      setMandatoryStudentIds(nextActivity.mandatory_student_ids || []);
      setVoluntaryStudentIds(nextActivity.voluntary_student_ids || []);
      const nextAppliesToAllStudents =
        Boolean(nextActivity.applies_to_all_students) ||
        (fetchedMandatoryClassIds.length === 0 &&
          fetchedVoluntaryClassIds.length === 0 &&
          (nextActivity.mandatory_student_ids || []).length === 0 &&
          (nextActivity.voluntary_student_ids || []).length === 0);
      setAppliesToAllStudents(nextAppliesToAllStudents);
      setInitialFormSnapshot(
        serializeFormSnapshot({
          title: nextActivity.title || '',
          description: nextActivity.description || '',
          date: dateOnly || '',
          time: timeOnly.slice(0, 5) || '00:00',
          endTime:
            typeof (nextActivity as any).end_time === 'string'
              ? String((nextActivity as any).end_time)
                  .split('T')[1]
                  ?.slice(0, 5) || ''
              : '',
          location: nextActivity.location || '',
          maxParticipants: nextActivity.max_participants || '',
          activityTypeId: nextActivity.activity_type_id || '',
          organizationLevelId: nextActivity.organization_level_id || '',
          mandatoryClassIds: fetchedMandatoryClassIds,
          voluntaryClassIds: fetchedVoluntaryClassIds,
          mandatoryStudentIds: nextActivity.mandatory_student_ids || [],
          voluntaryStudentIds: nextActivity.voluntary_student_ids || [],
          appliesToAllStudents: nextAppliesToAllStudents,
        })
      );

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setActivityTypes(
          typesData.activity_types || typesData.activityTypes || typesData.types || []
        );
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

    if (
      !appliesToAllStudents &&
      selectedClasses.length === 0 &&
      mandatoryStudentIds.length === 0 &&
      voluntaryStudentIds.length === 0
    ) {
      toast.error('Vui long chon it nhat mot lop hoac hoc vien truc tiep, hoac bat mo cho tat ca hoc vien');
      return;
    }

    if (hasBlockingClassScheduleConflict) {
      toast.error('Lop da co hoat dong trung gio. Vui long xu ly xung dot truoc khi luu.');
      return;
    }

    try {
      setSubmitting(true);

      const updatePayload = {
        title: title.trim(),
        description: description.trim(),
        date_time: time ? `${date}T${time}` : `${date}T00:00`,
        end_time: endTime ? `${date}T${endTime}` : null,
        location: location.trim(),
        max_participants: maxParticipants ? parseInt(String(maxParticipants), 10) : 30,
        class_ids: appliesToAllStudents ? [] : selectedClasses,
        mandatory_class_ids: appliesToAllStudents ? [] : mandatoryClassIds,
        voluntary_class_ids: appliesToAllStudents ? [] : voluntaryClassIds,
        mandatory_student_ids: appliesToAllStudents ? [] : mandatoryStudentIds,
        voluntary_student_ids: appliesToAllStudents ? [] : voluntaryStudentIds,
        applies_to_all_students: appliesToAllStudents,
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
        if (updateRes.status === 409 && updateData?.code === 'CLASS_SCHEDULE_CONFLICT') {
          const serverConflicts = updateData?.details?.class_schedule_conflicts;
          setClassScheduleConflicts(Array.isArray(serverConflicts) ? serverConflicts : []);
          setClassScheduleConflictError(
            updateData?.error || 'Lop da co hoat dong trung gio. Vui long doi thoi gian hoac pham vi lop.'
          );
        }
        throw new Error(updateData?.message || updateData?.error || 'Không thể cập nhật hoạt động');
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

      toast.success(mode === 'draft' ? 'Luu nhap thanh cong' : 'Da gui duyet hoat dong');
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
                <p className="mt-2 text-sm text-orange-800">Ly do: {activity.rejected_reason}</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="sticky top-4 z-10 rounded-lg border border-gray-200 bg-white p-3 shadow">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[
                { key: 'basic', label: 'Buoc 1: Thong tin' },
                { key: 'scope', label: 'Buoc 2: Pham vi va phan loai' },
                { key: 'submit', label: 'Buoc 3: Kiem tra va gui' },
              ].map((step) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setCurrentStep(step.key as 'basic' | 'scope' | 'submit')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${currentStep === step.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {step.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={() =>
                  setCurrentStep((current) =>
                    current === 'submit' ? 'scope' : current === 'scope' ? 'basic' : 'basic'
                  )
                }
                disabled={currentStep === 'basic'}
                className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Quay lai buoc truoc
              </button>
              <div className="text-center text-gray-600">
                <div className="font-medium text-gray-800">
                  {currentStep === 'basic'
                    ? 'Tien do 1/3, dang cap nhat thong tin chinh.'
                    : currentStep === 'scope'
                      ? 'Tien do 2/3, dang dieu chinh pham vi va phan loai.'
                      : 'Tien do 3/3, da san sang kiem tra va gui lai hoat dong.'}
                </div>
                <div className="text-xs text-gray-500">
                  {currentStep === 'basic'
                    ? 'Di tiep sang buoc 2 de ra soat lop, hoc vien va phan loai ap dung.'
                    : currentStep === 'scope'
                      ? 'Sau khi chot pham vi, sang buoc 3 de bat cac hanh dong luu nhap hoac gui duyet.'
                      : 'Ban dang o buoc cuoi, co the luu nhap hoac gui duyet ngay.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCurrentStep((current) =>
                    current === 'basic' ? 'scope' : current === 'scope' ? 'submit' : 'submit'
                  )
                }
                disabled={currentStep === 'submit'}
                className="rounded-lg border px-4 py-2 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                Sang buoc tiep theo
              </button>
            </div>
          </div>
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">Thông tin hoạt động</h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tên hoạt động *
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nhập tên hoạt động"
                required
                disabled={!canEdit}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Mô tả *</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Nhập mô tả chi tiết"
                rows={4}
                required
                disabled={!canEdit}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">Thời gian và địa điểm</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Ngày *</label>
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
                <label className="mb-2 block text-sm font-medium text-gray-700">Giờ bắt đầu</label>
                <div className="relative">
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {time ? (
                    <button
                      type="button"
                      onClick={() => setTime('')}
                      disabled={!canEdit}
                      aria-label="Xóa giờ bắt đầu"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Giờ kết thúc</label>
                <div className="relative">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {endTime ? (
                    <button
                      type="button"
                      onClick={() => setEndTime('')}
                      disabled={!canEdit}
                      aria-label="Xóa giờ kết thúc"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Địa điểm *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Nhập địa điểm"
                  required
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">Loại và dung lượng</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Loại hoạt động
                </label>
                <select
                  value={activityTypeId}
                  onChange={(event) =>
                    setActivityTypeId(event.target.value ? parseInt(event.target.value, 10) : '')
                  }
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- Chọn loại --</option>
                  {activityTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Cấp tổ chức</label>
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
                  <option value="">-- Chọn cấp --</option>
                  {organizationLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Số lượng tối đa
                </label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(event) =>
                    setMaxParticipants(event.target.value ? parseInt(event.target.value, 10) : '')
                  }
                  placeholder="Số lượng"
                  disabled={!canEdit}
                  min="0"
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">Để trống sẽ dùng mặc định 30.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-900">Phạm vi lớp áp dụng *</h2>
              <button
                type="button"
                onClick={() => setShowParticipationPreview((current) => !current)}
                disabled={!canEdit}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showParticipationPreview
                  ? 'An xem truoc danh sach tham gia'
                  : 'Xem truoc danh sach tham gia'}
              </button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <label className="mb-3 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                <input
                  type="checkbox"
                  checked={appliesToAllStudents}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setAppliesToAllStudents(checked);
                    if (checked) {
                      setMandatoryClassIds([]);
                      setVoluntaryClassIds([]);
                      setMandatoryStudentIds([]);
                      setVoluntaryStudentIds([]);
                      setShowParticipationPreview(false);
                    }
                  }}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">Mở đăng ký cho tất cả học viên</span>
                  <span className="block text-xs text-emerald-800">
                    Khi bật, hoạt động sẽ không giới hạn theo lớp và sinh viên đủ điều kiện có thể
                    nhìn thấy để đăng ký.
                  </span>
                </span>
              </label>
              <p className="font-medium">
                {appliesToAllStudents
                  ? 'Hoạt động này đang mở cho tất cả học viên, không cần chọn lớp áp dụng.'
                  : 'Hãy chọn rõ lớp bắt buộc và lớp tự nguyện cho hoạt động này.'}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
                <li>
                  <strong>Bắt buộc:</strong> sinh viên trong lớp sẽ được áp dụng bắt buộc, không cần
                  tự đăng ký.
                </li>
                <li>
                  <strong>Tự nguyện:</strong> sinh viên trong lớp được phép tự đăng ký.
                </li>
                <li>
                  Nếu một lớp xuất hiện ở cả hai nhóm, hệ thống sẽ ưu tiên <strong>bắt buộc</strong>
                  .
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {'Ch\u1ecdn l\u1edbp theo checklist'}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {
                      'Kh\u00f4ng c\u00f2n ph\u1ee5 thu\u1ed9c Ctrl/Cmd multi-select. C\u00f3 th\u1ec3 l\u1ecdc, ch\u1ecdn nhanh v\u00e0 ph\u1ed1i h\u1ee3p nhi\u1ec1u l\u1edbp b\u1eaft bu\u1ed9c/\u0111\u01b0\u1ee3c \u0111\u0103ng k\u00fd.'
                    }
                  </p>
                </div>
                <div className="text-xs font-medium text-gray-500">
                  {`T\u1ed5ng ${selectedClasses.length}/${classes.length} l\u1edbp trong ph\u1ea1m vi`}
                </div>
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  value={classSearch}
                  onChange={(event) => setClassSearch(event.target.value)}
                  placeholder={'L\u1ecdc theo t\u00ean l\u1edbp'}
                  disabled={!canEdit || appliesToAllStudents}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {`Hi\u1ec3n th\u1ecb ${filteredClasses.length}/${classes.length} l\u1edbp ph\u00f9 h\u1ee3p.`}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SelectionChecklist
                  title={'L\u1edbp b\u1eaft bu\u1ed9c'}
                  description={
                    'C\u00e1c l\u1edbp n\u00e0y s\u1ebd \u0111\u01b0\u1ee3c g\u00e1n di\u1ec7n b\u1eaft bu\u1ed9c tham gia.'
                  }
                  tone="mandatory"
                  items={mandatoryClassItems}
                  selectedIds={mandatoryClassIds}
                  onToggle={(classId) => toggleClassSelection('mandatory', classId)}
                  emptyText={'Kh\u00f4ng c\u00f3 l\u1edbp n\u00e0o kh\u1edbp b\u1ed9 l\u1ecdc hi\u1ec7n t\u1ea1i.'}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          applyClassSelection(
                            'mandatory',
                            filteredClasses.map((classItem) => classItem.id)
                          )
                        }
                        disabled={!canEdit || appliesToAllStudents}
                        className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                      >
                        {'Ch\u1ecdn t\u1ea5t c\u1ea3 \u0111ang l\u1ecdc'}
                      </button>
                      <button
                        type="button"
                        onClick={() => clearClassSelection('mandatory')}
                        disabled={!canEdit || appliesToAllStudents}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {'X\u00f3a ch\u1ecdn'}
                      </button>
                    </>
                  }
                />
                <SelectionChecklist
                  title={'L\u1edbp \u0111\u01b0\u1ee3c \u0111\u0103ng k\u00fd'}
                  description={
                    'C\u00e1c l\u1edbp n\u00e0y c\u00f3 th\u1ec3 t\u1ef1 \u0111\u0103ng k\u00fd n\u1ebfu mu\u1ed1n tham gia.'
                  }
                  tone="voluntary"
                  items={voluntaryClassItems}
                  selectedIds={voluntaryClassIds}
                  onToggle={(classId) => toggleClassSelection('voluntary', classId)}
                  emptyText={'Kh\u00f4ng c\u00f3 l\u1edbp n\u00e0o kh\u1edbp b\u1ed9 l\u1ecdc hi\u1ec7n t\u1ea1i.'}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          applyClassSelection(
                            'voluntary',
                            filteredClasses.map((classItem) => classItem.id)
                          )
                        }
                        disabled={!canEdit || appliesToAllStudents}
                        className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                      >
                        {'Ch\u1ecdn t\u1ea5t c\u1ea3 \u0111ang l\u1ecdc'}
                      </button>
                      <button
                        type="button"
                        onClick={() => clearClassSelection('voluntary')}
                        disabled={!canEdit || appliesToAllStudents}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {'X\u00f3a ch\u1ecdn'}
                      </button>
                    </>
                  }
                />
              </div>
            </div>

            {!appliesToAllStudents && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Chọn học viên trực tiếp</p>
                    <p className="text-xs text-blue-800">
                      Tải danh sách học viên theo yêu cầu để bổ sung học viên ngoài phạm vi lớp mà
                      không cần reload trang.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void ensureStudentOptionsLoaded()}
                    disabled={studentsLoading}
                    className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
                  >
                    {studentsLoading
                      ? 'Đang tải...'
                      : studentsLoaded
                        ? 'Làm mới danh sách học viên'
                        : 'Tải danh sách học viên'}
                  </button>
                </div>
                {studentsLoaded ? (
                  <>
                    <p className="mt-2 text-xs text-blue-800">
                      Đã nạp {studentOptions.length} học viên. Đang chọn {mandatoryStudentIds.length}{' '}
                      bắt buộc và {voluntaryStudentIds.length} được đăng ký.
                    </p>
                    <div className="mt-3">
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="Lọc theo tên, email hoặc lớp"
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200"
                        disabled={!canEdit}
                      />
                      <p className="mt-1 text-xs text-blue-800">
                        Hiển thị {filteredStudentOptions.length}/{studentOptions.length} học viên phù
                        hợp.
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <SelectionChecklist
                        title="Học viên bắt buộc"
                        description="Chọn vài học viên của nhiều lớp hoặc dùng thao tác nhanh để lấy theo lớp bắt buộc."
                        tone="mandatory"
                        items={mandatoryStudentItems}
                        selectedIds={mandatoryStudentIds}
                        onToggle={(studentId) => toggleStudentSelection('mandatory', studentId)}
                        emptyText="Không có học viên nào khớp bộ lọc hiện tại."
                        actions={
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                applyStudentSelection(
                                  'mandatory',
                                  filteredStudentOptions.map((student) => student.id)
                                )
                              }
                              disabled={!canEdit}
                              className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-60"
                            >
                              Chọn tất cả đang lọc
                            </button>
                            <button
                              type="button"
                              onClick={() => addStudentsFromClassScope('mandatory')}
                              disabled={!canEdit}
                              className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-60"
                            >
                              Lấy từ lớp bắt buộc
                            </button>
                            <button
                              type="button"
                              onClick={() => clearStudentSelection('mandatory')}
                              disabled={!canEdit}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                            >
                              Xóa chọn
                            </button>
                          </>
                        }
                      />
                      <SelectionChecklist
                        title="Học viên được đăng ký"
                        description="Chọn học viên được phép đăng ký nhưng không bị bắt buộc tham gia."
                        tone="voluntary"
                        items={voluntaryStudentItems}
                        selectedIds={voluntaryStudentIds}
                        onToggle={(studentId) => toggleStudentSelection('voluntary', studentId)}
                        emptyText="Không có học viên nào khớp bộ lọc hiện tại."
                        actions={
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                applyStudentSelection(
                                  'voluntary',
                                  filteredStudentOptions.map((student) => student.id)
                                )
                              }
                              disabled={!canEdit}
                              className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                            >
                              Chọn tất cả đang lọc
                            </button>
                            <button
                              type="button"
                              onClick={() => addStudentsFromClassScope('voluntary')}
                              disabled={!canEdit}
                              className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                            >
                              Lấy từ lớp được đăng ký
                            </button>
                            <button
                              type="button"
                              onClick={() => clearStudentSelection('voluntary')}
                              disabled={!canEdit}
                              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                            >
                              Xóa chọn
                            </button>
                          </>
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {!appliesToAllStudents && showParticipationPreview && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="mb-2 text-sm font-semibold text-blue-900">
                  Xem truoc danh sach tham gia hien tai
                </div>
                {selectedClasses.length === 0 &&
                mandatoryStudentIds.length === 0 &&
                voluntaryStudentIds.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Chọn ít nhất một lớp hoặc học viên trực tiếp để xem danh sách dự kiến theo phạm
                    vi bắt buộc hoặc tự nguyện.
                  </p>
                ) : previewLoading ? (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                    Đang tải danh sách xem trước...
                  </div>
                ) : previewError ? (
                  <p className="text-sm text-red-600">{previewError}</p>
                ) : participationPreview ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-white p-3">
                        <div className="text-gray-500">Số lớp</div>
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
                      Danh sach hien duoc nhom theo lop va hoc vien chon truc tiep. Neu mot lop hoac
                      hoc vien xuat hien o ca hai nhom, he thong se uu tien bat buoc hon tu nguyen.
                    </div>
                    {participationPreview.direct_students &&
                    participationPreview.direct_students.length > 0 ? (
                      <details className="rounded-lg border border-emerald-200 bg-white p-3">
                        <summary className="cursor-pointer list-none font-medium text-gray-800">
                          Hoc vien chon truc tiep • {participationPreview.direct_students.length}{' '}
                          hoc vien
                        </summary>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {participationPreview.direct_students.map((student) => (
                            <div
                              key={`direct-${student.id}`}
                              className="flex justify-between gap-3"
                            >
                              <div>
                                <span>{student.name}</span>
                                <span className="ml-2 text-xs font-medium text-emerald-700">
                                  {student.resolved_mode === 'mandatory' ? 'Bat buoc' : 'Tu nguyen'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {student.email || `ID ${student.id}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
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

          {canEdit && !appliesToAllStudents && selectedClasses.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Kiem tra trung lich lop</p>
                  {checkingClassScheduleConflict ? (
                    <p>Dang kiem tra xung dot lich voi cac hoat dong da cong bo...</p>
                  ) : classScheduleConflictError ? (
                    <p className="text-red-700">{classScheduleConflictError}</p>
                  ) : hasBlockingClassScheduleConflict ? (
                    <>
                      <p>
                        Co {classScheduleConflicts.length} xung dot lop. Ban can doi thoi gian hoac
                        bo lop bi xung dot truoc khi luu.
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900">
                        {classScheduleConflicts.slice(0, 5).map((conflict) => (
                          <li key={`${conflict.activity_id}-${conflict.class_id}`}>
                            {conflict.class_name}: "{conflict.title}" ({conflict.overlap_minutes}{' '}
                            phut trung)
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-emerald-700">Khong co xung dot lich lop.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="sticky bottom-0 z-10 flex gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow">
              <button
                type="button"
                onClick={() => void submitActivity('draft')}
                disabled={
                  submitting ||
                  currentStep !== 'submit' ||
                  hasBlockingClassScheduleConflict
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-200 px-6 py-3 font-bold text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {currentStep !== 'submit' ? 'Den buoc 3 de luu nhap' : 'Luu nhap'}
              </button>
              <button
                type="button"
                onClick={() => void submitActivity('submit')}
                disabled={
                  submitting ||
                  currentStep !== 'submit' ||
                  hasBlockingClassScheduleConflict
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
                {currentStep !== 'submit' ? 'Den buoc 3 de gui duyet' : 'Gui duyet'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
