'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, RefreshCw } from 'lucide-react';

interface TestAccount {
  email: string;
  password?: string;
  role: string;
  name: string;
}

interface DemoAccountsPayload {
  success?: boolean;
  error?: string;
  data?: TestAccount[];
  accounts?: {
    admin: string | null;
    teachers: string[];
    students: string[];
  };
}

interface LoginTestPanelProps {
  onSelectAccount?: (email: string, password: string) => void;
}

export default function LoginTestPanel({ onSelectAccount }: LoginTestPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TestAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch test accounts from database
  useEffect(() => {
    fetchTestAccounts();
  }, []);

  const inferPassword = (email: string, role: string): string => {
    if (role === 'admin') {
      return email === 'admin@annd.edu.vn' ? 'Admin@2025' : 'admin123';
    }

    return role === 'teacher' ? 'teacher123' : 'student123';
  };

  const normalizeAccounts = (payload: DemoAccountsPayload): TestAccount[] => {
    if (Array.isArray(payload.data)) {
      return payload.data.filter((account): account is TestAccount =>
        Boolean(account?.email && account?.role && account?.name)
      );
    }

    if (!payload.accounts) {
      return [];
    }

    return [
      ...(payload.accounts.admin
        ? [
            {
              email: payload.accounts.admin,
              password: inferPassword(payload.accounts.admin, 'admin'),
              role: 'admin',
              name: 'Administrator',
            },
          ]
        : []),
      ...payload.accounts.teachers.map((email, index) => ({
        email,
        password: inferPassword(email, 'teacher'),
        role: 'teacher',
        name: `Teacher ${index + 1}`,
      })),
      ...payload.accounts.students.map((email, index) => ({
        email,
        password: inferPassword(email, 'student'),
        role: 'student',
        name: `Student ${index + 1}`,
      })),
    ];
  };

  // Do not expose hardcoded credentials on the client.
  // When API is unavailable, the panel should fail closed instead of leaking fallback passwords.
  const STATIC_FALLBACK: TestAccount[] = [];

  const fetchTestAccounts = async () => {
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('/api/auth/demo-accounts', { signal: controller.signal });
      clearTimeout(timerId);

      let data: DemoAccountsPayload = {};
      try {
        data = await res.json();
      } catch {
        setAccounts(STATIC_FALLBACK);
        setError(`Phản hồi API không hợp lệ (HTTP ${res.status})`);
        return;
      }

      if (!res.ok) {
        setAccounts(STATIC_FALLBACK);
        setError(`API lỗi HTTP ${res.status}: ${data.error ?? ''}`);
        return;
      }

      const normalizedAccounts = normalizeAccounts(data);
      if (normalizedAccounts.length === 0) {
        setAccounts(STATIC_FALLBACK);
        setError('Database chưa có tài khoản demo khả dụng');
        return;
      }

      setAccounts(normalizedAccounts);
    } catch (err: any) {
      clearTimeout(timerId);
      const msg = err?.name === 'AbortError' ? 'Timeout (>12s)' : (err?.message ?? String(err));
      console.error('LoginTestPanel fetch error:', msg);
      setAccounts(STATIC_FALLBACK);
      setError(`Không thể tải từ API: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handleQuickLogin = (account: TestAccount) => {
    if (!account.password) {
      return;
    }

    if (onSelectAccount) {
      onSelectAccount(account.email, account.password);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 font-medium z-50 animate-pulse hover:animate-none"
      >
        <span>🧪 Test Accounts</span>
        <ChevronUp className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl border-2 border-gray-200 w-96 max-h-[600px] overflow-hidden z-50 animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧪</span>
          <div>
            <h3 className="font-bold text-lg">Test Accounts</h3>
            <p className="text-xs opacity-90">
              {isLoading ? 'Đang tải...' : `${accounts.length} tài khoản • Click để login`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTestAccounts}
            disabled={isLoading}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh accounts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[500px]">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-sm text-gray-600">Đang tải tài khoản từ database...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="px-4 pt-3 pb-2 bg-yellow-50 border-b border-yellow-200">
                <p className="text-xs text-yellow-800 break-words">⚠️ {error}</p>
                <button
                  onClick={fetchTestAccounts}
                  className="mt-1 text-xs text-blue-600 underline hover:text-blue-800"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Admin Section */}
            {accounts.filter((acc) => acc.role === 'admin').length > 0 && (
              <div className="p-4 border-b bg-red-50">
                <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
                  👑 Administrator
                </h4>
                {accounts
                  .filter((acc) => acc.role === 'admin')
                  .map((account, idx) => (
                    <AccountCard
                      key={`admin-${idx}`}
                      account={account}
                      onCopy={copyToClipboard}
                      copiedField={copiedField}
                      onQuickLogin={handleQuickLogin}
                    />
                  ))}
              </div>
            )}

            {/* Teachers Section */}
            {accounts.filter((acc) => acc.role === 'teacher').length > 0 && (
              <div className="p-4 border-b bg-green-50">
                <h4 className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">
                  👨‍🏫 Teachers ({accounts.filter((acc) => acc.role === 'teacher').length})
                </h4>
                {accounts
                  .filter((acc) => acc.role === 'teacher')
                  .map((account, idx) => (
                    <AccountCard
                      key={`teacher-${idx}`}
                      account={account}
                      onCopy={copyToClipboard}
                      copiedField={copiedField}
                      onQuickLogin={handleQuickLogin}
                    />
                  ))}
              </div>
            )}

            {/* Students Section */}
            {accounts.filter((acc) => acc.role === 'student').length > 0 && (
              <div className="p-4 bg-blue-50">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                  🎓 Students ({accounts.filter((acc) => acc.role === 'student').length})
                </h4>
                {accounts
                  .filter((acc) => acc.role === 'student')
                  .map((account, idx) => (
                    <AccountCard
                      key={`student-${idx}`}
                      account={account}
                      onCopy={copyToClipboard}
                      copiedField={copiedField}
                      onQuickLogin={handleQuickLogin}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t text-center">
        <p className="text-xs text-gray-600">
          💡 <strong>Tip:</strong> Chỉ tài khoản có mật khẩu demo mới hỗ trợ quick login
        </p>
      </div>
    </div>
  );
}

interface AccountCardProps {
  account: TestAccount;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
  onQuickLogin: (account: TestAccount) => void;
}

function AccountCard({ account, onCopy, copiedField, onQuickLogin }: AccountCardProps) {
  const roleColors = {
    admin: 'border-red-200 hover:border-red-400 hover:bg-red-50',
    teacher: 'border-green-200 hover:border-green-400 hover:bg-green-50',
    student: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  };

  return (
    <div
      className={`mb-2 last:mb-0 p-3 border-2 rounded-lg transition-all cursor-pointer ${roleColors[account.role as keyof typeof roleColors]}`}
      onClick={() => {
        if (account.password) {
          onQuickLogin(account);
        }
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-800 truncate">{account.name}</p>
          <p className="text-xs text-gray-600 truncate">{account.email}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy(account.email, `email-${account.email}`);
          }}
          className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
        >
          {copiedField === `email-${account.email}` ? (
            <>
              <Check className="w-3 h-3 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Email</span>
            </>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy(account.password, `pass-${account.email}`);
          }}
          className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
        >
          {copiedField === `pass-${account.email}` ? (
            <>
              <Check className="w-3 h-3 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Pass</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500 font-mono">
          🔑 {account.password || 'Không công khai mật khẩu demo'}
        </p>
      </div>
    </div>
  );
}
