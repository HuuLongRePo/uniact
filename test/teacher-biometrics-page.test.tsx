import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const useAuthMock = vi.fn();
const getFaceRuntimeCapabilityMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/lib/biometrics/runtime-capability', () => ({
  getFaceRuntimeCapability: getFaceRuntimeCapabilityMock,
}));

describe('TeacherBiometricsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    useAuthMock.mockReset();
    getFaceRuntimeCapabilityMock.mockReset();

    useAuthMock.mockReturnValue({
      user: {
        id: 8,
        role: 'teacher',
        name: 'Teacher Demo',
        email: 'teacher@uniact.local',
      },
      loading: false,
    });

    getFaceRuntimeCapabilityMock.mockReturnValue({
      runtime_enabled: false,
      model_loading_ready: false,
      model_loading_status: 'idle',
      embedding_detection_ready: false,
      liveness_check_ready: false,
      liveness_status: 'runtime_unavailable',
      attendance_api_accepting_runtime_verification: false,
      mode: 'stubbed',
      selected_matching_engine: 'cosine',
      selected_liveness_engine: 'blink',
      selected_distance_threshold: 0.42,
      blockers: ['runtime off'],
    });
  });

  it('renders teacher-specific biometric operations hub without touching admin endpoints', async () => {
    const fetchMock = vi.fn() as any;
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/biometrics/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('teacher-biometrics-heading')).toHaveTextContent(
      'Sinh trac hoc cho giang vien'
    );
    expect(
      screen.getByText(/Teacher dung trang nay de kiem tra readiness cua runtime khuon mat/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mo face attendance/i })).toHaveAttribute(
      'href',
      '/teacher/attendance/face'
    );
    expect(screen.getByRole('link', { name: /Mo QR fallback/i })).toHaveAttribute(
      'href',
      '/teacher/qr'
    );
    expect(screen.getByText(/Quy trinh enrollment\/training tung hoc vien van thuoc luong quan tri/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redirects non-teacher users to login', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 15,
        role: 'student',
        name: 'Student Demo',
        email: 'student@uniact.local',
      },
      loading: false,
    });

    const Page = (await import('../src/app/teacher/biometrics/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });
});
