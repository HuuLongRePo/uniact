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
    const vnFilename = '\u0110i\u1ec3m danh l\u1edbp K18A.csv';
    const header = buildAttachmentContentDisposition(vnFilename);

    expect(header).toContain('filename="Diem danh lop K18A.csv"');
    expect(header).toContain(`filename*=UTF-8''${encodeURIComponent(vnFilename)}`);
  });
});
