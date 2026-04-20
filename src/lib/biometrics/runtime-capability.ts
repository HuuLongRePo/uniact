import {
  FACE_BIOMETRIC_RUNTIME_ENABLED,
  FACE_BIOMETRIC_RUNTIME_MODE,
  getFaceModelLoadState,
} from './face-runtime';

export type FaceRuntimeCapability = {
  runtime_enabled: boolean;
  model_loading_ready: boolean;
  embedding_detection_ready: boolean;
  liveness_check_ready: boolean;
  attendance_api_accepting_runtime_verification: boolean;
  mode: 'stubbed' | 'config_enabled_stubbed' | 'runtime_ready';
  blockers: string[];
};

export function getFaceRuntimeCapability(): FaceRuntimeCapability {
  const modelLoadState = getFaceModelLoadState();

  if (!FACE_BIOMETRIC_RUNTIME_ENABLED) {
    return {
      runtime_enabled: false,
      model_loading_ready: false,
      embedding_detection_ready: false,
      liveness_check_ready: false,
      attendance_api_accepting_runtime_verification: false,
      mode: 'stubbed',
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
      embedding_detection_ready: false,
      liveness_check_ready: false,
      attendance_api_accepting_runtime_verification: false,
      mode: 'config_enabled_stubbed',
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
    embedding_detection_ready: false,
    liveness_check_ready: false,
    attendance_api_accepting_runtime_verification: false,
    mode: 'runtime_ready',
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
