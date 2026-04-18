import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import type { User } from '@/types/database'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudentPointsBreakdownPage from '@/app/student/points/page'
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

describe('StudentPointsBreakdownPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState())
    pushMock.mockReset()
    toastErrorMock.mockReset()
  })

  it('renders canonical nested points breakdown payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          byActivity: [
            {
              id: 1,
              title: 'Hoạt động A',
              date_time: '2099-04-18T08:00:00.000Z',
              activity_type: 'Kỹ năng',
              organization_level: 'Cấp trường',
              achievement_level: 'good',
              base_points: 10,
              type_multiplier: 1,
              level_multiplier: 1,
              achievement_multiplier: 1.2,
              subtotal: 12,
              bonus_points: 1,
              penalty_points: 0,
              total_points: 13,
            },
          ],
          byType: [],
          byLevel: [],
          byAchievement: [],
          awards: [],
          summary: {
            total_base_points: 10,
            total_after_multipliers: 12,
            total_bonus: 1,
            total_penalty: 0,
            grand_total: 13,
            total_award_points: 0,
            final_total: 13,
          },
        },
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    window.fetch = fetchMock as typeof fetch

    render(<StudentPointsBreakdownPage />)

    expect(await screen.findByText('Chi Tiết Điểm Rèn Luyện', { exact: false })).toBeInTheDocument()
    expect(await screen.findByText('Hoạt động A')).toBeInTheDocument()
    expect(screen.getByText('Tổng điểm cơ bản')).toBeInTheDocument()
    expect(screen.getByText('Tổng cộng')).toBeInTheDocument()
    expect(screen.getAllByText('13').length).toBeGreaterThan(0)
    expect(toastErrorMock).not.toHaveBeenCalled()
  })

  it('surfaces canonical api errors when breakdown fetch fails', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Không thể tải chi tiết điểm rèn luyện' }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    window.fetch = fetchMock as typeof fetch
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<StudentPointsBreakdownPage />)

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể tải chi tiết điểm rèn luyện')
    })
    expect(await screen.findByText('Không thể tải dữ liệu')).toBeInTheDocument()
  })
})
