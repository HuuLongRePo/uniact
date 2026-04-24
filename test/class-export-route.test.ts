import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDownloadFilename } from '@/lib/download-filename';

const mocks = vi.hoisted(() => ({
  mockDbAll: vi.fn(),
  mockDbGet: vi.fn(),
  mockRequireAuth: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.mockDbAll,
  dbGet: mocks.mockDbGet,
}));

vi.mock('@/lib/guards', () => ({
  requireAuth: mocks.mockRequireAuth,
}));

import * as classExportRoute from '../src/app/api/classes/[id]/export/route';

function makeContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  } as unknown as Parameters<typeof classExportRoute.GET>[1];
}

describe('GET /api/classes/[id]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns utf8 content-disposition filename with ascii fallback for admin', async () => {
    mocks.mockRequireAuth.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.mockDbGet.mockResolvedValue({
      name: 'Công nghệ 1',
      teacher_name: 'Giang vien A',
    });
    mocks.mockDbAll.mockResolvedValue([]);

    const response = await classExportRoute.GET({} as any, makeContext('1'));

    expect(response.status).toBe(200);
    const contentDisposition = response.headers.get('Content-Disposition');
    expect(contentDisposition).toMatch(
      /^attachment; filename="class-1-\d{4}-\d{2}-\d{2}\.csv"; filename\*=UTF-8''.+$/
    );
    expect(resolveDownloadFilename(contentDisposition, 'fallback.csv')).toMatch(
      /^Danh-sach-lop-Công-nghệ-1-\d{4}-\d{2}-\d{2}\.csv$/
    );
  });

  it('blocks teacher when exporting class outside scope', async () => {
    mocks.mockRequireAuth.mockResolvedValue({ id: 22, role: 'teacher' });
    mocks.mockDbGet.mockResolvedValue({ teacher_id: 99 });

    const response = await classExportRoute.GET({} as any, makeContext('8'));

    expect(response.status).toBe(403);
  });

  it('validates class id input before querying class export data', async () => {
    mocks.mockRequireAuth.mockResolvedValue({ id: 1, role: 'admin' });

    const response = await classExportRoute.GET({} as any, makeContext('abc'));

    expect(response.status).toBe(400);
    expect(mocks.mockDbGet).not.toHaveBeenCalled();
    expect(mocks.mockDbAll).not.toHaveBeenCalled();
  });
});

