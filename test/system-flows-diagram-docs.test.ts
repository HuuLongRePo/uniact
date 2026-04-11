import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('System flows diagram docs', () => {
  it('keeps the activity approval diagram aligned with the canonical workflow', () => {
    const diagram = readFileSync(
      path.join(process.cwd(), 'docs/SYSTEM_FLOWS_DIAGRAM.md'),
      'utf8'
    );

    expect(diagram).toContain("UPDATE approval_status='requested'");
    expect(diagram).toContain('NOTIFY ADMIN → Requested approval');
    expect(diagram).toContain('Ensure 1 requested, 1 approved/rejected max');
    expect(diagram).toContain('State machine: draft -> requested -> published/rejected');
    expect(diagram).not.toContain("UPDATE approval_status='pending'");
    expect(diagram).not.toContain('Ensure 1 pending, 1 approved/rejected max');
    expect(diagram).not.toContain('State machine: draft → pending → approved/rejected');
  });
});
