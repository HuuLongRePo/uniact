import { describe, expect, it } from 'vitest';
import {
  getActivityTypesFromResponse,
  getClassesFromResponse,
} from '../src/features/reports/ParticipationReportAdminPage';

describe('Participation report filter option parsers', () => {
  it('reads classes from nested data.classes shape', () => {
    const result = getClassesFromResponse({
      data: {
        classes: [
          { id: 1, name: 'CTK42' },
          { id: 2, name: 'CTK43' },
        ],
      },
    });

    expect(result).toEqual([
      { id: 1, name: 'CTK42' },
      { id: 2, name: 'CTK43' },
    ]);
  });

  it('reads classes from top-level classes shape', () => {
    const result = getClassesFromResponse({
      classes: [{ id: 3, name: 'KTPM1' }],
    });

    expect(result).toEqual([{ id: 3, name: 'KTPM1' }]);
  });

  it('returns empty array when class payload shape is invalid', () => {
    expect(getClassesFromResponse(null)).toEqual([]);
    expect(getClassesFromResponse({ data: { items: [] } })).toEqual([]);
  });

  it('reads activity types from activityTypes shape', () => {
    const result = getActivityTypesFromResponse({
      activityTypes: [{ id: 10, name: 'Tình nguyện' }],
    });

    expect(result).toEqual([{ id: 10, name: 'Tình nguyện' }]);
  });

  it('reads activity types from legacy activity_types and types shapes', () => {
    const snakeCase = getActivityTypesFromResponse({
      activity_types: [{ id: 11, name: 'Học thuật' }],
    });
    const shortKey = getActivityTypesFromResponse({
      types: [{ id: 12, name: 'Thể thao' }],
    });

    expect(snakeCase).toEqual([{ id: 11, name: 'Học thuật' }]);
    expect(shortKey).toEqual([{ id: 12, name: 'Thể thao' }]);
  });

  it('returns empty array when activity type payload shape is invalid', () => {
    expect(getActivityTypesFromResponse(undefined)).toEqual([]);
    expect(getActivityTypesFromResponse({ data: { activityTypes: [] } })).toEqual([]);
  });
});
