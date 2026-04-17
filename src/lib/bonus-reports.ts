/**
 * Bonus Reports & Export Module
 * - Generate reports by class, semester, student
 * - Export as CSV/JSON/XLSX
 * - Statistics and aggregations
 */

import { dbAll, dbGet } from './db-core';
import { createWorkbookFromSheets } from './excel-export';

export interface BonusReport {
  studentId: number;
  studentName: string;
  studentEmail: string;
  className?: string;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  proposals: BonusProposalRow[];
}

export interface BonusProposalRow {
  id: number;
  points: number;
  sourceType: string;
  status: 'pending' | 'approved' | 'rejected';
  authorName: string;
  evidenceUrl?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface ClassStatistics {
  className: string;
  studentCount: number;
  totalApprovedPoints: number;
  averagePointsPerStudent: number;
  proposals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface SemesterReport {
  semester: string;
  academicYear: string;
  classReports: ClassStatistics[];
  totalPoints: number;
  totalStudents: number;
  averagePointsPerStudent: number;
}

/**
 * Get bonus report for a specific student
 */
export async function getStudentBonusReport(studentId: number): Promise<BonusReport | null> {
  const student = await dbGet('SELECT * FROM users WHERE id = ?', [studentId]);
  if (!student) return null;

  const class_info = student.class_id
    ? await dbGet('SELECT name FROM classes WHERE id = ?', [student.class_id])
    : null;

  const proposals = await dbAll(
    `SELECT 
      sbp.id,
      sbp.points,
      sbp.source_type as sourceType,
      sbp.status,
      u.name as authorName,
      sbp.evidence_url as evidenceUrl,
      sbp.created_at as createdAt,
      sbp.updated_at as approvedAt
    FROM suggested_bonus_points sbp
    LEFT JOIN users u ON sbp.author_id = u.id
    WHERE sbp.student_id = ?
    ORDER BY sbp.created_at DESC`,
    [studentId]
  );

  const stats = {
    totalApproved: proposals
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + p.points, 0),
    totalPending: proposals.filter((p) => p.status === 'pending').length,
    totalRejected: proposals.filter((p) => p.status === 'rejected').length,
  };

  return {
    studentId,
    studentName: student.name,
    studentEmail: student.email,
    className: class_info?.name,
    ...stats,
    proposals,
  };
}

/**
 * Get bonus report for a specific class
 */
export async function getClassBonusReport(classId: number): Promise<ClassStatistics | null> {
  const classInfo = await dbGet('SELECT name FROM classes WHERE id = ?', [classId]);
  if (!classInfo) return null;

  const students = await dbAll('SELECT id FROM users WHERE class_id = ? AND role = ?', [
    classId,
    'student',
  ]);

  const proposals = await dbAll(
    `SELECT 
      sbp.points,
      sbp.status,
      sbp.student_id
    FROM suggested_bonus_points sbp
    JOIN users u ON sbp.student_id = u.id
    WHERE u.class_id = ?`,
    [classId]
  );

  const approvedProposals = proposals.filter((p) => p.status === 'approved');
  const totalApprovedPoints = approvedProposals.reduce((sum, p) => sum + p.points, 0);

  return {
    className: classInfo.name,
    studentCount: students.length,
    totalApprovedPoints,
    averagePointsPerStudent: students.length > 0 ? totalApprovedPoints / students.length : 0,
    proposals: {
      total: proposals.length,
      pending: proposals.filter((p) => p.status === 'pending').length,
      approved: proposals.filter((p) => p.status === 'approved').length,
      rejected: proposals.filter((p) => p.status === 'rejected').length,
    },
  };
}

/**
 * Get bonus report for entire semester/academic year
 */
export async function getSemesterBonusReport(
  semester: number = 1,
  academicYear: string = new Date().getFullYear().toString()
): Promise<SemesterReport> {
  const classes = await dbAll('SELECT id, name FROM classes ORDER BY name');

  const classReports: ClassStatistics[] = [];
  for (const cls of classes) {
    const report = await getClassBonusReport(cls.id);
    if (report) {
      classReports.push(report);
    }
  }

  const allProposals = await dbAll(
    `SELECT points, status FROM suggested_bonus_points WHERE status = ?`,
    ['approved']
  );

  const totalPoints = allProposals.reduce((sum, p) => sum + p.points, 0);
  const totalStudents = classReports.reduce((sum, r) => sum + r.studentCount, 0);

  return {
    semester: `Học kỳ ${semester}`,
    academicYear,
    classReports,
    totalPoints,
    totalStudents,
    averagePointsPerStudent: totalStudents > 0 ? totalPoints / totalStudents : 0,
  };
}

/**
 * Export student bonus report as CSV
 */
export async function exportStudentBonusAsCSV(studentId: number): Promise<string> {
  const report = await getStudentBonusReport(studentId);
  if (!report) return '';

  const rows: string[] = [];
  rows.push('Báo Cáo Cộng Điểm - UniAct');
  rows.push(`Học viên: ${report.studentName}`);
  rows.push(`Email: ${report.studentEmail}`);
  rows.push(`Lớp: ${report.className || 'N/A'}`);
  rows.push('');
  rows.push('Tổng kết');
  rows.push(`Tổng điểm đã duyệt: ${report.totalApproved}`);
  rows.push(`Đề xuất chờ duyệt: ${report.totalPending}`);
  rows.push(`Đề xuất từ chối: ${report.totalRejected}`);
  rows.push('');
  rows.push('Chi tiết đề xuất');
  rows.push('ID,Điểm,Loại,Trạng thái,Người đề xuất,Ngày tạo');

  report.proposals.forEach((p) => {
    rows.push(
      `${p.id},${p.points},"${p.sourceType}","${translateStatus(p.status)}","${p.authorName}","${p.createdAt}"`
    );
  });

  return rows.join('\n');
}

/**
 * Export class bonus report as CSV
 */
export async function exportClassBonusAsCSV(classId: number): Promise<string> {
  const report = await getClassBonusReport(classId);
  if (!report) return '';

  const rows: string[] = [];
  rows.push('Báo Cáo Cộng Điểm Theo Lớp - UniAct');
  rows.push(`Lớp: ${report.className}`);
  rows.push(`Số học viên: ${report.studentCount}`);
  rows.push(`Tổng điểm đã duyệt: ${report.totalApprovedPoints}`);
  rows.push(`Điểm bình quân/học viên: ${report.averagePointsPerStudent.toFixed(2)}`);
  rows.push('');
  rows.push('Thống kê đề xuất');
  rows.push(`Tổng cộng: ${report.proposals.total}`);
  rows.push(`Đã duyệt: ${report.proposals.approved}`);
  rows.push(`Chờ duyệt: ${report.proposals.pending}`);
  rows.push(`Từ chối: ${report.proposals.rejected}`);
  rows.push('');
  rows.push('Chi tiết học viên');
  rows.push('Tên,Email,Tổng điểm đã duyệt,Chờ duyệt,Từ chối');

  const students = await dbAll(
    `SELECT DISTINCT u.id, u.name, u.email
    FROM users u
    LEFT JOIN suggested_bonus_points sbp ON u.id = sbp.student_id
    WHERE u.class_id = ? AND u.role = ?
    ORDER BY u.name`,
    [classId, 'student']
  );

  for (const student of students) {
    const studentReport = await getStudentBonusReport(student.id);
    if (studentReport) {
      rows.push(
        `"${studentReport.studentName}","${studentReport.studentEmail}",${studentReport.totalApproved},${studentReport.totalPending},${studentReport.totalRejected}`
      );
    }
  }

  return rows.join('\n');
}

/**
 * Export semester report as CSV
 */
export async function exportSemesterBonusAsCSV(
  semester: number = 1,
  academicYear: string = new Date().getFullYear().toString()
): Promise<string> {
  const report = await getSemesterBonusReport(semester, academicYear);

  const rows: string[] = [];
  rows.push('Báo Cáo Cộng Điểm Theo Học Kỳ - UniAct');
  rows.push(`Học kỳ: ${report.semester}`);
  rows.push(`Năm học: ${report.academicYear}`);
  rows.push(`Tổng điểm đã duyệt: ${report.totalPoints}`);
  rows.push(`Tổng học viên: ${report.totalStudents}`);
  rows.push(`Điểm bình quân/học viên: ${report.averagePointsPerStudent.toFixed(2)}`);
  rows.push('');
  rows.push('Chi tiết theo lớp');
  rows.push('Lớp,Số học viên,Tổng điểm,Bình quân/HV,Tổng đề xuất,Đã duyệt,Chờ duyệt,Từ chối');

  report.classReports.forEach((cls) => {
    rows.push(
      `"${cls.className}",${cls.studentCount},${cls.totalApprovedPoints},${cls.averagePointsPerStudent.toFixed(2)},${cls.proposals.total},${cls.proposals.approved},${cls.proposals.pending},${cls.proposals.rejected}`
    );
  });

  return rows.join('\n');
}

/**
 * Export report as JSON
 */
export async function exportReportAsJSON(
  type: 'student' | 'class' | 'semester',
  id?: number
): Promise<string> {
  let data: any;

  if (type === 'student' && id) {
    data = await getStudentBonusReport(id);
  } else if (type === 'class' && id) {
    data = await getClassBonusReport(id);
  } else {
    data = await getSemesterBonusReport();
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Generate summary statistics
 */
export async function generateBonusStatistics() {
  const allProposals = await dbAll('SELECT points, status FROM suggested_bonus_points');
  const approved = allProposals.filter((p) => p.status === 'approved');
  const pending = allProposals.filter((p) => p.status === 'pending');
  const rejected = allProposals.filter((p) => p.status === 'rejected');

  const approvedPoints = approved.reduce((sum, p) => sum + p.points, 0);

  return {
    total: {
      proposals: allProposals.length,
      points: approvedPoints,
    },
    byStatus: {
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
    },
    averages: {
      pointsPerApprovedProposal: approved.length > 0 ? approvedPoints / approved.length : 0,
      approvalRate: allProposals.length > 0 ? (approved.length / allProposals.length) * 100 : 0,
    },
  };
}

/**
 * Helper: translate status to Vietnamese
 */
function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
  };
  return map[status] || status;
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  type: 'student' | 'class' | 'semester',
  format: 'csv' | 'xlsx' | 'json',
  date: Date = new Date()
): string {
  const dateStr = date.toISOString().split('T')[0];
  const typeMap = {
    student: 'bonus-student',
    class: 'bonus-class',
    semester: 'bonus-semester',
  };
  return `${typeMap[type]}-${dateStr}.${format}`;
}

/**
 * Export student bonus report as XLSX (Excel)
 */
export async function exportStudentBonusAsXLSX(studentId: number): Promise<Buffer> {
  const report = await getStudentBonusReport(studentId);
  if (!report) return Buffer.from('');

  const summaryData = [
    ['Báo Cáo Cộng Điểm - UniAct'],
    [],
    ['Thông tin học viên'],
    ['Tên:', report.studentName],
    ['Email:', report.studentEmail],
    ['Lớp:', report.className || 'N/A'],
    [],
    ['Tổng kết'],
    ['Loại', 'Số lượng'],
    ['Tổng điểm đã duyệt', report.totalApproved],
    ['Đề xuất chờ duyệt', report.totalPending],
    ['Đề xuất từ chối', report.totalRejected],
  ];

  const detailsData = [
    ['ID', 'Điểm', 'Loại', 'Trạng thái', 'Người đề xuất', 'Ngày tạo'],
    ...report.proposals.map((p) => [
      p.id,
      p.points,
      p.sourceType,
      translateStatus(p.status),
      p.authorName,
      p.createdAt,
    ]),
  ];

  return createWorkbookFromSheets([
    { name: 'Tổng kết', rows: summaryData, widths: [25, 15] },
    { name: 'Chi tiết', rows: detailsData, widths: [8, 8, 15, 12, 20, 20] },
  ]);
}

/**
 * Export class bonus report as XLSX
 */
export async function exportClassBonusAsXLSX(classId: number): Promise<Buffer> {
  const report = await getClassBonusReport(classId);
  if (!report) return Buffer.from('');

  const summaryData = [
    ['Báo Cáo Cộng Điểm Theo Lớp - UniAct'],
    [],
    ['Thông tin lớp'],
    ['Lớp:', report.className],
    ['Số học viên:', report.studentCount],
    ['Tổng điểm đã duyệt:', report.totalApprovedPoints],
    ['Điểm bình quân/học viên:', report.averagePointsPerStudent.toFixed(2)],
    [],
    ['Thống kê đề xuất'],
    ['Loại', 'Số lượng'],
    ['Tổng cộng', report.proposals.total],
    ['Đã duyệt', report.proposals.approved],
    ['Chờ duyệt', report.proposals.pending],
    ['Từ chối', report.proposals.rejected],
  ];

  const students = await dbAll(
    `SELECT DISTINCT u.id, u.name, u.email
    FROM users u
    LEFT JOIN suggested_bonus_points sbp ON u.id = sbp.student_id
    WHERE u.class_id = ? AND u.role = ?
    ORDER BY u.name`,
    [classId, 'student']
  );

  const studentData = [
    ['Tên', 'Email', 'Tổng điểm đã duyệt', 'Chờ duyệt', 'Từ chối'],
    ...(await Promise.all(
      students.map(async (student: any) => {
        const sr = await getStudentBonusReport(student.id);
        if (!sr) return [student.name, student.email, 0, 0, 0];
        return [
          sr.studentName,
          sr.studentEmail,
          sr.totalApproved,
          sr.totalPending,
          sr.totalRejected,
        ];
      })
    )),
  ];

  return createWorkbookFromSheets([
    { name: 'Tổng kết', rows: summaryData, widths: [25, 15] },
    { name: 'Chi tiết học viên', rows: studentData, widths: [20, 25, 15, 12, 12] },
  ]);
}

/**
 * Export semester bonus report as XLSX
 */
export async function exportSemesterBonusAsXLSX(
  semester: number = 1,
  academicYear: string = new Date().getFullYear().toString()
): Promise<Buffer> {
  const report = await getSemesterBonusReport(semester, academicYear);

  const summaryData = [
    ['Báo Cáo Cộng Điểm Theo Học Kỳ - UniAct'],
    [],
    ['Thông tin báo cáo'],
    ['Học kỳ:', report.semester],
    ['Năm học:', report.academicYear],
    ['Tổng điểm đã duyệt:', report.totalPoints],
    ['Tổng học viên:', report.totalStudents],
    ['Điểm bình quân/học viên:', report.averagePointsPerStudent.toFixed(2)],
  ];

  const classData = [
    ['Lớp', 'Số HV', 'Tổng điểm', 'Bình quân', 'Tổng đề', 'Đã duyệt', 'Chờ duyệt', 'Từ chối'],
    ...report.classReports.map((cls) => [
      cls.className,
      cls.studentCount,
      cls.totalApprovedPoints,
      cls.averagePointsPerStudent.toFixed(2),
      cls.proposals.total,
      cls.proposals.approved,
      cls.proposals.pending,
      cls.proposals.rejected,
    ]),
  ];

  return createWorkbookFromSheets([
    { name: 'Tổng kết', rows: summaryData, widths: [25, 15] },
    {
      name: 'Chi tiết lớp',
      rows: classData,
      widths: [15, 8, 12, 12, 10, 10, 12, 10],
    },
  ]);
}
