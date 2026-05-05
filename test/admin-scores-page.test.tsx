import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/database';
import { expectNoMojibake } from './helpers/mojibake';

const { clickMock, pushMock, routerMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  clickMock: vi.fn(),
  pushMock: vi.fn(),
  routerMock: { push: vi.fn() },
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
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
    <a href={typeof href === 'string' ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: ({ message }: { message?: string }) => <div>{message || 'Loading'}</div>,
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({
    isOpen,
    title,
    confirmText,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    title: string;
    confirmText?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <button onClick={onConfirm}>{confirmText || 'Xac nhan'}</button>
        <button onClick={onCancel}>Dong</button>
      </div>
    ) : null,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

function createAuthState(role: string = 'admin') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

function createScoresPayload() {
  return {
    scores: [
      {
        user_id: 3,
        name: 'Tran Ly',
        email: 'ly@uniact.local',
        class_id: 12,
        class_name: '12A1',
        total_points: 42,
        activities_count: 8,
        participated_count: 7,
        excellent_count: 2,
        good_count: 3,
        average_count: 2,
        awards_count: 1,
        award_points: 10,
        adjustment_points: 4,
        bonus_adjustment_points: 4,
        penalty_points: 1,
        rank: 1,
      },
    ],
    summary: {
      total_students: 1,
      average_points: 42,
      total_award_points: 10,
      total_bonus_adjustment_points: 4,
      total_penalty_points: 1,
      adjusted_students_count: 1,
      penalized_students_count: 1,
      rewarded_students_count: 1,
    },
    insights: {
      top_penalty_students: [
        {
          user_id: 3,
          name: 'Tran Ly',
          email: 'ly@uniact.local',
          class_id: 12,
          class_name: '12A1',
          total_points: 42,
          activities_count: 8,
          participated_count: 7,
          excellent_count: 2,
          good_count: 3,
          average_count: 2,
          awards_count: 1,
          award_points: 10,
          adjustment_points: 4,
          bonus_adjustment_points: 4,
          penalty_points: 1,
          rank: 1,
        },
      ],
      top_bonus_students: [],
      recent_adjustments: [
        {
          id: 11,
          student_id: 3,
          student_name: 'Tran Ly',
          class_name: '12A1',
          points: 4,
          source: 'adjustment:Cong diem',
          calculated_at: '2026-05-01T08:00:00.000Z',
          adjustment_type: 'bonus',
          reason: 'Cong diem',
        },
      ],
    },
  };
}

describe('Admin scores page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    clickMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders scores dashboard with clean text', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/admin/scores') {
        return { ok: true, json: async () => createScoresPayload() };
      }
      if (url === '/api/admin/classes?limit=200') {
        return { ok: true, json: async () => ({ classes: [{ id: 12, name: '12A1' }] }) };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/scores/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-scores-heading')).toHaveTextContent(
      'Bang diem toan he thong'
    );
    expect(screen.getByTestId('scores-bonus-card')).toBeInTheDocument();
    expect(screen.getByTestId('scores-penalty-hotspots')).toBeInTheDocument();
    expect(screen.getAllByText('Tran Ly').length).toBeGreaterThan(0);
    expectNoMojibake(container.textContent || '');
  });

  it('exports filtered scores as csv', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/admin/scores') {
        return { ok: true, json: async () => createScoresPayload() };
      }
      if (url === '/api/admin/classes?limit=200') {
        return { ok: true, json: async () => ({ classes: [{ id: 12, name: '12A1' }] }) };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/scores/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-scores-heading')).toBeInTheDocument();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return {
          click: clickMock,
          href: '',
          download: '',
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    fireEvent.click(screen.getByRole('button', { name: 'Xuat CSV' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da yeu cau xuat CSV bang diem');
    });
    expect(clickMock).toHaveBeenCalled();
  });

  it('recalculates scores and refreshes the list', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/scores/recalculate' && options?.method === 'POST') {
        return { ok: true, json: async () => ({ success: true, updated: 2 }) };
      }
      if (url === '/api/admin/scores') {
        return { ok: true, json: async () => createScoresPayload() };
      }
      if (url === '/api/admin/classes?limit=200') {
        return { ok: true, json: async () => ({ classes: [{ id: 12, name: '12A1' }] }) };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/scores/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-scores-heading')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tinh lai diem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tinh lai ngay' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da tinh lai diem cho 2 sinh vien');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/scores/recalculate',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/scores/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
