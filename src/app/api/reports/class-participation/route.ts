import { legacyReportRouteResponse } from '../_legacy';

export async function GET() {
  return legacyReportRouteResponse({
    route: '/api/reports/class-participation',
    replacement: '/api/teacher/reports/participation',
    alternatives: ['/api/teacher/reports/class-stats', '/api/teacher/reports/attendance'],
  });
}
