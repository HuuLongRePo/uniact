import { legacyAdminReportRouteResponse } from '../_legacy';

export async function GET() {
  return legacyAdminReportRouteResponse({
    route: '/api/admin/reports/student-points',
    replacement: '/api/admin/reports/scores',
    alternatives: ['/admin/reports/scores'],
  });
}
