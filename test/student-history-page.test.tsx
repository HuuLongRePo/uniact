import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import type { User } from '@/types/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudentHistoryPage from '@/app/student/history/page'
import { useAuth } from '@/contexts/AuthContext'

const { pushMock, toastErrorMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
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

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}))

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}))

function createAuthState(role: string = 'student') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  }
}

describe('StudentHistoryPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState())
    pushMock.mockReset()
    toastErrorMock.mockReset()
  })

  it('renders canonical nested history payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          history: [
            {
              participation_id: 1,
              activity_id: 9,
              title: 'Hoạt động A',
              description: 'Mô tả hoạt động',
              date_time: '2099-04-18T08:00:00.000Z',
              end_time: '2099-04-18T10:00:00.000Z',
              location: 'Hội trường A',
              activity_type: 'Kỹ năng',
              organization_level: 'Cấp trường',
              max_participants: 100,
              registered_at: '2099-04-17T08:00:00.000Z',
              attended: 1,
              achievement_level: 'good',
              feedback: 'Làm tốt',
              points_earned: 13,
              status: 'attended',
            },
          ],
        },
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    window.fetch = fetchMock as typeof fetch

    render(<StudentHistoryPage />)

    expect(await screen.findByText('Lịch Sử Hoạt Động')).toBeInTheDocument()
    expect(await screen.findByText('Hoạt động A')).toBeInTheDocument()
    expect(screen.getByText('Làm tốt')).toBeInTheDocument()
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('surfaces canonical api errors when history fetch fails', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Không thể tải lịch sử tham gia' }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    window.fetch = fetchMock as typeof fetch
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<StudentHistoryPage />)

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể tải lịch sử tham gia')
    })
    expect(await screen.findByText('Không có lịch sử')).toBeInTheDocument()
  })
})
