'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { formatVietnamDateTime } from '@/lib/timezone'

interface Poll {
  id: number
  title: string
  description: string
  class_name: string
  status: string
  response_count: number
  has_voted: number
  allow_multiple: boolean
  created_at: string
}

interface PollDetail {
  poll: {
    id: number
    title: string
    description: string
    allow_multiple: boolean
    status: string
  }
  options: Array<{
    id: number
    option_text: string
    vote_count: number
    percentage: string
  }>
  total_votes: number
  user_votes: number[]
  has_voted: boolean
}

export default function StudentPollsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [polls, setPolls] = useState<Poll[]>([])
  const [selectedPoll, setSelectedPoll] = useState<PollDetail | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<number[]>([])

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login')
      return
    }
    if (user) {
      fetchPolls()
    }
  }, [user, authLoading, router])

  const fetchPolls = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/polls')
      const data = await res.json()
      if (res.ok) {
        setPolls(data.polls || [])
      }
    } catch (error) {
      console.error('Fetch polls error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewPoll = async (pollId: number) => {
    try {
      const res = await fetch(`/api/polls/${pollId}`)
      const data = await res.json()
      if (res.ok) {
        setSelectedPoll(data)
        setSelectedOptions(data.user_votes || [])
      }
    } catch (error) {
      console.error('Fetch poll detail error:', error)
    }
  }

  const handleToggleOption = (optionId: number) => {
    if (selectedPoll?.poll.allow_multiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      )
    } else {
      setSelectedOptions([optionId])
    }
  }

  const handleSubmitVote = async () => {
    if (!selectedPoll || selectedOptions.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 lựa chọn')
      return
    }

    try {
      const res = await fetch(`/api/polls/${selectedPoll.poll.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_ids: selectedOptions }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Đã ghi nhận phản hồi của bạn')
        setSelectedPoll(null)
        setSelectedOptions([])
        fetchPolls()
      } else {
        toast.error(data.error || 'Gửi phản hồi thất bại')
      }
    } catch (error) {
      console.error('Submit vote error:', error)
      toast.error('Lỗi khi gửi phản hồi')
    }
  }

  if (authLoading || loading) return <LoadingSpinner />

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Khảo sát / Poll</h1>

      {selectedPoll ? (
        <div className="rounded-lg bg-white p-6 shadow">
          <button
            onClick={() => {
              setSelectedPoll(null)
              setSelectedOptions([])
            }}
            className="mb-4 text-blue-600 hover:underline"
          >
            Quay lại danh sách
          </button>

          <h2 className="mb-2 text-2xl font-bold">{selectedPoll.poll.title}</h2>
          {selectedPoll.poll.description && (
            <p className="mb-4 text-gray-600">{selectedPoll.poll.description}</p>
          )}

          {selectedPoll.has_voted ? (
            <div>
              <div className="mb-4 border-l-4 border-green-500 bg-green-50 p-4">
                <p className="font-medium text-green-800">Bạn đã tham gia poll này</p>
              </div>

              <h3 className="mb-3 font-bold">Kết quả:</h3>
              <div className="space-y-3">
                {selectedPoll.options.map((option) => (
                  <div key={option.id} className="rounded border p-3">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="font-medium">{option.option_text}</div>
                      <div className="ml-4 text-right">
                        <div className="font-bold text-blue-600">{option.vote_count}</div>
                        <div className="text-sm text-gray-600">{option.percentage}%</div>
                      </div>
                    </div>
                    <div className="h-6 w-full overflow-hidden rounded bg-gray-100">
                      <div
                        className={`h-full transition-all ${
                          selectedPoll.user_votes.includes(option.id) ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${option.percentage}%` }}
                      />
                    </div>
                    {selectedPoll.user_votes.includes(option.id) && (
                      <p className="mt-1 text-xs text-green-600">Lựa chọn của bạn</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {selectedPoll.poll.allow_multiple && (
                <p className="mb-3 text-sm text-blue-600">* Có thể chọn nhiều lựa chọn</p>
              )}

              <div className="mb-6 space-y-2">
                {selectedPoll.options.map((option) => (
                  <label
                    key={option.id}
                    className={`cursor-pointer rounded border p-4 transition ${
                      selectedOptions.includes(option.id) ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    } flex items-center`}
                  >
                    <input
                      type={selectedPoll.poll.allow_multiple ? 'checkbox' : 'radio'}
                      checked={selectedOptions.includes(option.id)}
                      onChange={() => handleToggleOption(option.id)}
                      className="mr-3"
                    />
                    <span className="font-medium">{option.option_text}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={handleSubmitVote}
                disabled={selectedOptions.length === 0}
                className="w-full rounded bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Gửi phản hồi
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <div key={poll.id} className="rounded-lg bg-white p-6 shadow">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{poll.title}</h3>
                  {poll.description && <p className="mt-1 text-sm text-gray-600">{poll.description}</p>}
                  <div className="mt-2 flex gap-3 text-sm text-gray-500">
                    <span>Lớp: {poll.class_name}</span>
                    <span>Phản hồi: {poll.response_count}</span>
                    <span>{formatVietnamDateTime(poll.created_at, 'date')}</span>
                  </div>
                </div>
                {poll.has_voted > 0 ? (
                  <span className="rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    Đã vote
                  </span>
                ) : (
                  <span className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                    Chưa vote
                  </span>
                )}
              </div>

              <button
                onClick={() => handleViewPoll(poll.id)}
                className="rounded bg-blue-50 px-4 py-2 font-medium text-blue-600 hover:bg-blue-100"
              >
                {poll.has_voted > 0 ? 'Xem kết quả' : 'Tham gia poll'}
              </button>
            </div>
          ))}

          {polls.length === 0 && (
            <div className="py-16 text-center text-gray-500">
              <p className="text-lg">Chưa có poll nào</p>
              <p className="mt-2 text-sm">Giảng viên sẽ tạo poll để khảo sát ý kiến</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

