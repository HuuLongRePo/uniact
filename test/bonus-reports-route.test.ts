import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserFromSession: vi.fn(),
  getStudentBonusReport: vi.fn(),
  getClassBonusReport: vi.fn(),
  getSemesterBonusReport: vi.fn(),
  exportStudentBonusAsCSV: vi.fn(),
  exportClassBonusAsCSV: vi.fn(),
  exportSemesterBonusAsCSV: vi.fn(),
  exportStudentBonusAsXLSX: vi.fn(),
  exportClassBonusAsXLSX: vi.fn(),
  exportSemesterBonusAsXLSX: vi.fn(),
  generateBonusStatistics: vi.fn(),
  generateExportFilename: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserFromSession: mocks.getUserFromSession,
}));

vi.mock('@/lib/bonus-reports', () => ({
  getStudentBonusReport: mocks.getStudentBonusReport,
  getClassBonusReport: mocks.getClassBonusReport,
  getSemesterBonusReport: mocks.getSemesterBonusReport,
  exportStudentBonusAsCSV: mocks.exportStudentBonusAsCSV,
  exportClassBonusAsCSV: mocks.exportClassBonusAsCSV,
  exportSemesterBonusAsCSV: mocks.exportSemesterBonusAsCSV,
  exportStudentBonusAsXLSX: mocks.exportStudentBonusAsXLSX,
  exportClassBonusAsXLSX: mocks.exportClassBonusAsXLSX,
  exportSemesterBonusAsXLSX: mocks.exportSemesterBonusAsXLSX,
  generateBonusStatistics: mocks.generateBonusStatistics,
  generateExportFilename: mocks.generateExportFilename,
}));

describe('GET /api/bonus/reports', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getUserFromSession.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.getSemesterBonusReport.mockResolvedValue({ semester: 1, academicYear: '2026' });
    mocks.generateExportFilename.mockReturnValue('bonus-report.csv');
    mocks.exportSemesterBonusAsCSV.mockResolvedValue('name,points\nA,10');
    mocks.exportSemesterBonusAsXLSX.mockResolvedValue(Buffer.from('xlsx-bytes'));
  });

  it('returns csv export with utf-8 content-disposition', async () => {
    const route = await import('../src/app/api/bonus/reports/route');
    const response = await route.GET({
      nextUrl: {
        searchParams: new URLSearchParams([
          ['format', 'csv'],
          ['type', 'semester'],
        ]),
      },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="bonus-report\.csv"; filename\*=UTF-8''bonus-report\.csv$/
    );
  });

  it('returns xlsx export with utf-8 content-disposition', async () => {
    mocks.generateExportFilename.mockReturnValueOnce('bonus-report.xlsx');

    const route = await import('../src/app/api/bonus/reports/route');
    const response = await route.GET({
      nextUrl: {
        searchParams: new URLSearchParams([
          ['format', 'xlsx'],
          ['type', 'semester'],
        ]),
      },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="bonus-report\.xlsx"; filename\*=UTF-8''bonus-report\.xlsx$/
    );
  });
});
