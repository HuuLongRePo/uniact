'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getRoleBadgeClass, getRoleLabel } from '../roles';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
    severity?: string;
  }>;
  created_users: Array<{
    id?: number;
    email: string;
    name: string;
    role: string;
    status?: string;
  }>;
  dry_run: boolean;
  message: string;
}

export default function UserImportPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const csvTemplate = `email,name,role,password
student1@example.com,Nguyen Van A,student,password123
teacher1@example.com,Tran Thi B,teacher,pass456
admin@example.com,Nguyen Van C,admin,admin123`;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(csvTemplate);
    toast.success('Đã sao chép mẫu CSV!');
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'users-import-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải xuống file mẫu!');
  };

  const handleParseCsv = () => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      toast.error('CSV phải có ít nhất 2 dòng (header + 1 user)');
      return [];
    }

    const users: any[] = [];
    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim());

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const user: any = {};

      headers.forEach((header, idx) => {
        const value = values[idx]?.trim();
        if (header === 'email') user.email = value;
        else if (header === 'name' || header === 'full_name') user.name = value;
        else if (header === 'role') user.role = value;
        else if (header === 'password') user.password = value;
      });

      // Validate all required fields are not empty
      if (!user.email || !user.name || !user.role || !user.password) {
        toast.error(`Dòng ${i + 1}: Thiếu thông tin bắt buộc (email, name, role, password)`);
        continue;
      }

      users.push(user);
    }

    return users;
  };

  const handleImport = async (dryRun: boolean = false) => {
    const users = handleParseCsv();
    if (users.length === 0) {
      toast.error('Không có user hợp lệ để import');
      return;
    }

    try {
      setImporting(true);
      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users, dry_run: dryRun }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        toast.error(data.error || 'Import thất bại');
      }
    } catch (e) {
      console.error('Import error:', e);
      toast.error('Lỗi khi import');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
      <button
        onClick={() => router.back()}
        className="mb-4 text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Quay lại
      </button>

      <h1 className="text-2xl sm:text-3xl font-bold mb-6">📤 Import Users (CSV/Excel)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4">Hướng dẫn</h2>
          <div className="space-y-3 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <p className="font-medium">Format CSV:</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                    title="Tải file mẫu"
                  >
                    📥 Tải mẫu
                  </button>
                  <button
                    onClick={handleCopyTemplate}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                    title="Sao chép mẫu"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
              <pre className="bg-white p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                {csvTemplate}
              </pre>
            </div>

            <div className="space-y-2">
              <p>
                <strong>Tất cả các trường bắt buộc (không được để trống):</strong>
              </p>
              <ul className="list-disc list-inside pl-2">
                <li>
                  <code>email</code> - Email hợp lệ (unique)
                </li>
                <li>
                  <code>name</code> - Họ tên đầy đủ
                </li>
                <li>
                  <code>role</code> - student, teacher, hoặc admin
                </li>
                <li>
                  <code>password</code> - Mật khẩu (tối thiểu 6 ký tự)
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p>
                <strong>Tự động sinh bởi hệ thống:</strong>
              </p>
              <ul className="list-disc list-inside pl-2">
                <li>
                  <code>id</code> - ID người dùng
                </li>
                <li>
                  <code>code</code> - Mã định danh tự động
                </li>
                <li>
                  <code>created_at</code> - Ngày tạo
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p>
                <strong>Columns tùy chọn:</strong>
              </p>
              <ul className="list-disc list-inside pl-2">
                <li>
                  <code>password</code> - Mật khẩu (mặc định: password123)
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-3 rounded">
              <p className="text-yellow-800">
                <strong>Lưu ý:</strong>
              </p>
              <ul className="list-disc list-inside text-yellow-700 text-xs mt-1">
                <li>Email trùng sẽ bị bỏ qua</li>
                <li>Chạy &quot;Validate&quot; trước khi import</li>
                <li>Có thể import từ Excel (Save as CSV)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4">Upload CSV</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Chọn file CSV</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full p-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hoặc paste CSV text</label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="email,name,role,password&#10;student1@example.com,Nguyen Van A,student,password123"
                className="w-full p-3 border rounded font-mono text-xs sm:text-sm h-40 sm:h-48"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleImport(true)}
                disabled={!csvText.trim() || importing}
                className="flex-1 py-2.5 sm:py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
              >
                🔍 Validate (Dry Run)
              </button>
              <button
                onClick={() => handleImport(false)}
                disabled={!csvText.trim() || importing}
                className="flex-1 py-2.5 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base"
              >
                {importing ? '⏳ Đang import...' : '✓ Import Users'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">
            {result.dry_run ? '🔍 Validation Results' : '✅ Import Results'}
          </h2>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded text-center">
              <div className="text-2xl font-bold text-blue-600">{result.total}</div>
              <div className="text-sm text-blue-800">Total</div>
            </div>
            <div className="bg-green-50 p-4 rounded text-center">
              <div className="text-2xl font-bold text-green-600">{result.success}</div>
              <div className="text-sm text-green-800">{result.dry_run ? 'Valid' : 'Success'}</div>
            </div>
            <div className="bg-red-50 p-4 rounded text-center">
              <div className="text-2xl font-bold text-red-600">{result.failed}</div>
              <div className="text-sm text-red-800">Failed</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded text-center">
              <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
              <div className="text-sm text-yellow-800">Skipped</div>
            </div>
          </div>

          <p className="mb-4 p-3 bg-blue-50 rounded font-medium">{result.message}</p>

          {result.errors.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold mb-2">⚠️ Errors & Warnings:</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {result.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-sm ${
                      err.severity === 'warning'
                        ? 'bg-yellow-50 text-yellow-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    Row {err.row}: {err.email} - {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.created_users.length > 0 && (
            <div>
              <h3 className="font-bold mb-2">
                {result.dry_run ? '✓ Valid Users:' : '✅ Created Users:'}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Role</th>
                      {!result.dry_run && <th className="p-2 text-left">ID</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {result.created_users.map((user, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{user.email}</td>
                        <td className="p-2">{user.name}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getRoleBadgeClass(user.role)}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        {!result.dry_run && <td className="p-2">{user.id}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.dry_run && result.success > 0 && (
            <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-500">
              <p className="text-green-800 font-medium">
                ✓ Validation passed! Click &quot;Import Users&quot; để tạo {result.success} users.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
