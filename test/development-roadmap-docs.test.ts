import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Development roadmap workflow docs', () => {
  it('keeps the activity approval roadmap aligned with the current workflow', () => {
    const roadmap = readFileSync(
      path.join(process.cwd(), 'docs/DEVELOPMENT_ROADMAP_V3.md'),
      'utf8'
    );

    expect(roadmap).toContain('[POST /api/activities/{id}/submit-approval]');
    expect(roadmap).toContain("approval_status='requested' (status stays 'draft')");
    expect(roadmap).toContain("Check: approval_status='requested'");
    expect(roadmap).toContain('draft -> requested -> published/rejected');
    expect(roadmap).not.toContain("approval_status='pending'");
    expect(roadmap).not.toContain('draft → pending → approved/rejected');
  });
});
