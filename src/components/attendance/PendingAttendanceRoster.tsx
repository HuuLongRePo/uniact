'use client';

type AttendanceParticipant = {
  id: number;
  student_id: number;
  student_name: string;
  student_code?: string;
  class_name?: string;
  attendance_status: 'registered' | 'attended' | 'absent';
};

type PendingAttendanceRosterProps = {
  participants: AttendanceParticipant[];
  loading?: boolean;
  error?: string | null;
  title?: string;
};

export function PendingAttendanceRoster({
  participants,
  loading = false,
  error = null,
  title = 'Hoc vien chua diem danh',
}: PendingAttendanceRosterProps) {
  const pendingParticipants = participants.filter(
    (participant) => participant.attendance_status === 'registered'
  );

  const groupedByClass = pendingParticipants.reduce<
    Array<{ className: string; students: AttendanceParticipant[] }>
  >((groups, participant) => {
    const className = participant.class_name?.trim() || 'Chua gan lop';
    const existing = groups.find((group) => group.className === className);

    if (existing) {
      existing.students.push(participant);
      return groups;
    }

    groups.push({
      className,
      students: [participant],
    });
    return groups;
  }, []);

  groupedByClass.sort((left, right) => left.className.localeCompare(right.className, 'vi'));
  groupedByClass.forEach((group) =>
    group.students.sort((left, right) => left.student_name.localeCompare(right.student_name, 'vi'))
  );

  return (
    <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7" data-testid="pending-attendance-roster">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Danh sach nay giup giang vien doc ten va xu ly bo sung cho cac hoc vien van con trang
            thai dang ky.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Chua diem danh
          </div>
          <div className="mt-1 text-3xl font-bold text-amber-900" data-testid="pending-attendance-count">
            {pendingParticipants.length}
          </div>
          <div className="text-xs text-amber-700">{groupedByClass.length} lop can xu ly</div>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
          Dang tai danh sach chua diem danh...
        </div>
      ) : error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : pendingParticipants.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          Tat ca hoc vien trong pham vi hoat dong da duoc diem danh.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {groupedByClass.map((group) => (
            <section
              key={group.className}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{group.className}</h3>
                  <p className="text-xs text-slate-500">Danh sach hoc vien cho diem danh theo lop</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {group.students.length} hoc vien
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {group.students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {student.student_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Ma hoc vien: {student.student_code || 'Chua cap nhat'}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      Cho diem danh
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
