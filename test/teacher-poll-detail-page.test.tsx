import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@/types/database'
import PollDetailPage from '@/app/teacher/polls/[id]/page'
import { useAuth } from '@/contexts/AuthContext'

const { pushMock, backMock, toastErrorMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

const routerMock = {
  push: pushMock,
  replace: vi.fn(),
  back: backMock,
  prefetch: vi.fn(),
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
  useParams: () => ({ id: '9' }),
}))

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}))

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}))

function createAuthState(role: string = 'teacher') {
  return {
    user: { id: 2, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  }
}

describe('PollDetailPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState())
    pushMock.mockReset()
    backMock.mockReset()
    toastErrorMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('renders clean teacher poll detail labels and chart sections', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        poll: {
          id: 9,
          title: 'Khao sat giua ky',
          description: 'Danh gia giua ky',
          class_name: 'CNTT K18A',
          creator_name: 'GV A',
          status: 'closed',
          allow_multiple: true,
          created_at: '2026-04-25T00:00:00.000Z',
        },
        options: [
          { id: 1, option_text: 'Dong y', vote_count: 7, percentage: '70' },
          { id: 2, option_text: 'Can xem lai', vote_count: 3, percentage: '30' },
        ],
        total_votes: 10,
        has_voted: false,
      }),
    }))

    vi.stubGlobal('fetch', fetchMock)
    window.fetch = fetchMock as typeof fetch

    const { container } = render(<PollDetailPage />)

    expect(await screen.findByText('Tổng số phản hồi:')).toBeInTheDocument()
    expect(screen.getByText('Đã đóng')).toBeInTheDocument()
    expect(screen.getByText('Biểu đồ tròn')).toBeInTheDocument()
    expect(screen.getByText('phiếu')).toBeInTheDocument()
    expect(container.textContent || '').not.toMatch(/[ÃÂâ]/)
  })
})
