function isLikelyEmbeddedBrowser() {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();
  return /fban|fbav|instagram|zalo|line\/|micromessenger|wv\)|webview/.test(userAgent);
}

function isLikelyIOS() {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

function isTrustedLocalHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  );
}

function getEmbeddedBrowserCameraHint() {
  return 'Thiết bị đang mở trong trình duyệt nhúng của ứng dụng. Hãy mở liên kết bằng Chrome, Safari hoặc Edge để dùng camera ổn định.';
}

function getInsecureContextHint() {
  if (typeof window === 'undefined') {
    return 'Không thể truy cập camera trong môi trường hiện tại.';
  }

  const { protocol, hostname } = window.location;
  if (protocol === 'https:' || isTrustedLocalHost(hostname)) {
    return 'Không thể truy cập camera trong ngữ cảnh hiện tại.';
  }

  if (isLikelyEmbeddedBrowser()) {
    return getEmbeddedBrowserCameraHint();
  }

  return `Camera chỉ hoạt động trên kết nối bảo mật HTTPS hoặc localhost. Địa chỉ hiện tại (${protocol}//${hostname}) chưa bảo mật.`;
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
    throw new Error(getInsecureContextHint());
  }

  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error(
      isLikelyEmbeddedBrowser()
        ? getEmbeddedBrowserCameraHint()
        : 'Trình duyệt hiện tại chưa hỗ trợ camera đầy đủ. Hãy cập nhật Chrome, Safari hoặc Edge.'
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
      return `${getEmbeddedBrowserCameraHint()} Nếu đã cấp quyền nhưng vẫn lỗi, hãy mở bằng trình duyệt hệ thống rồi thử lại.`;
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
    if (isLikelyIOS()) {
      return 'Trình duyệt iOS hiện tại chưa hỗ trợ đầy đủ camera cho luồng này. Hãy mở bằng Safari mới nhất.';
    }
    return 'Thiết bị hoặc trình duyệt chưa hỗ trợ camera cho tác vụ này. Hãy dùng Chrome, Safari hoặc Edge bản mới.';
  }

  if (error instanceof Error && error.message) {
    const normalizedMessage = error.message.toLowerCase();
    if (
      normalizedMessage.includes('secure') ||
      normalizedMessage.includes('https') ||
      normalizedMessage.includes('insecure')
    ) {
      return getInsecureContextHint();
    }
    return error.message;
  }

  return 'Không truy cập được camera.';
}
