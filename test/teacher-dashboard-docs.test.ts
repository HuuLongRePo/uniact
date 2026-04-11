import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Teacher dashboard docs', () => {
  it('references the canonical teacher dashboard page and compatibility route clearly', () => {
    const changelog = readFileSync(path.join(process.cwd(), 'CHANGELOG_PROGRESS.md'), 'utf8');
    const audit = readFileSync(path.join(process.cwd(), 'SYSTEM_AUDIT.md'), 'utf8');

    expect(changelog).toContain('consumer legacy của `/api/teacher/dashboard`');
    expect(changelog).toContain('src/app/teacher/dashboard/page.tsx');
    expect(changelog).not.toContain('src/app/teacher/page.tsx');

    expect(audit).toContain('Use cases từ `src/app/teacher/dashboard/page.tsx`:');
    expect(audit).not.toContain('Use cases từ `src/app/teacher/page.tsx`:');
  });
});
