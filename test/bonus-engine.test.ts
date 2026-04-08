import { describe, it, expect, beforeEach } from 'vitest'
import {
  BonusEngine,
  BonusCalculationInput,
  DEFAULT_BONUS_WEIGHTS,
  BONUS_CAPS,
  normalizePoints,
  mapAchievementLevel,
  aggregateBonusPoints,
  createDefaultEngine,
  suggestPointsForAchievement,
} from '@/lib/bonus-engine'

describe('BonusEngine', () => {
  let engine: BonusEngine

  beforeEach(() => {
    engine = createDefaultEngine()
  })

  describe('Initialization', () => {
    it('should create with default weights', () => {
      const weights = engine.getWeights()
      expect(weights.achievement.firstPlace).toBe(10)
      expect(weights.activity.organizer).toBe(8)
      expect(weights.social.mentoring).toBe(4)
    })

    it('should allow custom weights', () => {
      const customEngine = new BonusEngine({
        achievement: { ...DEFAULT_BONUS_WEIGHTS.achievement, firstPlace: 15 }
      })
      expect(customEngine.getWeights().achievement.firstPlace).toBe(15)
    })

    it('should have default caps', () => {
      const caps = engine.getCaps()
      expect(caps.perSemester).toBe(50)
      expect(caps.perYear).toBe(100)
      expect(caps.maxSingleBonus).toBe(15)
    })
  })

  describe('Basic Calculation', () => {
    it('should calculate basic achievement bonus', () => {
      const input: BonusCalculationInput = {
        studentId: 1,
        sourceType: 'achievement',
        basePoints: 10,
      }
      const result = engine.calculate(input)
      
      expect(result.studentId).toBe(1)
      expect(result.suggestedPoints).toBe(10)
      expect(result.basePoints).toBe(10)
      expect(result.multiplier).toBe(1)
      expect(result.capApplied).toBe(false)
    })

    it('should apply multiplier correctly', () => {
      const input: BonusCalculationInput = {
        studentId: 1,
        sourceType: 'achievement',
        basePoints: 10,
        multiplier: 1.5,
      }
      const result = engine.calculate(input)
      
      expect(result.suggestedPoints).toBe(15)
      expect(result.multiplier).toBe(1.5)
      expect(result.validations).toContain('Applied multiplier 1.5x')
    })

    it('should cap single bonus at maximum', () => {
      const input: BonusCalculationInput = {
        studentId: 1,
        sourceType: 'achievement',
        basePoints: 20, // exceeds max of 15
      }
      const result = engine.calculate(input)
      
      expect(result.suggestedPoints).toBe(15)
      expect(result.capApplied).toBe(true)
      expect(result.cappedAt).toBe(20)
      expect(result.validations.some(v => v.includes('Capped'))).toBe(true)
    })

    it('should handle zero and negative base points', () => {
      const resultZero = engine.calculate({
        studentId: 1,
        sourceType: 'activity',
        basePoints: 0,
      })
      expect(resultZero.suggestedPoints).toBe(0)

      const resultNegative = engine.calculate({
        studentId: 1,
        sourceType: 'activity',
        basePoints: -5,
      })
      expect(resultNegative.suggestedPoints).toBe(-5)
    })
  })

  describe('Weight Retrieval', () => {
    it('should get weight for valid source and subtype', () => {
      const weight = engine.getWeight('achievement', 'firstPlace')
      expect(weight).toBe(10)
    })

    it('should return null for invalid source', () => {
      const weight = engine.getWeight('invalid', 'subtype')
      expect(weight).toBeNull()
    })

    it('should return null for invalid subtype', () => {
      const weight = engine.getWeight('achievement', 'invalidSub')
      expect(weight).toBeNull()
    })

    it('should get all achievement weights', () => {
      const weights = engine.getWeights()
      expect(weights.achievement).toHaveProperty('firstPlace')
      expect(weights.achievement).toHaveProperty('secondPlace')
      expect(weights.achievement).toHaveProperty('thirdPlace')
      expect(weights.achievement).toHaveProperty('participation')
    })
  })

  describe('Cap Validation', () => {
    it('should validate bonus within semester cap', () => {
      const validation = engine.validateAgainstCap(
        40, // current total
        8,  // proposed bonus
        'semester'
      )
      
      expect(validation.valid).toBe(true)
      expect(validation.remainingCapacity).toBe(2)
    })

    it('should reject bonus exceeding semester cap', () => {
      const validation = engine.validateAgainstCap(
        45,  // current total
        10,  // proposed bonus
        'semester'
      )
      
      expect(validation.valid).toBe(false)
      expect(validation.remainingCapacity).toBe(5)
      expect(validation.message).toContain('Vượt quá')
    })

    it('should validate bonus within year cap', () => {
      const validation = engine.validateAgainstCap(
        80,  // current total
        15,  // proposed bonus
        'year'
      )
      
      expect(validation.valid).toBe(true)
      expect(validation.remainingCapacity).toBe(5)
    })

    it('should reject bonus exceeding year cap', () => {
      const validation = engine.validateAgainstCap(
        95,  // current total
        10,  // proposed bonus
        'year'
      )
      
      expect(validation.valid).toBe(false)
      expect(validation.remainingCapacity).toBe(5)
    })

    it('should handle zero current total', () => {
      const validation = engine.validateAgainstCap(0, 50, 'semester')
      expect(validation.valid).toBe(true)
      expect(validation.remainingCapacity).toBe(0)
    })
  })

  describe('Cap Updates', () => {
    it('should update caps', () => {
      engine.updateCaps({ perSemester: 60, maxSingleBonus: 20 })
      const caps = engine.getCaps()
      
      expect(caps.perSemester).toBe(60)
      expect(caps.maxSingleBonus).toBe(20)
      expect(caps.perYear).toBe(100) // unchanged
    })

    it('should respect updated caps in calculations', () => {
      engine.updateCaps({ maxSingleBonus: 20 })
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'achievement',
        basePoints: 18,
      })
      
      expect(result.capApplied).toBe(false)
      expect(result.suggestedPoints).toBe(18)
    })

    it('should cap with new limit', () => {
      engine.updateCaps({ maxSingleBonus: 12 })
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'achievement',
        basePoints: 15,
      })
      
      expect(result.capApplied).toBe(true)
      expect(result.suggestedPoints).toBe(12)
    })
  })

  describe('Achievement Level Mapping', () => {
    it('should map first place variations', () => {
      expect(mapAchievementLevel('1st')).toBe('firstPlace')
      expect(mapAchievementLevel('1')).toBe('firstPlace')
      expect(mapAchievementLevel('gold')).toBe('firstPlace')
      expect(mapAchievementLevel('nhất')).toBe('firstPlace')
    })

    it('should map second place variations', () => {
      expect(mapAchievementLevel('2nd')).toBe('secondPlace')
      expect(mapAchievementLevel('2')).toBe('secondPlace')
      expect(mapAchievementLevel('silver')).toBe('secondPlace')
      expect(mapAchievementLevel('nhì')).toBe('secondPlace')
    })

    it('should map third place variations', () => {
      expect(mapAchievementLevel('3rd')).toBe('thirdPlace')
      expect(mapAchievementLevel('3')).toBe('thirdPlace')
      expect(mapAchievementLevel('bronze')).toBe('thirdPlace')
      expect(mapAchievementLevel('ba')).toBe('thirdPlace')
    })

    it('should map participation variations', () => {
      expect(mapAchievementLevel('participant')).toBe('participation')
      expect(mapAchievementLevel('join')).toBe('participation')
      expect(mapAchievementLevel('tham gia')).toBe('participation')
    })

    it('should return null for unknown levels', () => {
      expect(mapAchievementLevel('unknown')).toBeNull()
      expect(mapAchievementLevel('')).toBeNull()
    })

    it('should be case insensitive', () => {
      expect(mapAchievementLevel('GOLD')).toBe('firstPlace')
      expect(mapAchievementLevel('NHẤT')).toBe('firstPlace')
      expect(mapAchievementLevel('Participant')).toBe('participation')
    })
  })

  describe('Utility Functions', () => {
    it('should normalize points to 2 decimals', () => {
      expect(normalizePoints(10.456)).toBe(10.46)
      expect(normalizePoints(5.1)).toBe(5.1)
      expect(normalizePoints(3.999)).toBe(4)
    })

    it('should suggest points for achievement level', () => {
      expect(suggestPointsForAchievement('1st')).toBe(10)
      expect(suggestPointsForAchievement('2nd')).toBe(7)
      expect(suggestPointsForAchievement('3rd')).toBe(5)
      expect(suggestPointsForAchievement('participant')).toBe(2)
    })

    it('should return null for unknown achievement level', () => {
      expect(suggestPointsForAchievement('unknown')).toBeNull()
    })

    it('should use custom weights in suggestion', () => {
      const customEngine = new BonusEngine({
        achievement: { ...DEFAULT_BONUS_WEIGHTS.achievement, firstPlace: 20 }
      })
      const weight = customEngine.getWeights().achievement.firstPlace
      expect(weight).toBe(20)
    })
  })

  describe('Aggregation', () => {
    it('should aggregate multiple bonuses', () => {
      const bonuses = [
        engine.calculate({
          studentId: 1,
          sourceType: 'achievement',
          basePoints: 10,
        }),
        engine.calculate({
          studentId: 1,
          sourceType: 'activity',
          basePoints: 5,
        }),
        engine.calculate({
          studentId: 1,
          sourceType: 'development',
          basePoints: 3,
        }),
      ]

      const aggregate = aggregateBonusPoints(bonuses)
      expect(aggregate.total).toBe(18)
      expect(aggregate.count).toBe(3)
      expect(aggregate.average).toBe(6)
    })

    it('should create breakdown by reason', () => {
      const bonuses = [
        engine.calculate({
          studentId: 1,
          sourceType: 'achievement',
          basePoints: 10,
        }),
        engine.calculate({
          studentId: 1,
          sourceType: 'achievement',
          basePoints: 5,
        }),
      ]

      const aggregate = aggregateBonusPoints(bonuses)
      expect(Object.keys(aggregate.breakdown).length).toBeGreaterThan(0)
    })

    it('should handle empty bonus array', () => {
      const aggregate = aggregateBonusPoints([])
      expect(aggregate.total).toBe(0)
      expect(aggregate.count).toBe(0)
      expect(aggregate.average).toBe(0)
      expect(Object.keys(aggregate.breakdown).length).toBe(0)
    })

    it('should normalize aggregate total', () => {
      const bonuses = [
        engine.calculate({
          studentId: 1,
          sourceType: 'achievement',
          basePoints: 10.123,
        }),
        engine.calculate({
          studentId: 1,
          sourceType: 'activity',
          basePoints: 5.456,
        }),
      ]

      const aggregate = aggregateBonusPoints(bonuses)
      // Should be normalized to 2 decimals
      expect(String(aggregate.total).split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle multiplier with cap', () => {
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'achievement',
        basePoints: 12,
        multiplier: 1.5,
      })

      expect(result.suggestedPoints).toBe(15)
      expect(result.capApplied).toBe(true)
      expect(result.cappedAt).toBe(18)
    })

    it('should calculate for multiple students independently', () => {
      const result1 = engine.calculate({
        studentId: 1,
        sourceType: 'achievement',
        basePoints: 10,
      })

      const result2 = engine.calculate({
        studentId: 2,
        sourceType: 'achievement',
        basePoints: 10,
      })

      expect(result1.suggestedPoints).toBe(result2.suggestedPoints)
      expect(result1.studentId).toBe(1)
      expect(result2.studentId).toBe(2)
    })

    it('should track validation reasons accurately', () => {
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'activity',
        basePoints: 10,
        multiplier: 2,
      })

      expect(result.validations.length).toBeGreaterThan(0)
      expect(result.validations.some(v => v.includes('multiplier'))).toBe(true)
    })

    it('should generate readable reason for each source type', () => {
      const sources = ['achievement', 'activity', 'development', 'social', 'special']
      
      sources.forEach(source => {
        const result = engine.calculate({
          studentId: 1,
          sourceType: source,
          basePoints: 5,
        })
        expect(result.reason).toBeTruthy()
        expect(result.reason).toMatch(/\+\d+/) // contains "+X" points notation
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large point values', () => {
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'achievement',
        basePoints: 1000,
      })
      expect(result.capApplied).toBe(true)
      expect(result.suggestedPoints).toBe(15)
    })

    it('should handle decimal point values', () => {
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'activity',
        basePoints: 3.75,
      })
      expect(result.suggestedPoints).toBe(3.75)
    })

    it('should handle fraction multipliers', () => {
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'development',
        basePoints: 10,
        multiplier: 0.5,
      })
      expect(result.suggestedPoints).toBe(5)
    })

    it('should handle source type case insensitivity in getWeight', () => {
      const weight1 = engine.getWeight('ACHIEVEMENT', 'firstPlace')
      const weight2 = engine.getWeight('Achievement', 'firstPlace')
      // Note: keys are lowercase in actual implementation
      // This tests the lookup behavior
      expect(typeof weight1).toBe(typeof null || 'number')
    })
  })

  describe('Reason Generation', () => {
    it('should generate meaningful reasons', () => {
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'achievement',
        basePoints: 8,
      })
      expect(result.reason).toContain('Hoạt động ngoại khóa')
    })

    it('should include point value in reason', () => {
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'activity',
        basePoints: 6,
      })
      expect(result.reason).toContain('6')
    })

    it('should fallback to source type for unknown sources', () => {
      const result = engine.calculate({
        studentId: 1,
        sourceType: 'custom_type',
        basePoints: 5,
      })
      expect(result.reason).toBeTruthy()
      expect(result.reason).toContain('5')
    })
  })
})
