import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Development guide workflow docs', () => {
  it('documents the canonical activity approval workflow', () => {
    const guide = readFileSync(
      path.join(process.cwd(), 'docs/03-DEVELOPMENT_GUIDE.md'),
      'utf8'
    );

    expect(guide).toContain("test('activity workflow: draft -> requested -> published'");
    expect(guide).toContain("expect(activity.approval_status).toBe('requested')");
    expect(guide).toContain("expect(activity.status).toBe('published')");
    expect(guide).toContain('Approve requested activities');
    expect(guide).toContain(
      'Submit for approval (draft stays draft, approval_status -> requested)'
    );
    expect(guide).toContain(
      'Teacher submits for approval (status stays draft, approval_status=requested)'
    );
    expect(guide).not.toContain('pending_approval');
    expect(guide).not.toContain('draft → pending');
  });
});
