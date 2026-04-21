'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

type SupportedRole = 'admin' | 'teacher' | 'student';

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
  search?: {
    hasMore?: boolean;
  };
  accounts?: {
    admin: string | null;
    teachers: string[];
    students: string[];
  };
}

interface LoginTestPanelProps {
  onSelectAccount?: (email: string, password: string) => void;
}

interface SearchState {
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  results: TestAccount[];
}

const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 24;
const SEARCH_DEBOUNCE_MS = 260;

const ICON_BUTTON_CLASS =
  'cursor-pointer rounded-md border border-[var(--quick-login-panel-border)] bg-transparent p-2 text-[var(--quick-login-header-text)] transition-colors duration-200 hover:bg-[var(--quick-login-header-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quick-login-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--quick-login-header-bg-end)] disabled:cursor-not-allowed disabled:opacity-60';

const COPY_BUTTON_CLASS =
  'cursor-pointer flex flex-1 items-center justify-center gap-1 rounded-md border border-[var(--quick-login-copy-border)] bg-[var(--quick-login-copy-bg)] px-2 py-1 text-xs font-medium text-[var(--quick-login-copy-text)] transition-colors duration-200 hover:bg-[var(--quick-login-copy-hover)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quick-login-focus-ring)]';

const SEARCH_INPUT_CLASS =
  'w-full rounded-md border border-[var(--quick-login-search-border)] bg-[var(--quick-login-search-bg)] py-2 pl-8 pr-2 text-sm text-[var(--quick-login-search-text)] shadow-sm transition-colors duration-200 placeholder:text-[var(--quick-login-search-placeholder)] focus-visible:border-[var(--quick-login-search-border-focus)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quick-login-focus-ring)]';

function isSupportedRole(role: string): role is SupportedRole {
  return role === 'admin' || role === 'teacher' || role === 'student';
}

function inferPassword(email: string, role: string): string {
  if (!isSupportedRole(role)) {
    return '';
  }

  if (role === 'admin') {
    return email === 'admin@annd.edu.vn' ? 'Admin@2025' : 'admin123';
  }

  return role === 'teacher' ? 'teacher123' : 'student123';
}

function normalizeAccounts(payload: DemoAccountsPayload): TestAccount[] {
  if (Array.isArray(payload.data)) {
    return dedupeAccounts(
      payload.data
        .filter((account): account is TestAccount =>
          Boolean(account?.email && account?.role && account?.name)
        )
        .map((account) => ({
          ...account,
          password: account.password ?? inferPassword(account.email, account.role),
        }))
    );
  }

  if (!payload.accounts) {
    return [];
  }

  return dedupeAccounts([
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
  ]);
}

function dedupeAccounts(accounts: TestAccount[]): TestAccount[] {
  const roleWeight: Record<SupportedRole, number> = {
    admin: 0,
    teacher: 1,
    student: 2,
  };

  const unique = new Map<string, TestAccount>();

  for (const account of accounts) {
    unique.set(`${account.role}:${account.email.toLowerCase()}`, account);
  }

  return [...unique.values()].sort((a, b) => {
    const aWeight = isSupportedRole(a.role) ? roleWeight[a.role] : 9;
    const bWeight = isSupportedRole(b.role) ? roleWeight[b.role] : 9;

    if (aWeight !== bWeight) {
      return aWeight - bWeight;
    }

    return a.name.localeCompare(b.name, 'vi');
  });
}

export default function LoginTestPanel({ onSelectAccount }: LoginTestPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TestAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    error: null,
    hasMore: false,
    results: [],
  });

  const groupedAccounts = useMemo(
    () => ({
      admin: accounts.filter((acc) => acc.role === 'admin'),
      teacher: accounts.filter((acc) => acc.role === 'teacher'),
      student: accounts.filter((acc) => acc.role === 'student'),
    }),
    [accounts]
  );

  useEffect(() => {
    void fetchTestAccounts();
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timerId);
  }, [searchQuery]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    if (debouncedSearch.length < SEARCH_MIN_LENGTH) {
      setSearchState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        hasMore: false,
        results: [],
      }));
      return;
    }

    const controller = new AbortController();
    void fetchSearchAccounts(debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [debouncedSearch, isExpanded]);

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
        setAccounts([]);
        setError(`API response is invalid JSON (HTTP ${res.status})`);
        return;
      }

      if (!res.ok) {
        setAccounts([]);
        setError(`API returned HTTP ${res.status}: ${data.error ?? ''}`.trim());
        return;
      }

      const normalizedAccounts = normalizeAccounts(data);
      if (normalizedAccounts.length === 0) {
        setAccounts([]);
        setError('Database does not have any active demo accounts yet');
        return;
      }

      setAccounts(normalizedAccounts);
    } catch (err: any) {
      clearTimeout(timerId);
      const message =
        err?.name === 'AbortError' ? 'Request timeout (>12s)' : (err?.message ?? String(err));
      console.error('LoginTestPanel fetch error:', message);
      setAccounts([]);
      setError(`Cannot load accounts: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSearchAccounts = async (query: string, signal?: AbortSignal) => {
    setSearchState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const params = new URLSearchParams({
        q: query,
        limit: String(SEARCH_LIMIT),
      });
      const response = await fetch(`/api/auth/demo-accounts?${params.toString()}`, { signal });

      let payload: DemoAccountsPayload = {};
      try {
        payload = await response.json();
      } catch {
        setSearchState({
          isLoading: false,
          error: `Search API response is invalid JSON (HTTP ${response.status})`,
          hasMore: false,
          results: [],
        });
        return;
      }

      if (!response.ok) {
        setSearchState({
          isLoading: false,
          error: `Search API returned HTTP ${response.status}`,
          hasMore: false,
          results: [],
        });
        return;
      }

      setSearchState({
        isLoading: false,
        error: null,
        hasMore: Boolean(payload.search?.hasMore),
        results: normalizeAccounts(payload),
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }

      setSearchState({
        isLoading: false,
        error: `Cannot search accounts: ${err?.message ?? String(err)}`,
        hasMore: false,
        results: [],
      });
    }
  };

  const refreshAll = async () => {
    await fetchTestAccounts();

    if (debouncedSearch.length >= SEARCH_MIN_LENGTH) {
      await fetchSearchAccounts(debouncedSearch);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    if (!text || !navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      setCopiedField(null);
    }
  };

  const handleQuickLogin = (account: TestAccount) => {
    if (!account.password) {
      return;
    }

    onSelectAccount?.(account.email, account.password);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 z-50 flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--quick-login-panel-border)] bg-[var(--quick-login-fab-bg)] px-4 py-3 font-semibold text-[var(--quick-login-fab-text)] shadow-lg transition-colors duration-200 hover:bg-[var(--quick-login-fab-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quick-login-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        aria-label="Open quick login account list"
      >
        <span>Quick Login</span>
        <ChevronUp className="h-4 w-4" />
      </button>
    );
  }

  const searchQueryLength = searchQuery.trim().length;
  const isSearching = searchQueryLength >= SEARCH_MIN_LENGTH;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex max-h-[82vh] min-h-0 w-[25rem] flex-col overflow-hidden rounded-2xl border bg-[var(--quick-login-panel-bg)] text-[var(--quick-login-text-primary)] transition-colors duration-200"
      style={{
        borderColor: 'var(--quick-login-panel-border)',
        boxShadow: 'var(--quick-login-panel-shadow)',
        backgroundImage: 'var(--quick-login-panel-grid)',
      }}
    >
      <div
        className="space-y-3 p-4 text-[var(--quick-login-header-text)] transition-colors duration-200"
        style={{
          backgroundImage:
            'linear-gradient(135deg,var(--quick-login-header-bg-start),var(--quick-login-header-bg-end))',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold sm:text-lg">Quick Login Account List</h3>
            <p className="mt-1 text-xs text-[var(--quick-login-header-text)]">
              {isLoading
                ? 'Loading accounts...'
                : `${accounts.length} demo accounts ready for one-click sign-in`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshAll}
              disabled={isLoading || searchState.isLoading}
              className={ICON_BUTTON_CLASS}
              title="Refresh accounts"
              aria-label="Refresh accounts"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading || searchState.isLoading ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className={ICON_BUTTON_CLASS}
              aria-label="Collapse quick login account list"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--quick-login-search-border)] bg-[var(--quick-login-search-shell)] p-2">
          <label
            htmlFor="quick-login-user-search"
            className="mb-1 block text-[11px] font-medium tracking-wide text-[var(--quick-login-search-shell-text)]"
          >
            Search user name across system
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--quick-login-search-icon)]" />
            <input
              id="quick-login-user-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Type name/email (min 2 chars)"
              autoComplete="off"
              className={SEARCH_INPUT_CLASS}
            />
          </div>
          <p className="mt-1 text-[11px] text-[var(--quick-login-search-shell-text)]">
            Click any result card to autofill and sign in immediately.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--quick-login-panel-surface)] p-3 transition-colors duration-200">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--quick-login-text-muted)]">
            <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-[var(--quick-login-fab-bg)]" />
            <p className="text-sm">Loading demo accounts from database...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-3 rounded-lg border border-[var(--quick-login-warning-border)] bg-[var(--quick-login-warning-bg)] px-3 py-2 text-xs text-[var(--quick-login-warning-text)] transition-colors duration-200">
                <p className="break-words">Warning: {error}</p>
                <button
                  onClick={refreshAll}
                  className="mt-2 cursor-pointer rounded px-1 py-0.5 font-semibold underline decoration-2 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quick-login-focus-ring)]"
                >
                  Retry
                </button>
              </div>
            )}

            {isSearching && (
              <section className="mb-3 rounded-lg border border-[var(--quick-login-search-result-border)] bg-[var(--quick-login-search-result-bg)] p-3 transition-colors duration-200">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--quick-login-search-result-title)]">
                    Search Results
                  </h4>
                  <span className="rounded-full border border-[var(--quick-login-search-result-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--quick-login-search-result-title)]">
                    {searchState.results.length} matches
                  </span>
                </div>

                {searchState.isLoading ? (
                  <div className="rounded-md border border-[var(--quick-login-search-empty-border)] bg-[var(--quick-login-search-empty-bg)] p-3 text-xs text-[var(--quick-login-search-empty-text)]">
                    Searching users...
                  </div>
                ) : searchState.error ? (
                  <div className="rounded-md border border-[var(--quick-login-search-empty-border)] bg-[var(--quick-login-search-empty-bg)] p-3 text-xs text-[var(--quick-login-search-empty-text)]">
                    {searchState.error}
                  </div>
                ) : searchState.results.length > 0 ? (
                  <div className="space-y-2">
                    {searchState.results.map((account) => (
                      <AccountCard
                        key={`search-${account.role}-${account.email}`}
                        account={account}
                        onCopy={copyToClipboard}
                        copiedField={copiedField}
                        onQuickLogin={handleQuickLogin}
                      />
                    ))}
                    {searchState.hasMore && (
                      <p className="rounded-md border border-[var(--quick-login-search-empty-border)] bg-[var(--quick-login-search-empty-bg)] px-3 py-2 text-xs text-[var(--quick-login-search-empty-text)]">
                        Showing first {SEARCH_LIMIT} matches. Refine keyword for faster pick.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border border-[var(--quick-login-search-empty-border)] bg-[var(--quick-login-search-empty-bg)] p-3 text-xs text-[var(--quick-login-search-empty-text)]">
                    No active account matches "{searchQuery.trim()}".
                  </div>
                )}
              </section>
            )}

            {searchQueryLength > 0 && searchQueryLength < SEARCH_MIN_LENGTH && (
              <section className="mb-3 rounded-lg border border-[var(--quick-login-search-empty-border)] bg-[var(--quick-login-search-empty-bg)] px-3 py-2 text-xs text-[var(--quick-login-search-empty-text)] transition-colors duration-200">
                Enter at least {SEARCH_MIN_LENGTH} characters to start searching.
              </section>
            )}

            <RoleSection
              icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />}
              title="Administrator"
              titleClassName="text-[var(--quick-login-role-admin-title)]"
              sectionClassName="border-[var(--quick-login-role-admin-border)] bg-[var(--quick-login-role-admin-bg)]"
              accounts={groupedAccounts.admin}
              copiedField={copiedField}
              onCopy={copyToClipboard}
              onQuickLogin={handleQuickLogin}
            />

            <RoleSection
              icon={<GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />}
              title={`Teachers (${groupedAccounts.teacher.length})`}
              titleClassName="text-[var(--quick-login-role-teacher-title)]"
              sectionClassName="border-[var(--quick-login-role-teacher-border)] bg-[var(--quick-login-role-teacher-bg)]"
              accounts={groupedAccounts.teacher}
              copiedField={copiedField}
              onCopy={copyToClipboard}
              onQuickLogin={handleQuickLogin}
            />

            <RoleSection
              icon={<UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
              title={`Students (${groupedAccounts.student.length})`}
              titleClassName="text-[var(--quick-login-role-student-title)]"
              sectionClassName="border-[var(--quick-login-role-student-border)] bg-[var(--quick-login-role-student-bg)]"
              accounts={groupedAccounts.student}
              copiedField={copiedField}
              onCopy={copyToClipboard}
              onQuickLogin={handleQuickLogin}
            />
          </>
        )}
      </div>

      <div className="border-t border-[var(--quick-login-panel-border)] bg-[var(--quick-login-panel-bg)] px-3 py-2 text-center text-xs text-[var(--quick-login-text-muted)] transition-colors duration-200">
        <strong className="text-[var(--quick-login-text-secondary)]">Tip:</strong> Only accounts
        with demo passwords can use quick login.
      </div>
    </div>
  );
}

interface RoleSectionProps {
  icon: ReactNode;
  title: string;
  titleClassName: string;
  sectionClassName: string;
  accounts: TestAccount[];
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
  onQuickLogin: (account: TestAccount) => void;
}

function RoleSection({
  icon,
  title,
  titleClassName,
  sectionClassName,
  accounts,
  copiedField,
  onCopy,
  onQuickLogin,
}: RoleSectionProps) {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <section
      className={`mb-3 rounded-lg border p-3 transition-colors duration-200 last:mb-0 ${sectionClassName}`}
    >
      <h4
        className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${titleClassName}`}
      >
        {icon}
        <span>{title}</span>
      </h4>
      {accounts.map((account, idx) => (
        <AccountCard
          key={`${account.role}-${account.email}-${idx}`}
          account={account}
          onCopy={onCopy}
          copiedField={copiedField}
          onQuickLogin={onQuickLogin}
        />
      ))}
    </section>
  );
}

interface AccountCardProps {
  account: TestAccount;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
  onQuickLogin: (account: TestAccount) => void;
}

function AccountCard({ account, onCopy, copiedField, onQuickLogin }: AccountCardProps) {
  const roleCardClass = {
    admin:
      'border-[var(--quick-login-role-admin-border)] hover:bg-[var(--quick-login-role-admin-hover)]',
    teacher:
      'border-[var(--quick-login-role-teacher-border)] hover:bg-[var(--quick-login-role-teacher-hover)]',
    student:
      'border-[var(--quick-login-role-student-border)] hover:bg-[var(--quick-login-role-student-hover)]',
  };

  const roleBadgeClass = {
    admin: 'bg-[var(--quick-login-role-admin-bg)] text-[var(--quick-login-role-admin-title)]',
    teacher: 'bg-[var(--quick-login-role-teacher-bg)] text-[var(--quick-login-role-teacher-title)]',
    student: 'bg-[var(--quick-login-role-student-bg)] text-[var(--quick-login-role-student-title)]',
  };

  const roleName: Record<string, string> = {
    admin: 'Admin',
    teacher: 'Teacher',
    student: 'Student',
  };

  const roleClass = roleCardClass[account.role as SupportedRole] ?? '';
  const badgeClass =
    roleBadgeClass[account.role as SupportedRole] ??
    'bg-[var(--quick-login-copy-bg)] text-[var(--quick-login-copy-text)]';

  return (
    <div
      role="button"
      tabIndex={0}
      className={`mb-2 cursor-pointer rounded-lg border bg-[var(--quick-login-card-bg)] p-3 transition-colors duration-200 hover:border-[var(--quick-login-card-border-hover)] hover:bg-[var(--quick-login-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quick-login-focus-ring)] last:mb-0 ${roleClass}`}
      onClick={() => {
        if (account.password) {
          onQuickLogin(account);
        }
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && account.password) {
          event.preventDefault();
          onQuickLogin(account);
        }
      }}
      aria-label={`Quick login ${account.name}`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--quick-login-text-primary)]">
            {account.name}
          </p>
          <p className="truncate text-xs text-[var(--quick-login-text-secondary)]">
            {account.email}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
        >
          {roleName[account.role] ?? account.role}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onCopy(account.email, `email-${account.email}`);
          }}
          className={COPY_BUTTON_CLASS}
          aria-label={`Copy email ${account.email}`}
        >
          {copiedField === `email-${account.email}` ? (
            <>
              <Check className="h-3 w-3 text-[var(--quick-login-success)]" />
              <span className="text-[var(--quick-login-success)]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Email</span>
            </>
          )}
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onCopy(account.password || '', `pass-${account.email}`);
          }}
          className={COPY_BUTTON_CLASS}
          aria-label={`Copy password ${account.email}`}
        >
          {copiedField === `pass-${account.email}` ? (
            <>
              <Check className="h-3 w-3 text-[var(--quick-login-success)]" />
              <span className="text-[var(--quick-login-success)]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Pass</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
