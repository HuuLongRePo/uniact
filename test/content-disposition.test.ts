import { describe, expect, it } from 'vitest';
import { buildAttachmentContentDisposition } from '@/lib/content-disposition';

describe('content disposition helper', () => {
  it('builds attachment header with ascii fallback and utf-8 filename*', () => {
    const header = buildAttachmentContentDisposition('Diem danh lop K18A.csv');

    expect(header).toBe(
      `attachment; filename="Diem danh lop K18A.csv"; filename*=UTF-8''Diem%20danh%20lop%20K18A.csv`
    );
  });

  it('normalizes vietnamese filename into safe ascii fallback', () => {
    const header = buildAttachmentContentDisposition('Điểm danh lớp K18A.csv');

    expect(header).toContain('filename="Diem danh lop K18A.csv"');
    expect(header).toContain("filename*=UTF-8''%C4%90i%E1%BB%83m%20danh%20l%E1%BB%9Bp%20K18A.csv");
  });
});

