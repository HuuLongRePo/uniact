'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  Filter,
  Save,
  Search,
  Star,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { formatVietnamDateTime } from '@/lib/timezone';
import { ROLE_OPTIONS, getRoleBadgeClass, getRoleLabel } from '../users/roles';

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  tab: SearchTab;
  filters: SearchFilters;
  savedAt: string;
}

interface SearchResults {
  query: string;
  total: number;
  users: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
  }>;
  activities: Array<{
    id: number;
    title: string;
    location: string;
    date: string;
    status: string;
    activity_type: string;
    org_level: string;
    creator_name: string;
  }>;
  classes: Array<{
    id: number;
    name: string;
    major?: string;
    year?: number;
    teacher_name?: string;
    member_count?: number;
  }>;
  awards: Array<{
    id: number;
    type: string;
    reason: string;
    recipient_name: string;
    recipient_email: string;
    awarded_by_name: string;
    awarded_at: string;
  }>;
}

type SearchTab = 'all' | 'users' | 'activities' | 'classes' | 'awards';

type SearchFilters = {
  status: string;
  date_from: string;
  date_to: string;
  role: string;
};

const INITIAL_FILTERS: SearchFilters = {
  status: '',
  date_from: '',
  date_to: '',
  role: '',
};

const TABS: Array<{ id: SearchTab; label: string }> = [
  { id: 'all', label: 'Tat ca' },
  { id: 'users', label: 'Nguoi dung' },
  { id: 'activities', label: 'Hoat dong' },
  { id: 'classes', label: 'Lop hoc' },
  { id: 'awards', label: 'Khen thuong' },
];

export default function AdvancedSearchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);
  const [error, setError] = useState('');

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    const saved = localStorage.getItem('admin-saved-searches');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setSavedSearches(Array.isArray(parsed) ? parsed : []);
    } catch (storageError) {
      console.error('Load saved search error:', storageError);
    }
  }, [authLoading, router, user]);

  async function handleSearch(searchTerm?: string) {
    const nextQuery = (searchTerm ?? debouncedQuery ?? query).trim();
    if (!nextQuery) {
      setResults(null);
      setError('');
      return;
    }

    if (!user) return;

    try {
      setSearching(true);
      setError('');

      const params = new URLSearchParams({
        q: nextQuery,
        type: activeTab,
      });

      if (activeTab === 'users' && filters.role) params.set('role', filters.role);
      if (activeTab === 'activities') {
        if (filters.status) params.set('status', filters.status);
        if (filters.date_from) params.set('date_from', filters.date_from);
        if (filters.date_to) params.set('date_to', filters.date_to);
      }

      const response = await fetch(`/api/admin/search?${params.toString()}`, {
        headers: {
          'x-user-role': user.role,
        },
      });
      const payload = (await response.json().catch(() => null)) as SearchResults & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload?.error || 'Tim kiem that bai');
      }

      setResults(payload);
    } catch (searchError) {
      console.error('Admin search error:', searchError);
      const message = searchError instanceof Error ? searchError.message : 'Khong the tim kiem';
      setResults(null);
      setError(message);
      toast.error(message);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!user || !debouncedQuery.trim()) return;
    void handleSearch(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activeTab, filters, user?.id]);

  function clearFilters() {
    setFilters(INITIAL_FILTERS);
  }

  function saveCurrentSearch() {
    if (!searchName.trim()) {
      toast.error('Nhap ten de luu cau hinh tim kiem');
      return;
    }

    const nextItem: SavedSearch = {
      id: String(Date.now()),
      name: searchName.trim(),
      query: query.trim(),
      tab: activeTab,
      filters: { ...filters },
      savedAt: new Date().toISOString(),
    };

    const nextItems = [nextItem, ...savedSearches].slice(0, 12);
    setSavedSearches(nextItems);
    localStorage.setItem('admin-saved-searches', JSON.stringify(nextItems));
    setShowSaveDialog(false);
    setSearchName('');
    toast.success(`Da luu bo loc "${nextItem.name}"`);
  }

  function loadSavedSearch(saved: SavedSearch) {
    setQuery(saved.query);
    setActiveTab(saved.tab);
    setFilters(saved.filters);
    toast.success(`Da tai bo loc "${saved.name}"`);
  }

  function deleteSavedSearch(id: string) {
    const nextItems = savedSearches.filter((item) => item.id !== id);
    setSavedSearches(nextItems);
    localStorage.setItem('admin-saved-searches', JSON.stringify(nextItems));
    toast.success('Da xoa bo loc da luu');
  }

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(Boolean);
  }, [filters]);

  if (authLoading) {
    return <LoadingSpinner message="Dang tai tim kiem nang cao..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Search workspace
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="admin-search-heading"
              >
                Tim kiem nang cao
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Tim nguoi dung, hoat dong, lop hoc va khen thuong trong mot workspace duy nhat.
              </p>
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSearch(query);
                  }
                }}
                placeholder="Nhap tu khoa can tim..."
                className="w-full rounded-2xl border border-slate-300 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={() => void handleSearch(query)}
              disabled={!query.trim() || searching}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {searching ? 'Dang tim...' : 'Tim kiem'}
            </button>

            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                showFilters
                  ? 'bg-blue-100 text-blue-700'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Bo loc
            </button>

            <button
              type="button"
              onClick={() => setShowSaveDialog(true)}
              disabled={!query.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Luu bo loc
            </button>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {showFilters ? (
            <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {activeTab === 'users' ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Vai tro</span>
                    <select
                      value={filters.role}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, role: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Tat ca</option>
                      {ROLE_OPTIONS.map((roleOption) => (
                        <option key={roleOption.value} value={roleOption.value}>
                          {roleOption.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {activeTab === 'activities' ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Trang thai
                      </span>
                      <select
                        value={filters.status}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, status: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Tat ca</option>
                        <option value="draft">draft</option>
                        <option value="pending">pending</option>
                        <option value="approved">approved</option>
                        <option value="ongoing">ongoing</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Tu ngay</span>
                      <input
                        type="date"
                        value={filters.date_from}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            date_from: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Den ngay</span>
                      <input
                        type="date"
                        value={filters.date_to}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            date_to: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </>
                ) : null}
              </div>

              {hasActiveFilters ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    <X className="h-4 w-4" />
                    Xoa bo loc
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {savedSearches.length > 0 ? (
          <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
            <div className="flex items-center gap-2 text-slate-900">
              <Star className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-semibold">Bo loc da luu</h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {savedSearches.map((saved) => (
                <article
                  key={saved.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">{saved.name}</h3>
                      <p className="mt-1 truncate text-sm text-slate-600">&quot;{saved.query}&quot;</p>
                      <div className="mt-2 text-xs text-slate-500">
                        Luu luc {formatVietnamDateTime(saved.savedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSavedSearch(saved.id)}
                      className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-white hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadSavedSearch(saved)}
                      className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                    >
                      Tai bo loc
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {showSaveDialog ? (
          <div
            className="app-modal-backdrop p-4"
            onClick={() => setShowSaveDialog(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-search-save-filter-title"
              className="app-modal-panel app-modal-panel-scroll w-full max-w-md p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="admin-search-save-filter-title" className="text-xl font-semibold text-slate-900">
                Luu bo loc tim kiem
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Luu tu khoa, tab va bo loc hien tai de mo lai nhanh sau nay.
              </p>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Ten bo loc</span>
                <input
                  type="text"
                  value={searchName}
                  onChange={(event) => setSearchName(event.target.value)}
                  placeholder="Vi du: activity pending thang nay"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(false)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Huy
                </button>
                <button
                  type="button"
                  onClick={saveCurrentSearch}
                  className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Luu bo loc
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="text-sm font-semibold text-rose-700">Co loi khi tim kiem</div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        {results ? (
          <section className="space-y-6">
            <section className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
              <div className="text-sm text-slate-500">Ket qua hien tai</div>
              <div className="mt-2 text-xl font-semibold text-slate-900">
                {results.total} ket qua cho &quot;{results.query}&quot;
              </div>
            </section>

            {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 ? (
              <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
                <div className="flex items-center gap-2 text-slate-900">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Nguoi dung</h2>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {results.users.map((resultUser) => (
                    <article
                      key={resultUser.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {resultUser.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">{resultUser.email}</div>
                          <div className="mt-2 text-xs text-slate-500">
                            Tao luc {formatVietnamDateTime(resultUser.created_at)}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                            resultUser.role
                          )}`}
                        >
                          {getRoleLabel(resultUser.role)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {(activeTab === 'all' || activeTab === 'activities') &&
            results.activities.length > 0 ? (
              <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
                <div className="flex items-center gap-2 text-slate-900">
                  <Calendar className="h-5 w-5 text-violet-600" />
                  <h2 className="text-xl font-semibold">Hoat dong</h2>
                </div>
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {results.activities.map((activity) => (
                    <Link
                      key={activity.id}
                      href={`/admin/activities/${activity.id}`}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="text-sm font-semibold text-slate-900">{activity.title}</div>
                      <div className="mt-2 text-sm text-slate-600">{activity.location || 'Chua co dia diem'}</div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700">
                          {activity.activity_type || 'Khong ro loai'}
                        </span>
                        <span className="rounded-full bg-violet-100 px-3 py-1 font-semibold text-violet-700">
                          {activity.org_level || 'Khong ro cap'}
                        </span>
                        <span className="rounded-full bg-slate-200 px-3 py-1 font-semibold text-slate-700">
                          {activity.status}
                        </span>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        {formatVietnamDateTime(activity.date)} | Tao boi {activity.creator_name || 'Unknown'}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {(activeTab === 'all' || activeTab === 'classes') && results.classes.length > 0 ? (
              <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
                <div className="flex items-center gap-2 text-slate-900">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-semibold">Lop hoc</h2>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {results.classes.map((classItem) => (
                    <article
                      key={classItem.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="text-sm font-semibold text-slate-900">{classItem.name}</div>
                      <div className="mt-2 text-sm text-slate-600">
                        {classItem.major ? `${classItem.major}` : 'Chua co chuyen nganh'}
                        {classItem.year ? ` | Nam ${classItem.year}` : ''}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        GVCN: {classItem.teacher_name || 'Chua gan'} | Si so:{' '}
                        {classItem.member_count ?? 0}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {(activeTab === 'all' || activeTab === 'awards') && results.awards.length > 0 ? (
              <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
                <div className="flex items-center gap-2 text-slate-900">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  <h2 className="text-xl font-semibold">Khen thuong</h2>
                </div>
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {results.awards.map((award) => (
                    <article
                      key={award.id}
                      className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4"
                    >
                      <div className="text-sm font-semibold text-slate-900">{award.type}</div>
                      <div className="mt-2 text-sm text-slate-700">{award.reason}</div>
                      <div className="mt-3 text-xs text-slate-500">
                        Nguoi nhan: {award.recipient_name} ({award.recipient_email})
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Trao boi {award.awarded_by_name || 'Unknown'} |{' '}
                        {formatVietnamDateTime(award.awarded_at)}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {results.total === 0 ? (
              <section className="page-surface rounded-[1.75rem] border-dashed px-5 py-10 text-center sm:px-7">
                <div className="text-xl font-semibold text-slate-900">Khong tim thay ket qua</div>
                <p className="mt-2 text-sm text-slate-600">
                  Thu doi tu khoa hoac mo rong bo loc de thay them du lieu.
                </p>
              </section>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
