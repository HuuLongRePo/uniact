import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AdminHelper routes', () => {
  it('uses the canonical admin backup page in triggerBackup', () => {
    const helperSource = readFileSync(
      path.join(process.cwd(), 'test/uat/helpers/admin.helper.ts'),
      'utf8'
    );

    expect(helperSource).toContain("await this.page.goto('/admin/backup')");
    expect(helperSource).not.toContain("await this.page.goto('/admin/database')");
  });
});
