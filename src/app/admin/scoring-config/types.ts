export interface ActivityTypeConfig {
  id: number;
  name: string;
  base_points: number;
  color: string;
}

export interface OrganizationLevelConfig {
  id: number;
  name: string;
  multiplier: number;
}

export interface AchievementMultiplierConfig {
  achievement_level: string;
  multiplier: number;
  description: string;
}

export interface AwardBonusConfig {
  id: number;
  award_type: string;
  name: string;
  bonus_points: number;
  description: string;
}

export interface ScoringRuleConfig {
  id: number;
  name: string;
  formula: string;
  description: string;
  is_active: number;
}

export interface SystemScoringConfig {
  id: number;
  config_key: string;
  config_value: string;
}

export interface ScoringConfig {
  scoringRules: ScoringRuleConfig[];
  activityTypes: ActivityTypeConfig[];
  organizationLevels: OrganizationLevelConfig[];
  achievementMultipliers: AchievementMultiplierConfig[];
  awardBonuses: AwardBonusConfig[];
  systemConfig: SystemScoringConfig[];
}

export type ScoringConfigUpdatePayload =
  | Pick<ActivityTypeConfig, 'id' | 'base_points' | 'color'>
  | Pick<OrganizationLevelConfig, 'id' | 'multiplier'>
  | Pick<AchievementMultiplierConfig, 'achievement_level' | 'multiplier' | 'description'>
  | Pick<AwardBonusConfig, 'id' | 'award_type' | 'bonus_points' | 'description'>
  | Pick<ScoringRuleConfig, 'id' | 'name' | 'formula' | 'description' | 'is_active'>;
