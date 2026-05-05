import React from 'react';
import { render, screen } from '@testing-library/react';
import type { User } from '@/types/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScoreReportPage from '@/app/admin/reports/scores/page';
import { useAuth } from '@/contexts/AuthContext';

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: ({ message }: { message?: string }) => <div data-testid="loading-spinner">{message || 'Loading'}</div>,
}));

vi.mock('recharts', async () => {
  const ReactModule = await import('react');

  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement('div', { 'data-testid': 'responsive-container' }, children),
    BarChart: ({
      children,
      data = [],
    }: {
      children: React.ReactNode;
      data?: Array<{ range: string; count: number }>;
    }) =>
      ReactModule.createElement(
        'div',
        { 'data-testid': 'bar-chart' },
        [
          ...data.map((item, index) =>
            ReactModule.createElement('div', { key: `${item.range}-${index}` }, `${item.range}:${item.count}`)
          ),
          children,
        ]
      ),
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Bar: () => null,
  };
});

type MockResponse = Pick<Response, 'ok' | 'status' | 'json'>;

function createAuthState(role: string = 'admin') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

function createJsonResponse(
  payload: unknown,
  init: {
    ok?: boolean;
    status?: number;
  } = {}
): MockResponse {
  return {
    ok: init.ok ?? true,
    status: init.status ?? (init.ok === false ? 500 : 200),
    json: vi.fn().mockResolvedValue(payload),
  };
}

function installFetchMock(response: MockResponse | Promise<MockResponse>) {
  const fetchMock = vi.fn(() => response);

  vi.stubGlobal('fetch', fetchMock);
  window.fetch = fetchMock as typeof fetch;

  return fetchMock;
}

describe('ScoreReportPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders score cards and chart data when the report loads successfully', async () => {
    installFetchMock(
      Promise.resolve(
        createJsonResponse({
          data: {
            stats: {
              average: 8.5,
              median: 8,
              max: 10,
              min: 2,
              distribution: [
                { range: '0-4', count: 3 },
                { range: '5-7', count: 8 },
              ],
            },
          },
        })
      )
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<ScoreReportPage />);

    expect(await screen.findByText('8.5')).toBeInTheDocument();
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByText('0-4:3')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('renders the empty distribution state when there is no chart data', async () => {
    installFetchMock(
      Promise.resolve(
        createJsonResponse({
          stats: {
            average: 0,
            median: 0,
            max: 0,
            min: 0,
            distribution: [],
          },
        })
      )
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<ScoreReportPage />);

    expect(await screen.findByText('Chua co du lieu phan bo diem de hien thi.')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('shows an error banner when the report request fails', async () => {
    installFetchMock(
      Promise.resolve(
        createJsonResponse(
          {
            error: 'Score report unavailable',
          },
          {
            ok: false,
            status: 500,
          }
        )
      )
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<ScoreReportPage />);

    expect(await screen.findByText('Score report unavailable')).toBeInTheDocument();
    expect(screen.getByText('Chua co du lieu phan bo diem de hien thi.')).toBeInTheDocument();
  });
});
