import { legacyReportRouteResponse } from '../_legacy';

export async function GET() {
  return legacyReportRouteResponse({
    route: '/api/reports/term-report',
    alternatives: [
      '/api/teacher/reports/class-stats/export',
      '/api/teacher/reports/participation/export',
      '/api/teacher/reports/attendance/export',
    ],
  });
}
