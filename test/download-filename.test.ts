import { describe, expect, it } from 'vitest';
import {
  extractFilenameFromContentDisposition,
  resolveDownloadFilename,
} from '@/lib/download-filename';

describe('download filename helpers', () => {
  it('extracts quoted filename values', () => {
    expect(
      extractFilenameFromContentDisposition('attachment; filename="participants-42-2026-04-25.csv"')
    ).toBe('participants-42-2026-04-25.csv');
  });

  it('prefers and decodes filename* values', () => {
    expect(
      extractFilenameFromContentDisposition(
        "attachment; filename=report.csv; filename*=UTF-8''dau-danh-42-2026-04-25.xlsx"
      )
    ).toBe('dau-danh-42-2026-04-25.xlsx');
  });

  it('decodes percent-encoded filename values', () => {
    expect(
      extractFilenameFromContentDisposition(
        'attachment; filename="Danh-sach-lop-CNTT%20K18A-2026-04-25.csv"'
      )
    ).toBe('Danh-sach-lop-CNTT K18A-2026-04-25.csv');
  });

  it('falls back when header is missing or invalid', () => {
    expect(resolveDownloadFilename(null, 'fallback.csv')).toBe('fallback.csv');
    expect(resolveDownloadFilename('inline', 'fallback.csv')).toBe('fallback.csv');
  });
});
