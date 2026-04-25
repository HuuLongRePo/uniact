'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { formatVietnamDateTime, toVietnamDateStamp } from '@/lib/timezone'

interface PollDetail {
  poll: {
    id: number
    title: string
    description: string
    class_name: string
    creator_name: string
    status: string
    allow_multiple: boolean
    created_at: string
  }
  options: Array<{
    id: number
    option_text: string
    vote_count: number
    percentage: string
  }>
  total_votes: number
  has_voted: boolean
}

export default function PollDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PollDetail | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user && params.id) {
      fetchPollDetail()
    }
  }, [user, authLoading, router, params.id])

  const fetchPollDetail = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/polls/${params.id}`)
      const pollData = await res.json()
      if (res.ok) {
        setData(pollData)
      } else {
        toast.error(pollData.error || 'Không thể tải poll')
        router.back()
      }
    } catch (error) {
      console.error('Fetch poll detail error:', error)
      router.back()
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) return <LoadingSpinner />
  if (!data) return <div className="container mx-auto px-4 py-8">Không có dữ liệu</div>

  const handleExportCSV = () => {
    if (!data) return

    const headers = ['Lua chon', 'So phieu', 'Phan tram']
    const rows = data.options.map((option) => [`"${option.option_text}"`, option.vote_count, `${option.percentage}%`])

    const csv = [
      `"Tieu de cuoc khao sat","${data.poll.title}"`,
      `"Mo ta","${data.poll.description || ''}"`,
      `"Lop","${data.poll.class_name || 'Tat ca lop'}"`,
      `"Tong phieu","${data.total_votes}"`,
      `"Ngay tao","${formatVietnamDateTime(data.poll.created_at)}"`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `poll_${data.poll.id}_${toVietnamDateStamp(new Date())}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Đã xuất kết quả khảo sát')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline">
        Quay lại
      </button>

      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold">{data.poll.title}</h1>
            {data.poll.description && <p className="mb-3 text-gray-600">{data.poll.description}</p>}
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Lớp: {data.poll.class_name || 'Tất cả lớp'}</span>
              <span>Tạo bởi: {data.poll.creator_name}</span>
              <span>{formatVietnamDateTime(data.poll.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <span
              className={`rounded px-3 py-1 text-sm font-medium ${
                data.poll.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {data.poll.status === 'active' ? 'Đang mở' : 'Đã đóng'}
            </span>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </button>
          </div>
        </div>

        <div className="rounded bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Tổng số phản hồi:</span>
            <span className="text-2xl font-bold text-blue-600">{data.total_votes}</span>
          </div>
          {data.poll.allow_multiple && (
            <p className="mt-2 text-xs text-blue-800">* Cho phép chọn nhiều lựa chọn</p>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Kết quả</h2>

        <div className="space-y-4">
          {data.options.map((option, idx) => (
            <div key={option.id} className="border-l-4 border-blue-500 pl-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    {idx + 1}. {option.option_text}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div className="font-bold text-blue-600">{option.vote_count} phiếu</div>
                  <div className="text-sm text-gray-600">{option.percentage}%</div>
                </div>
              </div>

              <div className="relative h-8 w-full overflow-hidden rounded bg-gray-100">
                <div
                  className="absolute left-0 top-0 h-full bg-blue-500 transition-all"
                  style={{ width: `${option.percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                  {option.vote_count > 0 && `${option.vote_count} (${option.percentage}%)`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.options.length === 0 && (
          <p className="py-8 text-center text-gray-500">Chưa có lựa chọn nào</p>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">Biểu đồ tròn</h2>
        <div className="flex justify-center">
          <div className="relative flex h-64 w-64 items-center justify-center overflow-hidden rounded-full border-8 border-gray-200">
            {data.options.map((option, idx) => {
              const previousPercentage = data.options
                .slice(0, idx)
                .reduce((sum, item) => sum + parseFloat(item.percentage), 0)

              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

              return (
                <div
                  key={option.id}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background: `conic-gradient(
                      transparent 0deg ${previousPercentage * 3.6}deg,
                      ${colors[idx % colors.length]} ${previousPercentage * 3.6}deg ${(previousPercentage + parseFloat(option.percentage)) * 3.6}deg,
                      transparent ${(previousPercentage + parseFloat(option.percentage)) * 3.6}deg
                    )`,
                  }}
                />
              )
            })}
            <div className="absolute inset-8 flex items-center justify-center rounded-full bg-white">
              <div className="text-center">
                <div className="text-3xl font-bold">{data.total_votes}</div>
                <div className="text-sm text-gray-600">phiếu</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {data.options.map((option, idx) => {
            const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500']
            return (
              <div key={option.id} className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded ${colors[idx % colors.length]}`} />
                <span className="truncate text-sm">{option.option_text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

