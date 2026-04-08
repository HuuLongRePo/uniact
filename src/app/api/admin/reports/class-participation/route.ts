import { legacyAdminReportRouteResponse } from '../_legacy';

export async function GET() {
  return legacyAdminReportRouteResponse({
    route: '/api/admin/reports/class-participation',
    replacement: '/api/reports/participation',
    alternatives: ['/admin/reports/participation'],
  });
}
