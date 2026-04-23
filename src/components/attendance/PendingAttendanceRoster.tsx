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
  title = 'Học viên chưa điểm danh',
}: PendingAttendanceRosterProps) {
  const pendingParticipants = participants.filter(
    (participant) => participant.attendance_status === 'registered'
  );

  const groupedByClass = pendingParticipants.reduce<
    Array<{ className: string; students: AttendanceParticipant[] }>
  >((groups, participant) => {
    const className = participant.class_name?.trim() || 'Chưa gán lớp';
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
    <section
      className="content-card space-y-4 p-5 sm:p-6"
      data-testid="pending-attendance-roster"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">
            Cập nhật danh sách học viên còn trạng thái đăng ký để giảng viên đọc tên và gọi điểm
            danh bổ sung.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-amber-700">Chưa điểm danh</div>
          <div
            className="mt-1 text-2xl font-bold text-amber-900"
            data-testid="pending-attendance-count"
          >
            {pendingParticipants.length}
          </div>
          <div className="text-xs text-amber-700">{groupedByClass.length} lớp còn thiếu</div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-sm text-gray-500">
          Đang tải danh sách chưa điểm danh...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : pendingParticipants.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          Tất cả học viên trong phạm vi hoạt động đã được điểm danh.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {groupedByClass.map((group) => (
            <section
              key={group.className}
              className="rounded-2xl border border-gray-200 bg-white/80 p-4"
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{group.className}</h3>
                  <p className="text-xs text-gray-500">Danh sách chưa điểm danh theo lớp</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {group.students.length} học viên
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {group.students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {student.student_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Mã học viên: {student.student_code || 'Chưa cập nhật'}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      Chờ điểm danh
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
