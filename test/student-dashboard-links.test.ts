import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('student dashboard links', () => {
  it('uses namespaced route for notifications', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/student/dashboard/page.tsx'),
      'utf8'
    );

    const studentNotificationLinks = source.match(/href=["']\/student\/notifications["']/g) || [];
    const bareNotificationLinks = source.match(/href=["']\/notifications["']/g) || [];

    expect(studentNotificationLinks.length).toBeGreaterThanOrEqual(2);
    expect(bareNotificationLinks).toHaveLength(0);
  });

  it('routes total score and registered activity shortcuts to canonical student pages', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/app/student/dashboard/page.tsx'),
      'utf8'
    );

    expect(source).toContain('href="/student/check-in"');
    expect(source).toContain('href="/student/points"');
    expect(source).toContain('href="/student/my-activities"');
    expect(source).toContain('href="/student/profile"');
    expect(source).not.toContain('href="/student/profile/edit"');
    expect(source).not.toContain('href="/student/activities?tab=registered"');
  });
});
