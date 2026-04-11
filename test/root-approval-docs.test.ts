import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Root approval workflow docs', () => {
  it('keeps non-docs markdown references aligned with the canonical approval flow', () => {
    const permissionsRules = readFileSync(
      path.join(process.cwd(), 'de-tai/PERMISSIONS_AND_BUSINESS_RULES.md'),
      'utf8'
    );
    const executionLog = readFileSync(
      path.join(process.cwd(), 'de-tai/NHAT-KY-THUC-HIEN.md'),
      'utf8'
    );

    expect(permissionsRules).toContain(
      "`status='draft'` giữ nguyên, `approval_status='draft' → 'requested'`"
    );
    expect(permissionsRules).not.toContain("approval_status='draft' → 'pending'");
    expect(executionLog).toContain('Workflow: draft -> requested -> published/rejected');
    expect(executionLog).not.toContain('Workflow: draft → pending → published/rejected');
  });
});
