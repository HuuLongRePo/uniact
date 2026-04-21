import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LegacyNewActivityPage from '@/app/activities/new/page';
import { useAuth } from '@/contexts/AuthContext';

const { replaceMock, pushMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

function createAuthState(
  overrides: Partial<ReturnType<typeof createAuthStateBase>> = {}
): ReturnType<typeof createAuthStateBase> {
  return {
    ...createAuthStateBase(),
    ...overrides,
  };
}

function createAuthStateBase() {
  return {
    user: { id: 12, role: 'teacher', name: 'Teacher One' },
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('LegacyNewActivityPage', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pushMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects teachers to the canonical teacher create page', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState() as any);

    render(<LegacyNewActivityPage />);

    expect(screen.getByText('Đang chuyển đến màn tạo hoạt động mới...')).toBeInTheDocument();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/teacher/activities/new');
    });
  });

  it('redirects unauthenticated users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(
      createAuthState({
        user: null,
      }) as any
    );

    render(<LegacyNewActivityPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });
  });

  it('redirects non-teacher users back to activities', async () => {
    vi.mocked(useAuth).mockReturnValue(
      createAuthState({
        user: { id: 33, role: 'student', name: 'Student One' },
      }) as any
    );

    render(<LegacyNewActivityPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/activities');
    });
  });
});
