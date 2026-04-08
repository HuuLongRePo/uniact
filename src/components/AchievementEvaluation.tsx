'use client';

import React from 'react';
import {
  AchievementLevel,
  getAchievementLabel,
  getAchievementStyle,
  ACHIEVEMENT_MULTIPLIERS,
} from '@/lib/scoring';

interface AchievementEvaluationProps {
  value: AchievementLevel;
  onChange: (level: AchievementLevel) => void;
  basePoints?: number;
  disabled?: boolean;
  showScore?: boolean;
}

export default function AchievementEvaluation({
  value,
  onChange,
  basePoints = 10,
  disabled = false,
  showScore = true,
}: AchievementEvaluationProps) {
  const levels: AchievementLevel[] = ['excellent', 'good', 'participated'];

  const getScore = (level: AchievementLevel) => {
    return Math.round(basePoints * ACHIEVEMENT_MULTIPLIERS[level]);
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Mức thành tích</label>

      <div className="grid grid-cols-3 gap-3">
        {levels.map((level) => {
          const isSelected = value === level;
          const style = getAchievementStyle(level);
          const score = getScore(level);

          return (
            <button
              key={level}
              onClick={() => !disabled && onChange(level)}
              disabled={disabled}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`text-2xl mb-2 ${style.badge}`}>{style.badge}</div>
              <div className={`font-semibold ${style.color}`}>{getAchievementLabel(level)}</div>
              {showScore && <div className="text-sm text-gray-600 mt-2">{score} điểm</div>}
              <div className="text-xs text-gray-500 mt-1">
                {Math.round(ACHIEVEMENT_MULTIPLIERS[level] * 100)}%
              </div>
            </button>
          );
        })}
      </div>

      {/* Score Breakdown */}
      {showScore && basePoints > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mt-4">
          <div className="text-sm font-medium text-gray-700 mb-3">💡 Công thức điểm</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Điểm cơ bản:</span>
              <span className="font-medium">{basePoints}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>× Hệ số thành tích ({getAchievementLabel(value)}):</span>
              <span className="font-medium">{ACHIEVEMENT_MULTIPLIERS[value].toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-blue-700">
              <span>= Tổng điểm:</span>
              <span>{getScore(value)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
