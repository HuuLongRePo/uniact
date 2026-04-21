import { describe, it, expect } from 'vitest'
import {
  validateCreateActivityBody,
  validateUpdateActivityBody,
  parsePositiveInt,
} from '@/lib/activity-validation'

describe('activity-validation helpers', () => {
  it('parsePositiveInt returns null for invalid values', () => {
    expect(parsePositiveInt(0)).toBeNull()
    expect(parsePositiveInt(-1)).toBeNull()
    expect(parsePositiveInt(1.2)).toBeNull()
    expect(parsePositiveInt('abc')).toBeNull()
    expect(parsePositiveInt('3')).toBe(3)
  })

  it('validateCreateActivityBody returns field errors for invalid payload', () => {
    const result = validateCreateActivityBody({
      title: '',
      date_time: 'invalid-date',
      location: '',
      max_participants: 0,
      class_ids: ['x'],
    })

    expect(result.data).toBeUndefined()
    expect(result.errors.title).toBeTruthy()
    expect(result.errors.date_time).toBeTruthy()
    expect(result.errors.location).toBeTruthy()
    expect(result.errors.max_participants).toBeTruthy()
    expect(result.errors.class_ids).toBeTruthy()
  })

  it('validateCreateActivityBody accepts valid payload and normalizes data', () => {
    const eventTime = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString()
    const deadline = new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString()

    const result = validateCreateActivityBody({
      title: '  Hoạt động test  ',
      description: '  Mô tả  ',
      start_time: eventTime,
      location: '  P.101  ',
      max_participants: '50',
      class_ids: [1, '2', 2],
      registration_deadline: deadline,
      type_id: 3,
      organization_level_id: 4,
    })

    expect(result.errors).toEqual({})
    expect(result.data).toBeDefined()
    expect(result.data?.title).toBe('Hoạt động test')
    expect(result.data?.description).toBe('Mô tả')
    expect(result.data?.location).toBe('P.101')
    expect(result.data?.max_participants).toBe(50)
    expect(result.data?.class_ids).toEqual([1, 2])
    expect(result.data?.activity_type_id).toBe(3)
    expect(result.data?.organization_level_id).toBe(4)
  })

  it('validateUpdateActivityBody validates deadline against baseDateTime', () => {
    const eventTime = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    const tooSoon = new Date(Date.now() + 60 * 60 * 60 * 1000).toISOString()

    const result = validateUpdateActivityBody(
      { registration_deadline: tooSoon },
      { baseDateTime: eventTime }
    )

    expect(result.data).toBeUndefined()
    expect(result.errors.registration_deadline).toBeTruthy()
  })

  it('validateUpdateActivityBody allows partial payload and explicit nulls', () => {
    const result = validateUpdateActivityBody({
      title: '  Tiêu đề mới  ',
      class_ids: null,
      registration_deadline: null,
      activity_type_id: null,
    })

    expect(result.errors).toEqual({})
    expect(result.data).toEqual({
      title: 'Tiêu đề mới',
      class_ids: [],
      mandatory_class_ids: [],
      voluntary_class_ids: [],
      mandatory_student_ids: [],
      voluntary_student_ids: [],
      applies_to_all_students: false,
      registration_deadline: null,
      activity_type_id: null,
    })
  })

  it('maps legacy is_mandatory=false with class_ids to voluntary scope on create', () => {
    const eventTime = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString()

    const result = validateCreateActivityBody({
      title: 'Legacy voluntary',
      date_time: eventTime,
      location: 'Hall',
      max_participants: 30,
      class_ids: [5, 6],
      is_mandatory: false,
    })

    expect(result.errors).toEqual({})
    expect(result.data?.class_ids).toEqual([5, 6])
    expect(result.data?.mandatory_class_ids).toEqual([])
    expect(result.data?.voluntary_class_ids).toEqual([5, 6])
  })

  it('maps legacy is_mandatory=false with class_ids to voluntary scope on update', () => {
    const result = validateUpdateActivityBody({
      class_ids: [7],
      is_mandatory: false,
    })

    expect(result.errors).toEqual({})
    expect(result.data).toEqual({
      class_ids: [7],
      mandatory_class_ids: [],
      voluntary_class_ids: [7],
      applies_to_all_students: false,
      mandatory_student_ids: [],
      voluntary_student_ids: [],
    })
  })
})
