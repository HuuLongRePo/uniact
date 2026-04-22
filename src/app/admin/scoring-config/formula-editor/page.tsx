'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Calculator, Save, RotateCcw, Play, ArrowLeft, Info } from 'lucide-react';

interface FormulaVariable {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  description: string;
}

interface TestScenario {
  activityType: string;
  orgLevel: string;
  achievement: string;
  bonus: number;
  penalty: number;
}

interface FormulaVariableConfig {
  min: number;
  max: number;
  step: number;
  default: number;
}

export default function FormulaEditorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Formula variables
  const [variables, setVariables] = useState<FormulaVariable[]>([
    {
      id: 'base',
      name: 'Điểm cơ bản',
      value: 10,
      min: 0,
      max: 100,
      step: 1,
      description: 'Điểm cơ bản của hoạt động',
    },
    {
      id: 'type',
      name: 'Hệ số loại',
      value: 1.0,
      min: 0,
      max: 5,
      step: 0.1,
      description: 'Hệ số nhân theo loại hoạt động',
    },
    {
      id: 'level',
      name: 'Hệ số cấp độ',
      value: 2.0,
      min: 0,
      max: 5,
      step: 0.1,
      description: 'Hệ số nhân theo cấp độ tổ chức',
    },
    {
      id: 'achievement',
      name: 'Hệ số đánh giá',
      value: 1.5,
      min: 0,
      max: 3,
      step: 0.1,
      description: 'Hệ số theo mức đánh giá',
    },
    {
      id: 'bonus',
      name: 'Điểm thưởng',
      value: 0,
      min: 0,
      max: 100,
      step: 1,
      description: 'Điểm thưởng thêm',
    },
    {
      id: 'penalty',
      name: 'Điểm phạt',
      value: 0,
      min: 0,
      max: 100,
      step: 1,
      description: 'Điểm trừ (nếu có)',
    },
  ]);

  const [formulaText, setFormulaText] = useState(
    '(base × type × level × achievement) + bonus - penalty'
  );
  const [customFormula, setCustomFormula] = useState(false);
  const [saving, setSaving] = useState(false);

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  // Test scenarios
  const [testScenarios] = useState<TestScenario[]>([
    { activityType: 'Học thuật', orgLevel: 'Lớp', achievement: 'Xuất sắc', bonus: 0, penalty: 0 },
    { activityType: 'Thể thao', orgLevel: 'Trường', achievement: 'Tốt', bonus: 20, penalty: 0 },
    {
      activityType: 'Văn nghệ',
      orgLevel: 'Quốc gia',
      achievement: 'Tham gia',
      bonus: 0,
      penalty: 0,
    },
  ]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const calculateResult = (): number => {
    const { base, type, level, achievement, bonus, penalty } = variables.reduce(
      (acc, v) => {
        acc[v.id] = v.value;
        return acc;
      },
      {} as Record<string, number>
    );

    const subtotal = base * type * level * achievement;
    const total = subtotal + bonus - penalty;
    return Math.max(0, total);
  };

  const handleVariableChange = (id: string, value: number) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, value } : v)));
  };

  const handleReset = () => {
    setVariables([
      {
        id: 'base',
        name: 'Điểm cơ bản',
        value: 10,
        min: 0,
        max: 100,
        step: 1,
        description: 'Điểm cơ bản của hoạt động',
      },
      {
        id: 'type',
        name: 'Hệ số loại',
        value: 1.0,
        min: 0,
        max: 5,
        step: 0.1,
        description: 'Hệ số nhân theo loại hoạt động',
      },
      {
        id: 'level',
        name: 'Hệ số cấp độ',
        value: 2.0,
        min: 0,
        max: 5,
        step: 0.1,
        description: 'Hệ số nhân theo cấp độ tổ chức',
      },
      {
        id: 'achievement',
        name: 'Hệ số đánh giá',
        value: 1.5,
        min: 0,
        max: 3,
        step: 0.1,
        description: 'Hệ số theo mức đánh giá',
      },
      {
        id: 'bonus',
        name: 'Điểm thưởng',
        value: 0,
        min: 0,
        max: 100,
        step: 1,
        description: 'Điểm thưởng thêm',
      },
      {
        id: 'penalty',
        name: 'Điểm phạt',
        value: 0,
        min: 0,
        max: 100,
        step: 1,
        description: 'Điểm trừ (nếu có)',
      },
    ]);
    setFormulaText('(base × type × level × achievement) + bonus - penalty');
    setCustomFormula(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/scoring-config/formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formula: formulaText,
          variables: variables.reduce(
            (acc, v) => {
              acc[v.id] = { min: v.min, max: v.max, step: v.step, default: v.value };
              return acc;
            },
            {} as Record<string, FormulaVariableConfig>
          ),
        }),
      });

      if (!response.ok) throw new Error('Không thể lưu công thức');

      toast.success('Công thức đã được lưu!');
    } catch (error: unknown) {
      toast.error('Lỗi: ' + getErrorMessage(error, 'Không xác định'));
    } finally {
      setSaving(false);
    }
  };

  const getTestScenarioResult = (scenario: TestScenario): number => {
    // Simple mapping for demo
    const baseMap: Record<string, number> = { 'Học thuật': 10, 'Thể thao': 8, 'Văn nghệ': 10 };
    const levelMap: Record<string, number> = { Lớp: 1.0, Trường: 2.0, 'Quốc gia': 3.0 };
    const achMap: Record<string, number> = { 'Xuất sắc': 1.5, Tốt: 1.2, 'Tham gia': 1.0 };

    const base = baseMap[scenario.activityType] || 10;
    const level = levelMap[scenario.orgLevel] || 1.0;
    const ach = achMap[scenario.achievement] || 1.0;
    const type = 1.0;

    return Math.max(0, base * type * level * ach + scenario.bonus - scenario.penalty);
  };

  if (authLoading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">Đang tải...</div>
    );
  if (!user || user.role !== 'admin') return null;

  const result = calculateResult();
  const vars = variables.reduce(
    (acc, v) => ({ ...acc, [v.id]: v.value }),
    {} as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/scoring-config')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại cấu hình điểm
          </button>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calculator className="w-8 h-8 mr-3 text-blue-600" />
            Trình Soạn Công Thức Tính Điểm
          </h1>
          <p className="mt-2 text-gray-600">
            Tùy chỉnh công thức tính điểm cho hệ thống với trình soạn thảo trực quan
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Formula Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Variables Panel */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Biến số công thức</h2>
              <div className="space-y-4">
                {variables.map((variable) => (
                  <div key={variable.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {variable.name}
                        </label>
                        <p className="text-xs text-gray-500">{variable.description}</p>
                      </div>
                      <span className="text-lg font-bold text-blue-600 min-w-[60px] text-right">
                        {variable.value}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={variable.min}
                      max={variable.max}
                      step={variable.step}
                      value={variable.value}
                      onChange={(e) =>
                        handleVariableChange(variable.id, parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{variable.min}</span>
                      <span>{variable.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formula Display */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Công thức hiện tại</h2>

              {!customFormula ? (
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                  <div className="text-gray-700 mb-2">Công thức chuẩn:</div>
                  <div className="text-blue-600 font-semibold">
                    ({vars.base} × {vars.type} × {vars.level} × {vars.achievement}) + {vars.bonus} -{' '}
                    {vars.penalty}
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    value={formulaText}
                    onChange={(e) => setFormulaText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                    rows={3}
                    placeholder="Nhập công thức tùy chỉnh..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Biến khả dụng: base, type, level, achievement, bonus, penalty
                  </p>
                </div>
              )}

              <div className="mt-4 flex space-x-3">
                <button
                  onClick={() => setCustomFormula(!customFormula)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {customFormula ? 'Dùng công thức chuẩn' : 'Tùy chỉnh công thức'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {saving ? 'Đang lưu...' : 'Lưu công thức'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Testing */}
          <div className="space-y-6">
            {/* Real-time Result */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white sticky top-8">
              <h3 className="text-sm font-medium mb-2 opacity-90">Kết quả tính được</h3>
              <div className="text-5xl font-bold mb-4">{result.toFixed(2)}</div>
              <div className="text-sm opacity-90">điểm</div>

              <div className="mt-6 pt-6 border-t border-blue-400">
                <div className="text-xs font-medium mb-3 opacity-90">Chi tiết tính toán:</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-75">Điểm phụ:</span>
                    <span className="font-mono">
                      {(vars.base * vars.type * vars.level * vars.achievement).toFixed(2)}
                    </span>
                  </div>
                  {vars.bonus > 0 && (
                    <div className="flex justify-between text-green-200">
                      <span className="opacity-75">+ Thưởng:</span>
                      <span className="font-mono">+{vars.bonus}</span>
                    </div>
                  )}
                  {vars.penalty > 0 && (
                    <div className="flex justify-between text-red-200">
                      <span className="opacity-75">- Phạt:</span>
                      <span className="font-mono">-{vars.penalty}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <div className="font-semibold mb-1">Hướng dẫn sử dụng</div>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Điều chỉnh thanh trượt để thay đổi giá trị</li>
                    <li>Kết quả được tính tự động</li>
                    <li>Nhấn &quot;Lưu&quot; để áp dụng công thức</li>
                    <li>Nhấn ⟳ để về giá trị mặc định</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Test Scenarios */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Play className="w-5 h-5 mr-2 text-green-600" />
                Kịch bản thử nghiệm
              </h3>
              <div className="space-y-3">
                {testScenarios.map((scenario, idx) => {
                  const scenarioResult = getTestScenarioResult(scenario);
                  return (
                    <div
                      key={idx}
                      className="border rounded-lg p-3 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{scenario.activityType}</div>
                          <div className="text-xs text-gray-500">
                            {scenario.orgLevel} • {scenario.achievement}
                          </div>
                          {(scenario.bonus > 0 || scenario.penalty > 0) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {scenario.bonus > 0 && `+${scenario.bonus} thưởng `}
                              {scenario.penalty > 0 && `-${scenario.penalty} phạt`}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {scenarioResult.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500">điểm</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Kết quả dựa trên công thức hiện tại với giá trị ví dụ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
