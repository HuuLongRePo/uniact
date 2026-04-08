'use client';

import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

type ImportResult = {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ row: number; email: string; error: string; severity?: string }>;
  created_users: Array<{ id?: number; email: string; name: string; role: string; status?: string }>;
  dry_run: boolean;
  message: string;
};

type ParsedUserRow = {
  email: string;
  name: string;
  role: 'student';
  class_id?: number | null;
  student_code?: string | null;
  username?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  password?: string | null;
};

function normalizeKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '');
}

function pick(row: Record<string, any>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export default function StudentImportDialog({
  isOpen,
  onClose,
  onImported,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parsedUsers = useMemo(() => {
    if (!csvText.trim()) return [] as ParsedUserRow[];

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeKey,
    });

    const rows = (parsed.data || []) as Array<Record<string, any>>;

    const users: ParsedUserRow[] = [];
    for (const rawRow of rows) {
      const row: Record<string, any> = {};
      for (const [k, v] of Object.entries(rawRow)) row[normalizeKey(k)] = v;

      const email = pick(row, ['email']);
      const name = pick(row, ['name', 'full_name', 'fullname']);

      const classIdRaw = pick(row, ['class_id', 'classid', 'class']);
      const classId = classIdRaw ? parseInt(classIdRaw, 10) : null;

      const studentCode = pick(row, ['student_code', 'student_id', 'studentid', 'code']);
      const username = pick(row, ['username']);
      const phone = pick(row, ['phone', 'phone_number']);
      const gender = pick(row, ['gender']);
      const dateOfBirth = pick(row, ['date_of_birth', 'dob', 'birthday']);
      const password = pick(row, ['password']);

      if (!email) continue;

      users.push({
        email,
        name,
        role: 'student',
        class_id: Number.isFinite(classId as any) ? classId : null,
        student_code: studentCode || null,
        username: username || null,
        phone: phone || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        password: password || null,
      });
    }

    return users;
  }, [csvText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(String(event.target?.result || ''));
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async (dryRun: boolean) => {
    if (parsedUsers.length === 0) {
      toast.error('Không có dòng hợp lệ để import (cần ít nhất cột email)');
      return;
    }

    // quick client validation
    const invalid = parsedUsers.find((u) => !u.email || !u.name);
    if (invalid) {
      toast.error('Thiếu dữ liệu: cần email và name/full_name');
      return;
    }

    try {
      setImporting(true);
      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: parsedUsers, dry_run: dryRun }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || 'Import thất bại');
        return;
      }
      setResult(data);
      if (!dryRun && data?.success > 0) {
        toast.success(data.message || 'Import thành công');
        onImported();
      }
    } catch (e) {
      console.error('Student import error:', e);
      toast.error('Lỗi khi import');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">📥 Nhập Học Viên Từ File (CSV)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm mb-4">
          <div className="font-medium mb-2">Format CSV (header):</div>
          <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
            email,name,class_id,student_code,username,phone,gender,date_of_birth,password
            student1@hust.edu.vn,Nguyen Van
            A,1,20201234,sv20201234,0123456789,nam,2002-01-15,20201234
          </pre>
          <div className="mt-2">
            Bắt buộc: <code>email</code>, <code>name</code> (hoặc <code>full_name</code>). Khuyến
            nghị có <code>class_id</code>.
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Chọn file CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Hoặc paste CSV text</label>
            <textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setResult(null);
              }}
              className="w-full p-3 border rounded font-mono text-sm h-40"
              placeholder="email,name,class_id,student_code\nstudent@hust.edu.vn,Nguyen Van A,1,20201234"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleImport(true)}
              disabled={!csvText.trim() || importing}
              className="flex-1 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              🔍 Validate (Dry Run)
            </button>
            <button
              onClick={() => handleImport(false)}
              disabled={!csvText.trim() || importing}
              className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {importing ? '⏳ Đang import...' : '✓ Import Students'}
            </button>
          </div>

          <div className="text-sm text-gray-600">
            Đã parse: <strong>{parsedUsers.length}</strong> dòng (có email).
          </div>

          {result && (
            <div className="mt-4 border rounded-lg p-4">
              <div className="font-medium mb-2">
                {result.dry_run ? '🔍 Kết quả Validate' : '✅ Kết quả Import'}
              </div>
              <div className="grid grid-cols-4 gap-3 text-center mb-3">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-xl font-bold text-blue-600">{result.total}</div>
                  <div className="text-xs text-blue-800">Total</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-xl font-bold text-green-600">{result.success}</div>
                  <div className="text-xs text-green-800">
                    {result.dry_run ? 'Valid' : 'Created'}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <div className="text-xl font-bold text-red-600">{result.failed}</div>
                  <div className="text-xs text-red-800">Failed</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <div className="text-xl font-bold text-yellow-600">{result.skipped}</div>
                  <div className="text-xs text-yellow-800">Skipped</div>
                </div>
              </div>

              <div className="text-sm bg-gray-50 rounded p-2 mb-3">{result.message}</div>

              {result.errors?.length > 0 && (
                <div>
                  <div className="font-medium mb-2">Chi tiết lỗi/cảnh báo (tối đa 50 dòng):</div>
                  <div className="max-h-60 overflow-y-auto space-y-1 text-sm">
                    {result.errors.slice(0, 50).map((err, idx) => (
                      <div
                        key={idx}
                        className={
                          'p-2 rounded ' +
                          (err.severity === 'warning'
                            ? 'bg-yellow-50 text-yellow-800'
                            : 'bg-red-50 text-red-800')
                        }
                      >
                        <strong>Row {err.row}</strong> ({err.email || '-'}) — {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
