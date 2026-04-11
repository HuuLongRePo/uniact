import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { StudentHelper } from '../test/uat/helpers/student.helper';

describe('StudentHelper routes', () => {
  it('scanQRCode validates attendance via the canonical attendance endpoint', async () => {
    const requestPost = vi.fn(async (_url: string, init: any) => ({
      ok: () => true,
      json: async () => ({
        success: true,
        echo: init?.data,
      }),
    }));

    const page: any = {
      request: {
        post: requestPost,
      },
    };

    const helper = new StudentHelper(page);
    await helper.scanQRCode('{"s":321,"t":"qr-token-1"}');

    expect(requestPost).toHaveBeenCalledWith(
      '/api/attendance/validate',
      expect.objectContaining({
        data: {
          qr_token: 'qr-token-1',
          session_id: 321,
        },
      })
    );
  });

  it('uses canonical student pages for dashboard totals and points breakdown', async () => {
    const locator = {
      textContent: vi.fn(async () => '99'),
    };

    const page: any = {
      goto: vi.fn(async () => undefined),
      locator: vi.fn(() => locator),
      waitForSelector: vi.fn(async () => undefined),
    };

    const helper = new StudentHelper(page);

    await helper.viewTotalPoints();
    await helper.viewPointsBreakdown();

    expect(page.goto).toHaveBeenNthCalledWith(1, '/student/dashboard');
    expect(page.goto).toHaveBeenNthCalledWith(2, '/student/points');
    expect(page.waitForSelector).toHaveBeenCalledWith('canvas, svg, [data-testid="chart"]', {
      timeout: 5000,
    });
  });

  it('removes dead class-comparison, badges, and poll detail routes from the student helper', () => {
    const helperSource = readFileSync(
      path.join(process.cwd(), 'test/uat/helpers/student.helper.ts'),
      'utf8'
    );

    expect(helperSource).toContain("await this.page.goto('/student/ranking')");
    expect(helperSource).toContain("await this.page.goto('/student/awards')");
    expect(helperSource).toContain("await this.page.goto('/student/polls')");

    expect(helperSource).not.toContain("await this.page.goto('/student/class-comparison')");
    expect(helperSource).not.toContain("await this.page.goto('/student/badges')");
    expect(helperSource).not.toContain('await this.page.goto(`/student/polls/${pollId}`)');
  });
});
