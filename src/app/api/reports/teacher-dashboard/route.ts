import { legacyReportRouteResponse } from '../_legacy';

export async function GET() {
  return legacyReportRouteResponse({
    route: '/api/reports/teacher-dashboard',
    replacement: '/api/teacher/dashboard-stats',
    alternatives: ['/api/teacher/dashboard'],
  });
}
