import { legacyReportRouteResponse } from '../_legacy';

export async function GET() {
  return legacyReportRouteResponse({
    route: '/api/reports/attendance',
    alternatives: [
      '/api/teacher/reports/attendance/records',
      '/api/teacher/reports/attendance/class-summary',
      '/api/teacher/reports/attendance/student-summary',
    ],
  });
}
