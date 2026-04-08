'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  email: string;
  class_id?: number;
  class_name?: string;
}

interface BonusProposal {
  id?: number;
  student_id: number;
  points: number;
  source_type: string;
  source_id?: number;
  evidence_url?: string;
  description?: string;
}

export default function TeacherBonusProposePage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [proposal, setProposal] = useState<BonusProposal>({
    student_id: 0,
    points: 0,
    source_type: 'achievement',
    source_id: undefined,
    evidence_url: '',
    description: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [recentProposals, setRecentProposals] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'teacher')) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchStudents();
      fetchRecentProposals();
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    const filtered = students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/teacher/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách học viên:', error);
      toast.error('Không thể tải danh sách học viên');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentProposals = async () => {
    try {
      const res = await fetch('/api/bonus?status=pending');
      if (res.ok) {
        const data = await res.json();
        setRecentProposals(data.suggestions || []);
      }
    } catch (error) {
      console.error('Lỗi tải đề xuất gần đây:', error);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setProposal({ ...proposal, student_id: student.id });
    setShowForm(true);
    setSearchQuery('');
  };

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proposal.student_id || !proposal.points || proposal.points <= 0) {
      toast.error('Vui lòng nhập đủ thông tin: học viên và điểm');
      return;
    }

    if (proposal.points > 15) {
      toast.error('Điểm đề xuất không được vượt quá 15 điểm');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Đề xuất thành công! ID: ${data.suggestion_id}`);

        // Reset form
        setProposal({
          student_id: 0,
          points: 0,
          source_type: 'achievement',
          source_id: undefined,
          evidence_url: '',
          description: '',
        });
        setSelectedStudent(null);
        setShowForm(false);

        // Refresh recent proposals
        fetchRecentProposals();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Không thể gửi đề xuất');
      }
    } catch (error) {
      console.error('Lỗi gửi đề xuất:', error);
      toast.error('Lỗi khi gửi đề xuất');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceTypeOptions = [
    { value: 'achievement', label: 'Thành tích / Giải thưởng' },
    { value: 'activity', label: 'Tham gia hoạt động' },
    { value: 'development', label: 'Phát triển kỹ năng' },
    { value: 'social', label: 'Đóng góp xã hội' },
    { value: 'special', label: 'Đạt giải đặc biệt' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/teacher/dashboard" className="p-2 hover:bg-white/50 rounded-lg transition">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Đề Xuất Cộng Điểm</h1>
            <p className="text-gray-600 mt-1">Ghi nhận thành tích và hoạt động của học viên</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Student Selection & Form */}
          <div className="lg:col-span-2">
            {/* Student Search */}
            {!showForm && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">1. Chọn Học Viên</h2>

                <input
                  type="text"
                  placeholder="Tìm học viên theo tên hoặc email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Đang tải...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Không tìm thấy học viên</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student)}
                        className="w-full text-left p-3 hover:bg-blue-50 border border-gray-200 rounded-lg transition"
                      >
                        <div className="font-semibold text-gray-800">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                        {student.class_name && (
                          <div className="text-xs text-gray-400 mt-1">
                            Lớp: {student.class_name}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Proposal Form */}
            {showForm && selectedStudent && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">2. Nhập Thông Tin Đề Xuất</h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setSelectedStudent(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-gray-700">
                    <span className="font-semibold">Học viên:</span> {selectedStudent.name}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{selectedStudent.email}</p>
                </div>

                <form onSubmit={handleSubmitProposal} className="space-y-4">
                  {/* Source Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Loại hoạt động *
                    </label>
                    <select
                      value={proposal.source_type}
                      onChange={(e) => setProposal({ ...proposal, source_type: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {sourceTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Points */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Điểm đề xuất (tối đa 15) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      step="0.5"
                      value={proposal.points}
                      onChange={(e) =>
                        setProposal({ ...proposal, points: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập điểm (0-15)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Điểm sẽ được cấp quản trị viên duyệt trước khi áp dụng
                    </p>
                  </div>

                  {/* Evidence URL */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Liên kết bằng chứng (tùy chọn)
                    </label>
                    <input
                      type="url"
                      value={proposal.evidence_url || ''}
                      onChange={(e) => setProposal({ ...proposal, evidence_url: e.target.value })}
                      placeholder="https://example.com/evidence"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mô tả chi tiết (tùy chọn)
                    </label>
                    <textarea
                      value={proposal.description || ''}
                      onChange={(e) => setProposal({ ...proposal, description: e.target.value })}
                      placeholder="Mô tả hoạt động / thành tích của học viên..."
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Đang gửi...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Gửi Đề Xuất
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedStudent(null);
                      }}
                      className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right: Recent Proposals & Guidelines */}
          <div className="space-y-6">
            {/* Guidelines */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Hướng Dẫn</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Mỗi đề xuất tối đa <span className="font-semibold">15 điểm</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Học viên được tối đa <span className="font-semibold">50 điểm/học kỳ</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Tất cả đề xuất cần <span className="font-semibold">phê duyệt</span> từ quản trị
                    viên
                  </p>
                </div>
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p>
                    Cung cấp <span className="font-semibold">bằng chứng</span> để tăng tính xác thực
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Proposals */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Đề Xuất Gần Đây</h3>
              {recentProposals.length === 0 ? (
                <p className="text-gray-500 text-sm">Chưa có đề xuất nào</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentProposals.slice(0, 5).map((proposal) => (
                    <div
                      key={proposal.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">
                            +{proposal.points} điểm
                          </div>
                          <div className="text-xs text-gray-600">{proposal.source_type}</div>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            proposal.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : proposal.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {proposal.status === 'pending'
                            ? 'Chờ duyệt'
                            : proposal.status === 'approved'
                              ? 'Đã duyệt'
                              : 'Từ chối'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
