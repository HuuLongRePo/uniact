'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Save, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface ScoringFormula {
  basePointsMultiplier: number;
  activityTypeMultipliers: {
    environmental: number;
    social: number;
    sports: number;
    academic: number;
    cultural: number;
  };
  organizationLevelMultipliers: {
    school: number;
    district: number;
    city: number;
    national: number;
  };
  achievementMultipliers: {
    gold: number;
    silver: number;
    bronze: number;
    participation: number;
  };
}

export default function ScoringFormulaPage() {
  const router = useRouter();
  const [formula, setFormula] = useState<ScoringFormula>({
    basePointsMultiplier: 1.0,
    activityTypeMultipliers: {
      environmental: 1.2,
      social: 1.0,
      sports: 1.1,
      academic: 1.3,
      cultural: 1.0,
    },
    organizationLevelMultipliers: {
      school: 1.0,
      district: 1.5,
      city: 2.0,
      national: 3.0,
    },
    achievementMultipliers: {
      gold: 3.0,
      silver: 2.0,
      bronze: 1.5,
      participation: 1.0,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFormula();
  }, []);

  async function fetchFormula() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/config/scoring-formula');
      const data = await res.json();
      if (res.ok && data.formula) {
        setFormula(data.formula);
      }
    } catch (error) {
      console.error('Fetch formula error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveFormula() {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/config/scoring-formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula }),
      });

      if (res.ok) {
        toast.success('Công thức tính điểm đã được lưu!');
      } else {
        toast.error('Lưu công thức thất bại');
      }
    } catch (error) {
      console.error('Save formula error:', error);
      toast.error('Lưu công thức thất bại');
    } finally {
      setSaving(false);
    }
  }

  function updateActivityType(type: keyof typeof formula.activityTypeMultipliers, value: number) {
    setFormula({
      ...formula,
      activityTypeMultipliers: {
        ...formula.activityTypeMultipliers,
        [type]: value,
      },
    });
  }

  function updateOrgLevel(level: keyof typeof formula.organizationLevelMultipliers, value: number) {
    setFormula({
      ...formula,
      organizationLevelMultipliers: {
        ...formula.organizationLevelMultipliers,
        [level]: value,
      },
    });
  }

  function updateAchievement(level: keyof typeof formula.achievementMultipliers, value: number) {
    setFormula({
      ...formula,
      achievementMultipliers: {
        ...formula.achievementMultipliers,
        [level]: value,
      },
    });
  }

  // Example calculation
  const examplePoints = 100;
  const exampleResult =
    examplePoints *
    formula.basePointsMultiplier *
    formula.activityTypeMultipliers.environmental *
    formula.organizationLevelMultipliers.city *
    formula.achievementMultipliers.gold;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calculator className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Scoring Formula Configuration</h1>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading formula...</p>
        ) : (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">How Scoring Works:</p>
                <p>
                  Final Points = Base Points × Activity Type Multiplier × Organization Level
                  Multiplier × Achievement Multiplier
                </p>
              </div>
            </div>

            {/* Base Multiplier */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Base Points Multiplier</h2>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formula.basePointsMultiplier}
                onChange={(e) =>
                  setFormula({
                    ...formula,
                    basePointsMultiplier: parseFloat(e.target.value) || 1.0,
                  })
                }
                className="border rounded-lg px-4 py-2 w-full"
              />
            </div>

            {/* Activity Type Multipliers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Activity Type Multipliers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(formula.activityTypeMultipliers).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {key}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={value}
                      onChange={(e) =>
                        updateActivityType(
                          key as keyof typeof formula.activityTypeMultipliers,
                          parseFloat(e.target.value) || 1.0
                        )
                      }
                      className="border rounded-lg px-4 py-2 w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Organization Level Multipliers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Organization Level Multipliers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(formula.organizationLevelMultipliers).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {key}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={value}
                      onChange={(e) =>
                        updateOrgLevel(
                          key as keyof typeof formula.organizationLevelMultipliers,
                          parseFloat(e.target.value) || 1.0
                        )
                      }
                      className="border rounded-lg px-4 py-2 w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Achievement Multipliers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Achievement Level Multipliers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(formula.achievementMultipliers).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {key}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={value}
                      onChange={(e) =>
                        updateAchievement(
                          key as keyof typeof formula.achievementMultipliers,
                          parseFloat(e.target.value) || 1.0
                        )
                      }
                      className="border rounded-lg px-4 py-2 w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Example Calculation */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-900 mb-4">Example Calculation</h2>
              <div className="space-y-2 text-sm text-green-800">
                <p>
                  Base Points: <span className="font-semibold">{examplePoints}</span>
                </p>
                <p>
                  × Base Multiplier:{' '}
                  <span className="font-semibold">{formula.basePointsMultiplier}</span>
                </p>
                <p>
                  × Activity Type (Environmental):{' '}
                  <span className="font-semibold">
                    {formula.activityTypeMultipliers.environmental}
                  </span>
                </p>
                <p>
                  × Organization Level (City):{' '}
                  <span className="font-semibold">{formula.organizationLevelMultipliers.city}</span>
                </p>
                <p>
                  × Achievement (Gold):{' '}
                  <span className="font-semibold">{formula.achievementMultipliers.gold}</span>
                </p>
                <hr className="border-green-300 my-2" />
                <p className="text-lg font-bold">
                  Final Points: <span className="text-green-600">{exampleResult.toFixed(2)}</span>
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveFormula}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Formula'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
