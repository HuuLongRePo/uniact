import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { User } from '@/types/database'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ActivityStatisticsPage from '@/app/admin/reports/activity-statistics/page'
import { useAuth } from '@/contexts/AuthContext'

const {
  pushMock,
  replaceMock,
  backMock,
  prefetchMock,
  toastErrorMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  backMock: vi.fn(),
  prefetchMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    back: backMock,
    prefetch: prefetchMock,
  }),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}))

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}))

type MockResponse = Pick<Response, 'ok' | 'status' | 'json'>

const activityPayload = {
  success: true,
  data: [
    {
      id: 11,
      title: 'Activity A',
      date_time: '2026-04-01T08:00:00.000Z',
      location: 'Hall A',
      organizer_name: 'Organizer A',
      activity_type: 'Volunteer',
      organization_level: 'School',
      max_participants: 200,
      total_participants: 180,
      attended_count: 150,
      registered_only: 30,
      excellent_count: 20,
      good_count: 45,
      avg_points_per_student: 8.4,
    },
  ],
  statistics: {
    total_activities: 1,
    total_participants: 180,
    total_attended: 150,
    avg_participants_per_activity: 180,
    attendance_rate: 83.3,
  },
}

const emptyPayload = {
  success: true,
  data: [],
  statistics: {
    total_activities: 0,
    total_participants: 0,
    total_attended: 0,
    avg_participants_per_activity: 0,
    attendance_rate: 0,
  },
}

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

function installFetchMock(responses: Array<MockResponse | Promise<MockResponse>>) {
  const queue = [...responses]
  const fallback =
    responses.length > 0
      ? responses[responses.length - 1]
      : Promise.resolve(createJsonResponse({ success: true, data: [], statistics: {} }))

  const fetchMock = vi.fn(() => (queue.shift() ?? fallback) as MockResponse | Promise<MockResponse>)
  const mockedFetch = fetchMock as unknown as typeof fetch

  vi.spyOn(globalThis, 'fetch').mockImplementation(mockedFetch)

  if (typeof window !== 'undefined' && 'fetch' in window) {
    vi.spyOn(window, 'fetch').mockImplementation(mockedFetch)
  }

  return fetchMock
}

describe('ActivityStatisticsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState())
    pushMock.mockReset()
    replaceMock.mockReset()
    backMock.mockReset()
    prefetchMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders activity data and reapplies filters with query params', async () => {
    const fetchMock = installFetchMock([
      Promise.resolve(createJsonResponse(activityPayload)),
      Promise.resolve(createJsonResponse(activityPayload)),
      Promise.resolve(createJsonResponse(emptyPayload)),
    ])

    const { container } = render(<ActivityStatisticsPage />)

    const titleCell = await screen.findByText('Activity A')
    expect(titleCell).toBeInTheDocument()

    const row = titleCell.closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLTableRowElement).getByText('Organizer A')).toBeInTheDocument()
    expect(row).toHaveTextContent('150')

    const dateInputs = container.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>
    fireEvent.change(dateInputs[0], { target: { value: '2026-04-01' } })
    expect(dateInputs[0]?.value).toBe('2026-04-01')

    const callsBeforeApply = fetchMock.mock.calls.length
    const buttons = await screen.findAllByRole('button')
    fireEvent.click(buttons[0] as HTMLButtonElement)

    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeApply)
    })

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('renders the empty table state when there are no activities', async () => {
    installFetchMock([Promise.resolve(createJsonResponse(emptyPayload))])

    const { container } = render(<ActivityStatisticsPage />)

    await waitFor(() => {
      expect(container.querySelector('tbody td[colspan="9"]')).not.toBeNull()
    })

    expect(screen.queryByText('Activity A')).not.toBeInTheDocument()
  })

  it('shows a toast error when the statistics request fails', async () => {
    installFetchMock([
      Promise.resolve(
        createJsonResponse(
          {
            error: 'Activity statistics unavailable',
          },
          {
            ok: false,
            status: 500,
          }
        )
      ),
    ])

    render(<ActivityStatisticsPage />)

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Activity statistics unavailable')
    })
  })
})
