import { NextRequest, NextResponse } from 'next/server';
import {
  getStudentBonusReport,
  getClassBonusReport,
  getSemesterBonusReport,
  exportStudentBonusAsCSV,
  exportClassBonusAsCSV,
  exportSemesterBonusAsCSV,
  exportStudentBonusAsXLSX,
  exportClassBonusAsXLSX,
  exportSemesterBonusAsXLSX,
  generateBonusStatistics,
  generateExportFilename,
} from '@/lib/bonus-reports';
import { getUserFromSession } from '@/lib/auth';
import { ApiError, successResponse, errorResponse } from '@/lib/api-response';

/**
 * GET /api/bonus/reports
 * Get bonus reports and statistics
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromSession();

  // Only admin and teachers can access reports
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
  }

  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get('type') || 'semester';
  const format = searchParams.get('format') || 'json';
  const studentId = searchParams.get('studentId')
    ? parseInt(searchParams.get('studentId')!)
    : undefined;
  const classId = searchParams.get('classId') ? parseInt(searchParams.get('classId')!) : undefined;
  const semester = searchParams.get('semester') ? parseInt(searchParams.get('semester')!) : 1;
  const academicYear = searchParams.get('academicYear') || new Date().getFullYear().toString();

  try {
    let data: any;

    // Get report based on type
    if (type === 'student' && studentId) {
      data = await getStudentBonusReport(studentId);
      if (!data) {
        return errorResponse(ApiError.notFound('Không tìm thấy học viên'));
      }
    } else if (type === 'class' && classId) {
      data = await getClassBonusReport(classId);
      if (!data) {
        return errorResponse(ApiError.notFound('Không tìm thấy lớp'));
      }
    } else if (type === 'statistics') {
      data = await generateBonusStatistics();
    } else {
      // Default: semester report
      data = await getSemesterBonusReport(semester, academicYear);
    }

    // Return in requested format
    if (format === 'csv') {
      let csv: string;

      if (type === 'student' && studentId) {
        csv = await exportStudentBonusAsCSV(studentId);
      } else if (type === 'class' && classId) {
        csv = await exportClassBonusAsCSV(classId);
      } else {
        csv = await exportSemesterBonusAsCSV(semester, academicYear);
      }

      const filename = generateExportFilename(type as any, 'csv');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === 'xlsx') {
      let buffer: Buffer;

      if (type === 'student' && studentId) {
        buffer = await exportStudentBonusAsXLSX(studentId);
      } else if (type === 'class' && classId) {
        buffer = await exportClassBonusAsXLSX(classId);
      } else {
        buffer = await exportSemesterBonusAsXLSX(semester, academicYear);
      }

      const filename = generateExportFilename(type as any, 'xlsx');

      const ab = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer;
      return new Response(ab, {
        status: 200,
        headers: new Headers({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        }),
      });
    }

    // Default JSON response
    return successResponse(data);
  } catch (error) {
    console.error('Reports error:', error);
    return errorResponse(ApiError.internalError('Không thể tạo báo cáo'));
  }
}
