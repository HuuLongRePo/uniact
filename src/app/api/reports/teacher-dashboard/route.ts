import { legacyReportRouteResponse } from '../_legacy';

export async function GET() {
  return legacyReportRouteResponse({
    route: '/api/reports/teacher-dashboard',
    replacement: '/api/teacher/dashboard',
    alternatives: ['/api/teacher/dashboard-stats'],
  });
}
