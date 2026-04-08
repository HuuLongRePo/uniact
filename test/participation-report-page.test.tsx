import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import type { User } from '@/types/database'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import ParticipationReportAdminPage from '@/features/reports/ParticipationReportAdminPage'
import { useAuth } from '@/contexts/AuthContext'

const pushMock = vi.fn()

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/components/ActivitySkeleton', () => ({
  default: ({ count = 4 }: { count?: number }) => (
    <div data-testid="activity-skeleton">Loading {count}</div>
  ),
}))

vi.mock('@/components/EmptyState', () => ({
  default: ({
    title,
    message,
  }: {
    title: string
    message?: string
  }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{message}</span>
    </div>
  ),
}))

type MockResponse = Pick<Response, 'ok' | 'status' | 'json'>

function createAuthState(role: string = 'admin') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  }
}

function createJsonResponse(
  payload: unknown,
  init: {
    ok?: boolean
    status?: number
  } = {}
): MockResponse {
  return {
    ok: init.ok ?? true,
    status: init.status ?? (init.ok === false ? 500 : 200),
    json: vi.fn().mockResolvedValue(payload),
  }
}

function createDeferredResponse() {
  let resolve!: (value: MockResponse) => void

  const promise = new Promise<MockResponse>((nextResolve) => {
    resolve = nextResolve
  })

  return { promise, resolve }
}

function installFetchMock(routes: {
  classes?: MockResponse | Promise<MockResponse>
  activityTypes?: MockResponse | Promise<MockResponse>
  report?: MockResponse | Promise<MockResponse>
}) {
  const fetchMock = vi.fn((input: string | URL | Request) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (url.includes('/api/classes')) {
      return routes.classes ?? Promise.resolve(createJsonResponse({ classes: [] }))
    }

    if (url.includes('/api/activity-types')) {
      return routes.activityTypes ?? Promise.resolve(createJsonResponse({ activityTypes: [] }))
    }

    if (url.includes('/api/reports/participation')) {
      return routes.report ?? Promise.resolve(createJsonResponse({ data: { activities: [] } }))
    }

    return Promise.reject(new Error(`Unhandled fetch: ${url}`))
  })

  const mockedFetch = fetchMock as unknown as typeof fetch

  vi.spyOn(globalThis, 'fetch').mockImplementation(mockedFetch)

  if (typeof window !== 'undefined' && 'fetch' in window) {
    vi.spyOn(window, 'fetch').mockImplementation(mockedFetch)
  }

  return fetchMock
}

describe('ParticipationReportAdminPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState())
    pushMock.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders filter options for admin and shows empty state when there is no report data', async () => {
    installFetchMock({
      classes: Promise.resolve(
        createJsonResponse({
          data: {
            classes: [{ id: 101, name: 'CNTT K18A' }],
          },
        })
      ),
      activityTypes: Promise.resolve(
        createJsonResponse({
          activity_types: [{ id: 7, name: 'Tình nguyện' }],
        })
      ),
      report: Promise.resolve(createJsonResponse({ data: { activities: [] } })),
    })

    render(<ParticipationReportAdminPage />)

    expect(await screen.findByRole('option', { name: 'CNTT K18A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Tình nguyện' })).toBeInTheDocument()
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('shows an error banner instead of empty state when report loading fails', async () => {
    installFetchMock({
      classes: Promise.resolve(createJsonResponse({ classes: [] })),
      activityTypes: Promise.resolve(createJsonResponse({ activityTypes: [] })),
      report: Promise.resolve(
        createJsonResponse(
          {
            error: 'Tải báo cáo thất bại',
          },
          {
            ok: false,
            status: 500,
          }
        )
      ),
    })

    render(<ParticipationReportAdminPage />)

    expect(await screen.findByText('Tải báo cáo thất bại')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })

  it('shows the loading skeleton while the initial requests are still pending', async () => {
    const classesDeferred = createDeferredResponse()
    const activityTypesDeferred = createDeferredResponse()
    const reportDeferred = createDeferredResponse()

    installFetchMock({
      classes: classesDeferred.promise,
      activityTypes: activityTypesDeferred.promise,
      report: reportDeferred.promise,
    })

    render(<ParticipationReportAdminPage />)

    expect(await screen.findByTestId('activity-skeleton')).toBeInTheDocument()

    classesDeferred.resolve(createJsonResponse({ classes: [] }))
    activityTypesDeferred.resolve(createJsonResponse({ activityTypes: [] }))
    reportDeferred.resolve(createJsonResponse({ data: { activities: [] } }))

    await waitFor(() => {
      expect(screen.queryByTestId('activity-skeleton')).not.toBeInTheDocument()
    })

    expect(await screen.findByTestId('empty-state')).toBeInTheDocument()
  })
})
