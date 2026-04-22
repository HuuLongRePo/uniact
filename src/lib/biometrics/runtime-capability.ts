import {
  FACE_BIOMETRIC_RUNTIME_ENABLED,
  FACE_BIOMETRIC_RUNTIME_MODE,
  getFaceModelLoadState,
} from './face-runtime';
import { getBiometricProductionPolicy } from './production-policy';

export type FaceRuntimeCapability = {
  runtime_enabled: boolean;
  model_loading_ready: boolean;
  model_loading_status: 'idle' | 'loading' | 'ready' | 'failed';
  embedding_detection_ready: boolean;
  liveness_check_ready: boolean;
  liveness_status: 'runtime_unavailable' | 'insufficient_signal' | 'passed';
  attendance_api_accepting_runtime_verification: boolean;
  mode: 'stubbed' | 'config_enabled_stubbed' | 'runtime_ready';
  selected_matching_engine: string;
  selected_liveness_engine: string;
  selected_distance_threshold: number;
  blockers: string[];
};

export function getFaceRuntimeCapability(): FaceRuntimeCapability {
  const modelLoadState = getFaceModelLoadState();
  const policy = getBiometricProductionPolicy();

  if (!FACE_BIOMETRIC_RUNTIME_ENABLED) {
    return {
      runtime_enabled: false,
      model_loading_ready: false,
      model_loading_status: modelLoadState.status,
      embedding_detection_ready: false,
      liveness_check_ready: false,
      liveness_status: 'runtime_unavailable',
      attendance_api_accepting_runtime_verification: false,
      mode: 'stubbed',
      selected_matching_engine: policy.face_matching_engine,
      selected_liveness_engine: policy.face_liveness_engine,
      selected_distance_threshold: policy.face_distance_threshold,
      blockers: [
        'Face biometric runtime đang bị tắt',
        'Model loading chưa được bật',
        'Embedding detection chưa sẵn sàng cho production',
        'Liveness check chưa sẵn sàng cho production',
      ],
    };
  }

  if (FACE_BIOMETRIC_RUNTIME_MODE === 'config_enabled_stubbed') {
    return {
      runtime_enabled: true,
      model_loading_ready: false,
      model_loading_status: modelLoadState.status,
      embedding_detection_ready: false,
      liveness_check_ready: false,
      liveness_status: 'runtime_unavailable',
      attendance_api_accepting_runtime_verification: false,
      mode: 'config_enabled_stubbed',
      selected_matching_engine: policy.face_matching_engine,
      selected_liveness_engine: policy.face_liveness_engine,
      selected_distance_threshold: policy.face_distance_threshold,
      blockers: [
        'Runtime đã được bật bằng config nhưng inference path vẫn đang stubbed',
        'Model loading chưa được nối vào runtime thật',
        'Embedding detection chưa sẵn sàng cho production',
        'Liveness check chưa sẵn sàng cho production',
      ],
    };
  }

  const modelLoadingReady = modelLoadState.status === 'ready';

  return {
    runtime_enabled: true,
    model_loading_ready: modelLoadingReady,
    model_loading_status: modelLoadState.status,
    embedding_detection_ready: false,
    liveness_check_ready: false,
    liveness_status: modelLoadingReady ? 'insufficient_signal' : 'runtime_unavailable',
    attendance_api_accepting_runtime_verification: false,
    mode: 'runtime_ready',
    selected_matching_engine: policy.face_matching_engine,
    selected_liveness_engine: policy.face_liveness_engine,
    selected_distance_threshold: policy.face_distance_threshold,
    blockers: modelLoadingReady
      ? [
          'Embedding detection chưa sẵn sàng cho production',
          'Liveness check chưa sẵn sàng cho production',
        ]
      : [
          modelLoadState.status === 'failed'
            ? `Model loading thất bại: ${modelLoadState.lastError || 'Unknown model load error'}`
            : 'Model loading chưa hoàn tất cho runtime thật',
          'Embedding detection chưa sẵn sàng cho production',
          'Liveness check chưa sẵn sàng cho production',
        ],
  };
}
