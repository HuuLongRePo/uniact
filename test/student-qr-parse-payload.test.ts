import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/student/check-in',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/StudentQRScanner', () => ({
  StudentQRScanner: () => null,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  success: vi.fn(),
  error: vi.fn(),
}));

describe('parseQrPayload', () => {
  it('parses ultra-compact projector payload', async () => {
    const { parseQrPayload } = await import('../src/app/student/check-in/page');
    expect(parseQrPayload('321:ABC123TOKEN')).toEqual({
      session_id: 321,
      qr_token: 'ABC123TOKEN',
    });
  });

  it('parses ultra-compact payload with lowercase and hyphen/underscore token', async () => {
    const { parseQrPayload } = await import('../src/app/student/check-in/page');
    expect(parseQrPayload('325:token_325-ab')).toEqual({
      session_id: 325,
      qr_token: 'token_325-ab',
    });
  });

  it('parses compact query payload', async () => {
    const { parseQrPayload } = await import('../src/app/student/check-in/page');
    expect(parseQrPayload('s=321&t=token-321')).toEqual({
      session_id: 321,
      qr_token: 'token-321',
    });
  });

  it('parses absolute check-in URL payload', async () => {
    const { parseQrPayload } = await import('../src/app/student/check-in/page');
    expect(
      parseQrPayload('https://192.168.1.15:3000/student/check-in?s=322&t=token-322')
    ).toEqual({
      session_id: 322,
      qr_token: 'token-322',
    });
  });

  it('parses relative check-in URL payload', async () => {
    const { parseQrPayload } = await import('../src/app/student/check-in/page');
    expect(parseQrPayload('/student/check-in?s=323&t=token-323')).toEqual({
      session_id: 323,
      qr_token: 'token-323',
    });
  });

  it('parses uppercase compact payload from teacher projector QR', async () => {
    const { parseQrPayload } = await import('../src/app/student/check-in/page');
    expect(parseQrPayload('S=324&T=TOKEN-324')).toEqual({
      session_id: 324,
      qr_token: 'TOKEN-324',
    });
  });
});
