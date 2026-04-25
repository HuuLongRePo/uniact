import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDownloadFilename } from '@/lib/download-filename';

function mockFs(options?: {
  exists?: boolean;
  files?: string[];
  size?: number;
  mtime?: Date;
}) {
  const unlink = vi.fn(async () => {});
  const mkdir = vi.fn(async () => {});
  const readdir = vi.fn(async () => options?.files ?? []);
  const stat = vi.fn(async () => ({
    size: options?.size ?? 1024,
    mtime: options?.mtime ?? new Date('2026-04-12T08:00:00.000Z'),
  }));
  const writeFile = vi.fn(async () => {});
  const readFile = vi.fn(async () => Buffer.from('file-bytes'));
  const fsPromisesMock = {
    unlink,
    mkdir,
    readdir,
    stat,
    writeFile,
    readFile,
  };
  const fsMock = {
    existsSync: () => options?.exists ?? false,
  };

  vi.doMock('fs', () => ({
    ...fsMock,
    default: fsMock,
  }));

  vi.doMock('fs/promises', () => ({
    ...fsPromisesMock,
    default: fsPromisesMock,
  }));

  return { unlink, mkdir, readdir, stat, writeFile, readFile };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('activity file access routes', () => {
  it('allows a support teacher to list files for a related activity', async () => {
    mockFs({ exists: false });

    const mockDbGet = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id, title, teacher_id FROM activities')) {
        return { id: 71, title: 'Shared Docs', teacher_id: 99 };
      }

      return null;
    });

    const mockDbAll = vi.fn(async () => [
      {
        id: 401,
        activity_id: 71,
        file_path: '/uploads/activities/71/guide.pdf',
        file_name: 'guide.pdf',
        file_size: 2048,
        file_type: 'application/pdf',
        uploaded_at: '2026-04-12T08:00:00.000Z',
        uploaded_by: 'Owner Teacher',
      },
    ]);

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbAll: mockDbAll,
      dbRun: vi.fn(),
    }));

    const route = await import('../src/app/api/activities/[id]/files/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '71' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.activity_title).toBe('Shared Docs');
    expect(body.files).toHaveLength(1);
    expect(body.files[0]).toMatchObject({
      id: 401,
      file_name: 'guide.pdf',
    });
  });

  it('allows a support teacher to upload multiple files for a related activity', async () => {
    mockFs({ exists: false });

    const mockDbGet = vi.fn(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT id, title, teacher_id FROM activities')) {
        return { id: 71, title: 'Shared Docs', teacher_id: 99 };
      }

      if (sql.includes('WHERE aa.id = ? AND aa.activity_id = ?')) {
        const [attachmentId] = (params ?? []) as [number, number];
        return {
          id: attachmentId,
          activity_id: 71,
          file_path: `/uploads/activities/71/file-${attachmentId}.pdf`,
          file_name: attachmentId === 501 ? 'guide.pdf' : 'slides.pdf',
          file_size: 2048,
          file_type: 'application/pdf',
          uploaded_at: '2026-04-12T08:00:00.000Z',
          uploaded_by: 'Support Teacher',
        };
      }

      return null;
    });

    const mockDbRun = vi
      .fn()
      .mockResolvedValueOnce({ lastID: 501, changes: 1 })
      .mockResolvedValueOnce({ lastID: 502, changes: 1 });

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbAll: vi.fn(),
      dbRun: mockDbRun,
    }));

    const route = await import('../src/app/api/activities/[id]/files/route');
    const response = await route.POST(
      {
        formData: async () => ({
          get: () => null,
          getAll: (key: string) =>
            key === 'files'
              ? [
                  {
                    name: 'guide.pdf',
                    size: 2048,
                    type: 'application/pdf',
                    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
                  },
                  {
                    name: 'slides.pdf',
                    size: 1024,
                    type: 'application/pdf',
                    arrayBuffer: async () => new Uint8Array([4, 5, 6]).buffer,
                  },
                ]
              : [],
        }),
      } as any,
      { params: Promise.resolve({ id: '71' }) } as any
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.file).toMatchObject({
      id: 501,
      file_name: 'guide.pdf',
    });
    expect(body.files).toHaveLength(2);
    expect(body.files[1]).toMatchObject({
      id: 502,
      file_name: 'slides.pdf',
    });
    expect(mockDbRun).toHaveBeenCalledTimes(2);
  });

  it('blocks out-of-scope teachers from downloading a file', async () => {
    mockFs({ exists: true });

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 21, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => false,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi.fn(async (sql: string) => {
        if (sql.includes('SELECT id, teacher_id FROM activities')) {
          return { id: 71, teacher_id: 99 };
        }
        return null;
      }),
    }));

    const route = await import('../src/app/api/activities/[id]/files/[fileId]/download/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '71', fileId: '501' }),
    } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('tải file của hoạt động thuộc phạm vi quản lý');
  });

  it('returns utf8 content-disposition with ascii fallback when downloading a file', async () => {
    mockFs({ exists: true });

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 1, role: 'admin' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi.fn(async (sql: string) => {
        if (sql.includes('SELECT id, teacher_id FROM activities')) {
          return { id: 71, teacher_id: 99 };
        }

        if (sql.includes('FROM activity_attachments')) {
          return {
            id: 501,
            file_path: '/uploads/activities/71/bao-cao.pdf',
            file_name: '\u0110iem danh l\u1edbp K18A.pdf',
            mime_type: 'application/pdf',
          };
        }

        return null;
      }),
    }));

    const route = await import('../src/app/api/activities/[id]/files/[fileId]/download/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '71', fileId: '501' }),
    } as any);

    expect(response.status).toBe(200);
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    expect(contentDisposition).toContain('filename=');
    expect(contentDisposition).toContain("filename*=UTF-8''");
    expect(resolveDownloadFilename(contentDisposition, 'fallback.pdf')).toBe(
      '\u0110iem danh l\u1edbp K18A.pdf'
    );
  });

  it('blocks out-of-scope teachers from previewing a file', async () => {
    mockFs({ exists: true });

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 21, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => false,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi.fn(async (sql: string) => {
        if (sql.includes('SELECT id, teacher_id FROM activities')) {
          return { id: 71, teacher_id: 99 };
        }
        return null;
      }),
    }));

    const route = await import('../src/app/api/activities/[id]/files/[fileId]/preview/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '71', fileId: '501' }),
    } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('xem trước file của hoạt động thuộc phạm vi quản lý');
  });

  it('allows a support teacher to delete a file from a related activity', async () => {
    mockFs({ exists: false });

    const mockDbGet = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT id, teacher_id FROM activities')) {
        return { id: 71, teacher_id: 99 };
      }

      if (sql.includes('FROM activity_attachments')) {
        return {
          id: 501,
          file_path: '/uploads/activities/71/guide.pdf',
          file_name: 'guide.pdf',
        };
      }

      return null;
    });

    const mockDbRun = vi.fn(async () => ({ changes: 1 }));
    const mockCreateAuditLog = vi.fn(async () => {});

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbRun: mockDbRun,
      dbHelpers: {
        createAuditLog: mockCreateAuditLog,
      },
    }));

    const route = await import('../src/app/api/activities/[id]/files/[fileId]/route');
    const response = await route.DELETE({} as any, {
      params: Promise.resolve({ id: '71', fileId: '501' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.deleted).toBe(true);
    expect(mockDbRun).toHaveBeenCalledTimes(1);
    expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
  });

  it('blocks out-of-scope teachers from deleting an attachment', async () => {
    mockFs({ exists: true });

    vi.doMock('@/lib/guards', () => ({
      requireRole: async () => ({ id: 21, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => false,
    }));

    const mockCreateAuditLog = vi.fn(async () => {});

    vi.doMock('@/lib/database', () => ({
      dbHelpers: {
        getActivityById: vi.fn(async () => ({ id: 71, teacher_id: 99 })),
        createAuditLog: mockCreateAuditLog,
      },
    }));

    const route = await import('../src/app/api/activities/[id]/attachments/[fileName]/route');
    const response = await route.DELETE({} as any, {
      params: Promise.resolve({ id: '71', fileName: 'guide.pdf' }),
    } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('xóa file trong hoạt động thuộc phạm vi quản lý');
    expect(mockCreateAuditLog).not.toHaveBeenCalled();
  });

  it('allows a support teacher to load legacy upload metadata for a related activity', async () => {
    mockFs();

    const mockDbGet = vi.fn(async () => ({ id: 71 }));
    const mockDbAll = vi.fn(async () => [
      {
        file_name: 'legacy.pdf',
        file_path: '/uploads/activities/71/legacy.pdf',
        mime_type: 'application/pdf',
        file_size: 512,
        uploaded_at: '2026-04-12T08:00:00.000Z',
        uploaded_by: 99,
      },
    ]);

    vi.doMock('@/lib/guards', () => ({
      requireAuth: async () => ({ id: 12, role: 'teacher' }),
      requireRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: async () => true,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: mockDbGet,
      dbAll: mockDbAll,
      dbRun: vi.fn(),
    }));

    const route = await import('../src/app/api/activities/[id]/upload/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '71' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      name: 'legacy.pdf',
      url: '/uploads/activities/71/legacy.pdf',
    });
  });

  it('blocks out-of-scope teachers from listing legacy upload metadata', async () => {
    mockFs();

    const mockTeacherAccess = vi.fn(async () => false);
    const mockDbAll = vi.fn();

    vi.doMock('@/lib/guards', () => ({
      requireAuth: async () => ({ id: 21, role: 'teacher' }),
      requireRole: async () => ({ id: 21, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: mockTeacherAccess,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi.fn(async () => ({ id: 71 })),
      dbAll: mockDbAll,
      dbRun: vi.fn(),
    }));

    const route = await import('../src/app/api/activities/[id]/upload/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '71' }),
    } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('xem file của hoạt động thuộc phạm vi quản lý');
    expect(mockDbAll).not.toHaveBeenCalled();
  });

  it('allows a support teacher to list attachments for a related activity on the common detail page', async () => {
    mockFs({ exists: false });
    const mockTeacherAccess = vi.fn(async () => true);

    vi.doMock('@/lib/guards', () => ({
      requireAuth: async () => ({ id: 12, role: 'teacher' }),
      requireRole: async () => ({ id: 12, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: mockTeacherAccess,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi.fn(),
      dbRun: vi.fn(),
      dbHelpers: {
        getActivityById: vi.fn(async () => ({ id: 71, teacher_id: 99 })),
      },
    }));

    const route = await import('../src/app/api/activities/[id]/attachments/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '71' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.attachments).toEqual([]);
    expect(mockTeacherAccess).toHaveBeenCalledWith(12, 71);
  });

  it('blocks out-of-scope teachers from listing attachments on the common detail page', async () => {
    mockFs({ exists: false });

    const mockTeacherAccess = vi.fn(async () => false);

    vi.doMock('@/lib/guards', () => ({
      requireAuth: async () => ({ id: 21, role: 'teacher' }),
      requireRole: async () => ({ id: 21, role: 'teacher' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: mockTeacherAccess,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi.fn(),
      dbRun: vi.fn(),
      dbHelpers: {
        getActivityById: vi.fn(async () => ({ id: 71, teacher_id: 99 })),
      },
    }));

    const route = await import('../src/app/api/activities/[id]/attachments/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '71' }),
    } as any);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('xem file của hoạt động thuộc phạm vi quản lý');
  });

  it('keeps attachment listing accessible to authenticated students', async () => {
    mockFs({ exists: false });

    const mockTeacherAccess = vi.fn(async () => false);

    vi.doMock('@/lib/guards', () => ({
      requireAuth: async () => ({ id: 300, role: 'student' }),
      requireRole: async () => ({ id: 300, role: 'student' }),
    }));

    vi.doMock('@/lib/activity-access', () => ({
      teacherCanAccessActivity: mockTeacherAccess,
    }));

    vi.doMock('@/lib/database', () => ({
      dbGet: vi.fn(),
      dbRun: vi.fn(),
      dbHelpers: {
        getActivityById: vi.fn(async () => ({ id: 71, teacher_id: 99 })),
      },
    }));

    const route = await import('../src/app/api/activities/[id]/attachments/route');
    const response = await route.GET({} as any, {
      params: Promise.resolve({ id: '71' }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.attachments).toEqual([]);
    expect(mockTeacherAccess).not.toHaveBeenCalled();
  });

});
