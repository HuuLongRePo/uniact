function isLikelyEmbeddedBrowser() {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();
  return /fban|fbav|instagram|zalo|line\/|micromessenger|wv\)|webview/.test(userAgent);
}

function getEmbeddedBrowserCameraHint() {
  return 'Thiết bị đang mở trong trình duyệt nhúng của ứng dụng. Hãy mở liên kết bằng Chrome/Safari/Edge để dùng camera ổn định.';
}

export async function requestPreferredCameraStream(options?: {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('Không thể truy cập camera trong môi trường hiện tại.');
  }

  if (!window.isSecureContext) {
    throw new Error(
      isLikelyEmbeddedBrowser()
        ? getEmbeddedBrowserCameraHint()
        : 'Camera chỉ hoạt động trên kết nối bảo mật (HTTPS hoặc localhost). Hãy mở lại bằng trình duyệt ngoài ứng dụng nhúng.'
    );
  }

  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error(
      isLikelyEmbeddedBrowser()
        ? getEmbeddedBrowserCameraHint()
        : 'Trình duyệt hiện tại chưa hỗ trợ camera đầy đủ. Hãy cập nhật Chrome/Safari/Edge hoặc mở bằng trình duyệt ngoài ứng dụng.'
    );
  }

  const facingMode = options?.facingMode || 'environment';
  const width = options?.width || 1280;
  const height = options?.height || 720;

  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    },
    {
      video: {
        facingMode,
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    },
    {
      video: {
        width: { ideal: width },
        height: { ideal: height },
      },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];

  let lastError: unknown = null;

  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Không truy cập được camera.');
}

export function getCameraAccessErrorMessage(error: unknown) {
  const errorName =
    error instanceof Error ? error.name : String((error as { name?: string })?.name || '');

  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    if (isLikelyEmbeddedBrowser()) {
      return `${getEmbeddedBrowserCameraHint()} Nếu đã cấp quyền nhưng vẫn lỗi, hãy đóng ứng dụng nhúng rồi mở lại bằng trình duyệt hệ thống.`;
    }
    return 'Bạn đã từ chối quyền camera. Hãy bật lại quyền camera trong trình duyệt rồi thử lại.';
  }

  if (errorName === 'NotFoundError') {
    return 'Không tìm thấy camera trên thiết bị.';
  }

  if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
    return 'Camera đang được ứng dụng khác sử dụng hoặc không thể khởi động.';
  }

  if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
    return 'Thiết bị không đáp ứng cấu hình camera yêu cầu. Hệ thống đã thử fallback nhưng vẫn thất bại.';
  }

  if (errorName === 'NotSupportedError') {
    if (isLikelyEmbeddedBrowser()) {
      return getEmbeddedBrowserCameraHint();
    }
    return 'Thiết bị hoặc trình duyệt chưa hỗ trợ camera cho tác vụ này. Hãy dùng Chrome/Safari/Edge bản mới.';
  }

  if (error instanceof Error && error.message) {
    if (error.message.toLowerCase().includes('secure') || error.message.includes('HTTPS')) {
      return 'Camera yêu cầu kết nối bảo mật HTTPS hoặc localhost. Vui lòng mở lại đúng đường dẫn bảo mật.';
    }
    return error.message;
  }

  return 'Không truy cập được camera.';
}
