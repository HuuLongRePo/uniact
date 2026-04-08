import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import type { User } from '@/types/database'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TeacherReportPage from '@/app/admin/reports/teachers/page'
import { useAuth } from '@/contexts/AuthContext'

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}))

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

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}))

type MockResponse = Pick<Response, 'ok' | 'status' | 'json'>
let originalConsoleError: typeof console.error

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

function installFetchMock(response: MockResponse | Promise<MockResponse>) {
  const fetchMock = vi.fn(() => response)

  vi.stubGlobal('fetch', fetchMock)
  window.fetch = fetchMock as typeof fetch

  return fetchMock
}

describe('TeacherReportPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState())
    pushMock.mockReset()
    originalConsoleError = console.error
    console.error = vi.fn() as typeof console.error
  })

  afterEach(() => {
    console.error = originalConsoleError
    vi.restoreAllMocks()
  })

  it('renders teacher rows when the report loads successfully', async () => {
    installFetchMock(
      Promise.resolve(
        createJsonResponse({
          data: {
            teachers: [
              {
                id: 2,
                name: 'Alice Nguyen',
                email: 'alice@uniact.test',
                totalActivitiesCreated: 5,
                averageAttendance: 88.2,
                averagePointsAwarded: 7.5,
                totalStudentsParticipated: 120,
              },
              {
                id: 1,
                name: 'Bao Tran',
                email: 'bao@uniact.test',
                totalActivitiesCreated: 3,
                averageAttendance: 76,
                averagePointsAwarded: 6.2,
                totalStudentsParticipated: 64,
              },
            ],
          },
        })
      )
    )

    render(<TeacherReportPage />)

    expect(await screen.findByText('Alice Nguyen')).toBeInTheDocument()
    expect(screen.getByText('alice@uniact.test')).toBeInTheDocument()
    expect(screen.getByText('Bao Tran')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('renders the empty table state when the report has no teachers', async () => {
    installFetchMock(Promise.resolve(createJsonResponse({ teachers: [] })))

    const { container } = render(<TeacherReportPage />)

    await waitFor(() => {
      expect(container.querySelector('tbody td[colspan="6"]')).not.toBeNull()
    })

    expect(screen.queryByText('Alice Nguyen')).not.toBeInTheDocument()
  })

  it('shows an error banner when the report request fails', async () => {
    installFetchMock(
      Promise.resolve(
        createJsonResponse(
          {
            error: 'Teacher report unavailable',
          },
          {
            ok: false,
            status: 500,
          }
        )
      )
    )
    render(<TeacherReportPage />)

    expect(await screen.findByText('Teacher report unavailable')).toBeInTheDocument()
  })
})
