import { cosineDistance, FaceEmbedding } from './face';
import { irisDistance } from './iris';

export interface MatchResult {
  modality: 'face' | 'iris';
  distance: number;
  passed: boolean;
}

export const BIOMETRIC_THRESHOLDS = {
  face: 0.35,
  iris: 0.25,
};

export function matchFace(current: FaceEmbedding, stored: FaceEmbedding): MatchResult {
  const distance = cosineDistance(current, stored);
  return { modality: 'face', distance, passed: distance < BIOMETRIC_THRESHOLDS.face };
}

export function matchIris(current: number[], stored: number[]): MatchResult {
  const distance = irisDistance(current, stored);
  return { modality: 'iris', distance, passed: distance < BIOMETRIC_THRESHOLDS.iris };
}
