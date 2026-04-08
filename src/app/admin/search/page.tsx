'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  Search,
  Filter,
  X,
  Users,
  Calendar,
  Trophy,
  BookOpen,
  Save,
  Trash2,
  Star,
} from 'lucide-react';
import { ROLE_OPTIONS, getRoleBadgeClass, getRoleLabel } from '../users/roles';

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  tab: string;
  filters: Record<string, string>;
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
    major: string;
    year: number;
    teacher_name: string;
    member_count: number;
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

export default function AdvancedSearchPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');

  const [filters, setFilters] = useState({
    status: '',
    date_from: '',
    date_to: '',
    role: '',
    activity_type: '',
  });

  const debouncedQuery = useDebounce(query, 500);

  // Load saved searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-saved-searches');
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved searches:', e);
      }
    }
  }, []);

  const saveCurrentSearch = () => {
    if (!searchName.trim()) {
      toast.error('Vui lòng nhập tên tìm kiếm');
      return;
    }

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName.trim(),
      query: query.trim(),
      tab: activeTab,
      filters: { ...filters },
      savedAt: new Date().toISOString(),
    };

    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('admin-saved-searches', JSON.stringify(updated));
    setShowSaveDialog(false);
    setSearchName('');
    toast.success(`Đã lưu tìm kiếm "${newSearch.name}"`);
  };

  const loadSavedSearch = (saved: SavedSearch) => {
    setQuery(saved.query);
    setActiveTab(saved.tab);
    setFilters({
      status: saved.filters.status || '',
      date_from: saved.filters.date_from || '',
      date_to: saved.filters.date_to || '',
      role: saved.filters.role || '',
      activity_type: saved.filters.activity_type || '',
    });
    toast.success(`Đã tải tìm kiếm "${saved.name}"`);
  };

  const deleteSavedSearch = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('admin-saved-searches', JSON.stringify(updated));
    toast.success('Đã xóa tìm kiếm đã lưu');
  };

  const handleSearch = async () => {
    const searchTerm = debouncedQuery.trim() || query.trim();
    if (!searchTerm) {
      toast.error('Vui lòng nhập từ khóa tìm kiếm');
      return;
    }

    try {
      setSearching(true);
      const params = new URLSearchParams({
        q: searchTerm,
        type: activeTab,
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.role) params.append('role', filters.role);
      if (filters.activity_type) params.append('activity_type', filters.activity_type);

      const res = await fetch(`/api/admin/search?${params}`);
      const data = await res.json();
      if (res.ok) {
        setResults(data);
      } else {
        toast.error(data.error || 'Tìm kiếm thất bại');
      }
    } catch (e) {
      console.error('Search error:', e);
      toast.error('Lỗi khi tìm kiếm');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (debouncedQuery.trim()) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, activeTab, filters]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      date_from: '',
      date_to: '',
      role: '',
      activity_type: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Search className="w-8 h-8 text-blue-600" />
          Tìm Kiếm Nâng Cao
        </h1>
        <p className="text-gray-600">Tìm kiếm người dùng, hoạt động, lớp học và khen thưởng</p>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập từ khóa tìm kiếm..."
            className="flex-1 p-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            {searching ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
              showFilters
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-5 h-5" />
            Bộ Lọc
            {hasActiveFilters && (
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                {Object.values(filters).filter((v) => v).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!query.trim()}
            className="px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Lưu
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeTab === 'activities' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Trạng thái</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="">-- Tất cả --</option>
                    <option value="draft">Nháp</option>
                    <option value="pending">Chờ phê duyệt</option>
                    <option value="approved">Phê duyệt</option>
                    <option value="ongoing">Đang diễn ra</option>
                    <option value="completed">Hoàn thành</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Từ ngày</label>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </>
            )}

            {activeTab === 'users' && (
              <div>
                <label className="block text-sm font-medium mb-2">Vai trò</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">-- Tất cả --</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded font-medium flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b overflow-x-auto">
          {[
            { id: 'all', label: 'Tất cả', icon: '🔍' },
            { id: 'users', label: 'Users', icon: '👥' },
            { id: 'activities', label: 'Hoạt động', icon: '🎯' },
            { id: 'classes', label: 'Lớp học', icon: '🏫' },
            { id: 'awards', label: 'Khen thưởng', icon: '🏆' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium flex items-center gap-2 whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-sm border border-purple-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">
              Tìm kiếm đã lưu ({savedSearches.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedSearches.map((saved) => (
              <div
                key={saved.id}
                className="bg-white rounded-lg p-4 border border-purple-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{saved.name}</h3>
                    <p className="text-sm text-gray-600 truncate">&quot;{saved.query}&quot;</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {saved.tab === 'all' ? 'Tất cả' : saved.tab}
                      </span>
                      {Object.keys(saved.filters).filter((k) => saved.filters[k]).length > 0 && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {Object.keys(saved.filters).filter((k) => saved.filters[k]).length} bộ lọc
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSavedSearch(saved.id)}
                    className="text-gray-400 hover:text-red-600 transition ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => loadSavedSearch(saved)}
                  className="w-full mt-3 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium text-sm transition"
                >
                  Tải tìm kiếm
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Lưu Tìm Kiếm</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tên tìm kiếm</label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Ví dụ: Hoạt động tháng 12"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && saveCurrentSearch()}
              />
            </div>
            <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
              <div className="text-gray-700 font-medium mb-1">Sẽ lưu:</div>
              <div className="text-gray-600">• Từ khóa: &quot;{query}&quot;</div>
              <div className="text-gray-600">
                • Tab: {activeTab === 'all' ? 'Tất cả' : activeTab}
              </div>
              {hasActiveFilters && (
                <div className="text-gray-600">
                  • {Object.values(filters).filter((v) => v).length} bộ lọc
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Hủy
              </button>
              <button
                onClick={saveCurrentSearch}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-blue-900 font-medium">
              ✓ Tìm thấy <strong>{results.total}</strong> kết quả cho &quot;{results.query}&quot;
            </p>
          </div>

          {results.total === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-lg text-gray-600 font-medium">😔 Không tìm thấy kết quả</p>
              <p className="text-sm text-gray-500 mt-2">
                Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc
              </p>
            </div>
          ) : (
            <>
              {/* Users Results */}
              {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    Users ({results.users.length})
                  </h2>
                  <div className="space-y-2">
                    {results.users.map((user) => (
                      <div
                        key={user.id}
                        className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 transition"
                      >
                        <div>
                          <div className="font-medium text-gray-800">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(
                            user.role
                          )}`}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities Results */}
              {(activeTab === 'all' || activeTab === 'activities') &&
                results.activities.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-purple-600" />
                      Hoạt động ({results.activities.length})
                    </h2>
                    <div className="space-y-3">
                      {results.activities.map((activity) => (
                        <Link
                          key={activity.id}
                          href={`/admin/activities/${activity.id}`}
                          className="block p-4 border rounded-lg hover:bg-blue-50 transition"
                        >
                          <div className="font-bold text-lg text-gray-800 mb-2">
                            {activity.title}
                          </div>
                          <div className="text-sm text-gray-600 mb-2 space-y-1">
                            <div>📍 {activity.location}</div>
                            <div>📅 {new Date(activity.date).toLocaleDateString('vi-VN')}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                              {activity.activity_type}
                            </span>
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                              {activity.org_level}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                activity.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : activity.status === 'ongoing'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {activity.status}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

              {/* Classes Results */}
              {(activeTab === 'all' || activeTab === 'classes') && results.classes.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-green-600" />
                    Lớp học ({results.classes.length})
                  </h2>
                  <div className="space-y-2">
                    {results.classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex justify-between items-center p-3 border rounded-lg hover:bg-green-50 transition"
                      >
                        <div>
                          <div className="font-medium text-gray-800">{cls.name}</div>
                          <div className="text-sm text-gray-600">
                            {cls.major} • Năm {cls.year} • GV: {cls.teacher_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-green-600">{cls.member_count}</div>
                          <div className="text-xs text-gray-500">học viên</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Awards Results */}
              {(activeTab === 'all' || activeTab === 'awards') && results.awards.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                    Khen thưởng ({results.awards.length})
                  </h2>
                  <div className="space-y-3">
                    {results.awards.map((award) => (
                      <div
                        key={award.id}
                        className="p-4 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition"
                      >
                        <div className="font-bold text-gray-800 mb-2">🏆 {award.type}</div>
                        <div className="text-sm text-gray-600 mb-2">{award.reason}</div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            Người nhận: {award.recipient_name} ({award.recipient_email})
                          </span>
                          <span>
                            Trao bởi: {award.awarded_by_name} •{' '}
                            {new Date(award.awarded_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
