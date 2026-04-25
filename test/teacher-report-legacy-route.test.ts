import { describe, expect, it } from 'vitest';
import * as teacherDashboardLegacyRoute from '../src/app/api/reports/teacher-dashboard/route';

describe('Teacher dashboard legacy report route', () => {
  it('returns replacement guidance for the canonical teacher dashboard stats endpoint', async () => {
    const response = await teacherDashboardLegacyRoute.GET();

    expect(response.status).toBe(410);

    const body = await response.json();

    expect(body).toMatchObject({
      success: false,
      code: 'LEGACY_ROUTE',
      legacy_route: '/api/reports/teacher-dashboard',
      replacement: '/api/teacher/dashboard-stats',
      alternatives: ['/api/teacher/dashboard'],
    });
    expect(body.message).toContain('/api/reports/teacher-dashboard');
    expect(body.message).toContain('/api/teacher/dashboard-stats');
    expect(String(body.message)).not.toMatch(/[ÃƒÃ‚Ã¢]/);
  });
});
