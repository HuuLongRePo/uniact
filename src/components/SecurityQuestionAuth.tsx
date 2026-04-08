'use client';

import { useState, useEffect } from 'react';

interface Question {
  id: number;
  question_text: string;
}

interface SecurityQuestionAuthProps {
  userId?: number;
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
}

export default function SecurityQuestionAuth({
  userId,
  onSuccess,
  onError,
}: SecurityQuestionAuthProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [error, setError] = useState<string>('');
  const [attemptsLeft, setAttemptsLeft] = useState<number>(5);

  useEffect(() => {
    loadQuestions();
  }, [userId]);

  const loadQuestions = async () => {
    if (!userId) {
      setError('Cần đăng nhập để xem câu hỏi bảo mật');
      setLoadingQuestions(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/security-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        throw new Error('Không thể tải câu hỏi bảo mật');
      }

      const data = await res.json();
      setQuestions(data.questions || []);

      if (data.questions?.length === 0) {
        setError('Bạn chưa có câu hỏi bảo mật. Vui lòng liên hệ quản trị viên.');
      }
    } catch (err: any) {
      console.error('Load questions error:', err);
      setError(err.message || 'Lỗi tải câu hỏi');
      onError?.(err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setError('Cần đăng nhập để xác thực');
      return;
    }

    // Check if all questions are answered
    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      setError(`Vui lòng trả lời tất cả ${questions.length} câu hỏi`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const answersArray = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id].trim(),
      }));

      const res = await fetch('/api/auth/security-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, answers: answersArray }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes('Too many attempts')) {
          setError('❌ Quá nhiều lần thử sai. Vui lòng thử lại sau 1 giờ.');
          setAttemptsLeft(0);
        } else {
          throw new Error(data.error || 'Xác thực thất bại');
        }
        return;
      }

      if (data.token) {
        setError('✅ Xác thực thành công!');
        setTimeout(() => onSuccess(data.token), 1000);
      } else {
        setAttemptsLeft((prev) => Math.max(0, prev - 1));
        setError(`❌ Câu trả lời không đúng. Còn ${attemptsLeft - 1} lần thử.`);
      }
    } catch (err: any) {
      console.error('Security questions auth error:', err);
      setError(err.message || 'Xác thực thất bại');
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingQuestions) {
    return (
      <div className="security-questions bg-white p-6 rounded-lg shadow-md border-2 border-amber-200">
        <div className="flex items-center justify-center gap-3 py-8">
          <svg className="animate-spin h-6 w-6 text-amber-600" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-gray-600">Đang tải câu hỏi bảo mật...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="security-questions bg-white p-6 rounded-lg shadow-md border-2 border-amber-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl">🔑</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Câu hỏi bảo mật</h3>
          <p className="text-sm text-gray-600">Trả lời các câu hỏi cá nhân để xác thực</p>
        </div>
      </div>

      {error && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            error.includes('✅')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {error}
        </div>
      )}

      {attemptsLeft > 0 && attemptsLeft < 5 && (
        <div className="mb-4 p-3 rounded-md text-sm bg-amber-50 text-amber-800 border border-amber-200">
          ⚠️ Còn {attemptsLeft} lần thử
        </div>
      )}

      {questions.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="form-group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mr-2">
                  {index + 1}
                </span>
                {question.question_text}
              </label>
              <input
                type="text"
                value={answers[question.id] || ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                disabled={loading || attemptsLeft === 0}
                placeholder="Nhập câu trả lời của bạn..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                autoComplete="off"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading || attemptsLeft === 0}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
              loading || attemptsLeft === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang xác thực...
              </span>
            ) : (
              'Xác thực'
            )}
          </button>
        </form>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-3">📋</p>
          <p>Không có câu hỏi bảo mật</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>💡 Mẹo: Câu trả lời không phân biệt hoa thường</p>
        <p>⏱️ Giới hạn: 5 lần thử mỗi giờ</p>
        <p>🔒 Câu hỏi được tạo tự động từ lịch sử hoạt động của bạn</p>
      </div>
    </div>
  );
}
