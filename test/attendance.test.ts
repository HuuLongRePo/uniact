import { describe, expect, it, vi } from 'vitest';

let currentNetworkPrefix = '10.20.30';

vi.mock('@/lib/guards', () => ({
  requireApiRole: async () => ({ id: 10, role: 'student' }),
}));

vi.mock('@/lib/network-proximity', () => ({
  resolveRequestNetworkPrefix: () => currentNetworkPrefix,
}));

vi.mock('@/lib/notifications', () => ({
  sendDatabaseNotification: async () => ({ success: true }),
}));

vi.mock('@/lib/database', () => ({
  withTransaction: async (callback: any) => callback(),
  dbHelpers: {
    getQRSessionByToken: async (_token: string, _sessionId?: number) => ({
      id: 55,
      activity_id: 7,
      expires_at: new Date(Date.now() + 10000).toISOString(),
      is_active: 1,
      metadata: JSON.stringify({
        max_scans: 10,
        single_use: false,
        anti_cheat: {
          network_lock: true,
          creator_network_prefix: '10.20.30',
        },
      }),
    }),
    getActivityById: async () => ({ id: 7, status: 'published', approval_status: 'approved' }),
    checkExistingAttendance: async () => undefined,
    createAttendanceRecord: async () => ({ lastID: 999 }),
    updateParticipationStatus: async () => ({ changes: 1 }),
    countAttendanceForSession: async () => 0,
    deactivateQRSession: async () => ({ changes: 1 }),
    createAuditLog: async () => {},
  },
  dbRun: async () => ({ changes: 1 }),
}));

import * as attendanceRoute from '../src/app/api/attendance/validate/route';

function makeReq(body: any) {
  return {
    json: async () => body,
    cookies: { get: (_: string) => ({ value: 'dummy' }) },
  } as any;
}

describe('POST /api/attendance/validate', () => {
  it('records attendance for student', async () => {
    currentNetworkPrefix = '10.20.30';
    const req = makeReq({ qr_token: 'tok', session_id: 55 });
    const res: any = await (attendanceRoute as any).POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toMatchObject({ recorded: true, activity_id: 7 });
  });

  it('returns already recorded on duplicate', async () => {
    currentNetworkPrefix = '10.20.30';
    const db = await import('../src/lib/database');
    (db as any).dbHelpers.checkExistingAttendance = async () => ({ id: 123 });

    const req = makeReq({ qr_token: 'tok', session_id: 55 });
    const res: any = await (attendanceRoute as any).POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('success', true);
    expect(body.data).toMatchObject({ already_recorded: true });
  });

  it('blocks attendance when request network does not match classroom network', async () => {
    currentNetworkPrefix = '10.99.88';
    const req = makeReq({ qr_token: 'tok', session_id: 55 });
    const res: any = await (attendanceRoute as any).POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('success', false);
    expect(String(body.message || '')).toContain('mang lop hoc');
  });
});
