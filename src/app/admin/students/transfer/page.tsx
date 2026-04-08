'use client';

import React, { useState } from 'react';
import { Users, ArrowRight, CheckSquare, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/components/ConfirmationModal';

interface Student {
  id: number;
  name: string;
  email: string;
  className: string;
  classId: number;
}

interface Class {
  id: number;
  name: string;
}

export default function TransferStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [targetClassId, setTargetClassId] = useState<number | null>(null);
  const [sourceClassId, setSourceClassId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  React.useEffect(() => {
    fetchClasses();
  }, []);

  React.useEffect(() => {
    if (sourceClassId) {
      fetchStudents(sourceClassId);
    }
  }, [sourceClassId]);

  async function fetchClasses() {
    try {
      const res = await fetch('/api/admin/classes');
      const data = await res.json();
      if (res.ok) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Fetch classes error:', error);
    }
  }

  async function fetchStudents(classId: number) {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/classes/${classId}`);
      const data = await res.json();
      if (res.ok) {
        const studentsList = data.students || [];
        const enriched = studentsList.map((s: Student) => ({
          ...s,
          className: classes.find((c) => c.id === classId)?.name || '',
        }));
        setStudents(enriched);
      }
    } catch (error) {
      console.error('Fetch students error:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleStudent(id: number) {
    const newSet = new Set(selectedStudents);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedStudents(newSet);
  }

  function toggleAll() {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map((s) => s.id)));
    }
  }

  async function handleTransfer() {
    if (!targetClassId || selectedStudents.size === 0) {
      toast.error('Vui lòng chọn sinh viên và lớp đích');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/students/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          targetClassId,
        }),
      });

      if (res.ok) {
        toast.success(`Đã chuyển ${selectedStudents.size} sinh viên thành công!`);
        setSelectedStudents(new Set());
        setShowConfirmDialog(false);
        if (sourceClassId) {
          fetchStudents(sourceClassId);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Chuyển lớp thất bại');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('Chuyển lớp thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Transfer Students</h1>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        </div>

        {/* Source Class Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">1. Select Source Class</h2>
          <select
            value={sourceClassId || ''}
            onChange={(e) => {
              const id = parseInt(e.target.value);
              setSourceClassId(id || null);
              setSelectedStudents(new Set());
            }}
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="">-- Select Source Class --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Students List */}
        {sourceClassId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">2. Select Students to Transfer</h2>
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                <CheckSquare className="w-4 h-4" />
                {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {loading ? (
              <p className="text-gray-500">Loading students...</p>
            ) : students.length === 0 ? (
              <p className="text-gray-500">No students in this class</p>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selectedStudents.size > 0 && (
              <p className="mt-4 text-sm text-blue-600">
                {selectedStudents.size} student{selectedStudents.size > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* Target Class Selection */}
        {selectedStudents.size > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRight className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-800">3. Chọn lớp đích</h2>
            </div>
            <select
              value={targetClassId || ''}
              onChange={(e) => setTargetClassId(parseInt(e.target.value) || null)}
              className="w-full border-2 border-green-300 rounded-lg px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
            >
              <option value="">-- Chọn lớp muốn chuyển đến --</option>
              {classes
                .filter((c) => c.id !== sourceClassId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            {/* Transfer Preview */}
            {targetClassId && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Xem trước chuyển lớp:</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {classes.find((c) => c.id === sourceClassId)?.name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    {classes.find((c) => c.id === targetClassId)?.name}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  <Users className="w-3 h-3 inline mr-1" />
                  {selectedStudents.size} sinh viên sẽ được chuyển
                </p>
              </div>
            )}
          </div>
        )}

        {/* Transfer Button */}
        {selectedStudents.size > 0 && targetClassId && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-lg hover:from-blue-700 hover:to-green-700 disabled:opacity-50 font-medium shadow-lg transition-all"
            >
              <ArrowRight className="w-5 h-5" />
              Chuyển {selectedStudents.size} sinh viên sang{' '}
              {classes.find((c) => c.id === targetClassId)?.name}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleTransfer}
        title="Xác nhận chuyển lớp"
        message="Bạn có chắc chắn muốn thực hiện thao tác chuyển lớp này?"
        icon={<AlertTriangle className="w-12 h-12 text-yellow-500" />}
        confirmText="Xác nhận chuyển"
        cancelText="Hủy"
        confirmButtonClass="bg-blue-600 hover:bg-blue-700"
        details={
          targetClassId && sourceClassId ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Thông tin chuyển lớp:</p>
                <div className="flex items-center gap-2 text-sm bg-gray-50 p-3 rounded-lg">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {classes.find((c) => c.id === sourceClassId)?.name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    {classes.find((c) => c.id === targetClassId)?.name}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <Users className="w-4 h-4 inline mr-1" />
                Số sinh viên: <strong>{selectedStudents.size}</strong>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ Thao tác này sẽ thay đổi lớp của các sinh viên đã chọn. Hãy đảm bảo bạn đã kiểm
                  tra kỹ trước khi xác nhận.
                </p>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
