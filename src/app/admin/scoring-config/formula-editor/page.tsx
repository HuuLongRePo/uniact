'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calculator,
  Info,
  Play,
  RotateCcw,
  Save,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface FormulaVariable {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  description: string;
}

interface FormulaVariableConfig {
  min: number;
  max: number;
  step: number;
  default: number;
}

interface TestScenario {
  label: string;
  base: number;
  type: number;
  level: number;
  achievement: number;
  bonus: number;
  penalty: number;
}

const DEFAULT_FORMULA = '(base * type * level * achievement) + bonus - penalty';

const DEFAULT_VARIABLES: FormulaVariable[] = [
  {
    id: 'base',
    name: 'Diem co ban',
    value: 10,
    min: 0,
    max: 100,
    step: 1,
    description: 'Diem co ban cua loai hoat dong',
  },
  {
    id: 'type',
    name: 'He so loai',
    value: 1,
    min: 0,
    max: 5,
    step: 0.1,
    description: 'He so nhan theo nhom hoat dong',
  },
  {
    id: 'level',
    name: 'He so cap do',
    value: 2,
    min: 0,
    max: 5,
    step: 0.1,
    description: 'He so nhan theo quy mo to chuc',
  },
  {
    id: 'achievement',
    name: 'He so danh gia',
    value: 1.5,
    min: 0,
    max: 3,
    step: 0.1,
    description: 'He so thanh tich sau khi cham danh gia',
  },
  {
    id: 'bonus',
    name: 'Diem cong them',
    value: 0,
    min: 0,
    max: 100,
    step: 1,
    description: 'Diem thuong bo sung',
  },
  {
    id: 'penalty',
    name: 'Diem tru',
    value: 0,
    min: 0,
    max: 100,
    step: 1,
    description: 'Diem tru neu co vi pham',
  },
];

const TEST_SCENARIOS: TestScenario[] = [
  {
    label: 'Hoat dong hoc thuat cap lop',
    base: 10,
    type: 1,
    level: 1,
    achievement: 1.5,
    bonus: 0,
    penalty: 0,
  },
  {
    label: 'Hoat dong cap truong co thu hang',
    base: 10,
    type: 1,
    level: 2,
    achievement: 1.2,
    bonus: 20,
    penalty: 0,
  },
  {
    label: 'Tham gia cap lien truong co tru diem',
    base: 8,
    type: 1,
    level: 2.5,
    achievement: 1,
    bonus: 0,
    penalty: 5,
  },
];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function buildVariableMap(variables: FormulaVariable[]) {
  return variables.reduce(
    (accumulator, variable) => {
      accumulator[variable.id] = variable.value;
      return accumulator;
    },
    {} as Record<string, number>
  );
}

function calculateFormulaResult(variableMap: Record<string, number>) {
  const subtotal =
    variableMap.base * variableMap.type * variableMap.level * variableMap.achievement;
  return Math.max(0, subtotal + variableMap.bonus - variableMap.penalty);
}

export default function FormulaEditorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formulaText, setFormulaText] = useState(DEFAULT_FORMULA);
  const [variables, setVariables] = useState<FormulaVariable[]>(DEFAULT_VARIABLES);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      void loadFormula();
    }
  }, [authLoading, router, user]);

  const loadFormula = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/scoring-config/formula');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
            'Khong the tai formula hien tai'
        );
      }

      const formula = payload?.formula;
      if (formula?.formula) {
        setFormulaText(String(formula.formula));
      }

      if (formula?.description) {
        try {
          const parsed = JSON.parse(String(formula.description)) as Record<string, FormulaVariableConfig>;
          setVariables((current) =>
            current.map((variable) => {
              const config = parsed[variable.id];
              if (!config) return variable;
              return {
                ...variable,
                min: Number(config.min ?? variable.min),
                max: Number(config.max ?? variable.max),
                step: Number(config.step ?? variable.step),
                value: Number(config.default ?? variable.value),
              };
            })
          );
        } catch {
          // Ignore invalid legacy description payloads.
        }
      }
    } catch (error) {
      console.error('Load scoring formula error:', error);
      toast.error(getErrorMessage(error, 'Khong the tai formula hien tai'));
    } finally {
      setLoading(false);
    }
  };

  const variableMap = useMemo(() => buildVariableMap(variables), [variables]);
  const previewResult = useMemo(() => calculateFormulaResult(variableMap), [variableMap]);

  const handleVariableChange = (id: string, value: number) => {
    setVariables((current) =>
      current.map((variable) => (variable.id === id ? { ...variable, value } : variable))
    );
  };

  const handleReset = () => {
    setFormulaText(DEFAULT_FORMULA);
    setVariables(DEFAULT_VARIABLES);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        formula: formulaText,
        variables: variables.reduce(
          (accumulator, variable) => {
            accumulator[variable.id] = {
              min: variable.min,
              max: variable.max,
              step: variable.step,
              default: variable.value,
            };
            return accumulator;
          },
          {} as Record<string, FormulaVariableConfig>
        ),
      };

      const response = await fetch('/api/admin/scoring-config/formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (responsePayload &&
            typeof responsePayload === 'object' &&
            'error' in responsePayload &&
            String(responsePayload.error)) ||
            'Khong the luu formula'
        );
      }

      toast.success('Da luu formula scoring');
    } catch (error) {
      console.error('Save scoring formula error:', error);
      toast.error(getErrorMessage(error, 'Khong the luu formula'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai formula editor..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <button
            type="button"
            onClick={() => router.push('/admin/scoring-config')}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lai scoring config
          </button>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                Formula editor
              </div>
              <h1
                className="mt-3 flex items-center gap-3 text-3xl font-bold text-slate-900"
                data-testid="admin-scoring-formula-heading"
              >
                <Calculator className="h-8 w-8 text-blue-600" />
                Trinh soan cong thuc tinh diem
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Thu nghiem bien so scoring, preview ket qua va luu formula active truoc khi rollout
                cho toan he thong.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Dat lai
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Luu cong thuc
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
            <h2 className="text-lg font-semibold text-slate-900">Bien so su dung trong cong thuc</h2>
            <p className="mt-1 text-sm text-slate-600">
              Dieu chinh gia tri mac dinh va gioi han slider de doi soat impact scoring.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {variables.map((variable) => (
                <div key={variable.id} className="rounded-[1.5rem] border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{variable.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{variable.description}</div>
                    </div>
                    <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                      {variable.value}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={variable.min}
                    max={variable.max}
                    step={variable.step}
                    value={variable.value}
                    onChange={(event) =>
                      handleVariableChange(variable.id, Number.parseFloat(event.target.value || '0') || 0)
                    }
                    className="mt-4 w-full accent-blue-600"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {variable.min} - {variable.max}
                    </span>
                    <input
                      aria-label={variable.name}
                      type="number"
                      min={variable.min}
                      max={variable.max}
                      step={variable.step}
                      value={variable.value}
                      onChange={(event) =>
                        handleVariableChange(variable.id, Number.parseFloat(event.target.value || '0') || 0)
                      }
                      className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="space-y-6">
            <div className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
              <h2 className="text-lg font-semibold text-slate-900">Cong thuc dang preview</h2>
              <textarea
                value={formulaText}
                onChange={(event) => setFormulaText(event.target.value)}
                className="mt-4 h-28 w-full rounded-[1.25rem] border border-slate-300 px-4 py-3 font-mono text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-4 rounded-[1.25rem] bg-blue-50 px-4 py-4 text-sm text-blue-900">
                <div className="font-semibold">Preview ket qua</div>
                <div className="mt-2 text-3xl font-bold text-blue-700">{previewResult.toFixed(2)}</div>
                <div className="mt-2 text-blue-800">
                  Subtotal = {variableMap.base} x {variableMap.type} x {variableMap.level} x{' '}
                  {variableMap.achievement} + {variableMap.bonus} - {variableMap.penalty}
                </div>
              </div>
            </div>

            <div className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
              <div className="flex items-center gap-2 text-slate-900">
                <Info className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Kich ban test nhanh</h2>
              </div>
              <div className="mt-4 space-y-3">
                {TEST_SCENARIOS.map((scenario) => {
                  const result = calculateFormulaResult({
                    base: scenario.base,
                    type: scenario.type,
                    level: scenario.level,
                    achievement: scenario.achievement,
                    bonus: scenario.bonus,
                    penalty: scenario.penalty,
                  });

                  return (
                    <div key={scenario.label} className="rounded-[1.25rem] border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-slate-900">{scenario.label}</div>
                          <div className="mt-2 text-xs text-slate-500">
                            {scenario.base} x {scenario.type} x {scenario.level} x {scenario.achievement} +{' '}
                            {scenario.bonus} - {scenario.penalty}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                            <Play className="h-4 w-4" />
                            {result.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
