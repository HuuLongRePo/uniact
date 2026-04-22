function isLikelyEmbeddedBrowser() {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent.toLowerCase();
  return /fban|fbav|instagram|zalo|line\/|micromessenger|wv\)|webview|snapchat|tiktok/.test(
    userAgent
  );
}

function isLikelyIOS() {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (/macintosh/.test(userAgent) && typeof window !== 'undefined' && 'ontouchend' in window)
  );
}

function isTrustedLocalHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  );
}

function isLikelyPrivateLanHost(hostname: string) {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function getEmbeddedBrowserCameraHint() {
  return 'Thiết bị đang mở trong trình duyệt nhúng của ứng dụng. Hãy mở liên kết bằng Chrome, Safari hoặc Edge để dùng camera ổn định.';
}

function getUnsupportedCameraApiHint() {
  if (isLikelyEmbeddedBrowser()) {
    return getEmbeddedBrowserCameraHint();
  }

  if (isLikelyIOS()) {
    return 'Thiết bị iOS hiện tại chưa cấp đầy đủ Camera API cho trang này. Hãy mở bằng Safari mới nhất và kiểm tra quyền camera.';
  }

  return 'Trình duyệt hiện tại không cung cấp Camera API đầy đủ. Hãy cập nhật Chrome, Safari hoặc Edge và mở trang ở trình duyệt hệ thống.';
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
    return `${getEmbeddedBrowserCameraHint()} Liên kết camera cần chạy trên HTTPS hoặc localhost.`;
  }

  if (isLikelyPrivateLanHost(hostname)) {
    return `Camera bị chặn vì địa chỉ hiện tại (${protocol}//${hostname}) chưa bảo mật. Với điện thoại, hãy dùng HTTPS (ví dụ tunnel) hoặc mở bằng localhost khi test trên máy.`;
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

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    throw new Error(getUnsupportedCameraApiHint());
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
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    if (isLikelyEmbeddedBrowser()) {
      return `${getEmbeddedBrowserCameraHint()} Nếu đã cấp quyền nhưng vẫn lỗi, hãy mở bằng trình duyệt hệ thống rồi thử lại.`;
    }
    return 'Bạn đã từ chối quyền camera. Hãy bật lại quyền camera trong trình duyệt rồi thử lại.';
  }

  if (errorName === 'NotFoundError') {
    return 'Không tìm thấy camera trên thiết bị.';
  }

  if (
    errorName === 'NotReadableError' ||
    errorName === 'TrackStartError' ||
    errorName === 'AbortError'
  ) {
    return 'Camera đang được ứng dụng khác sử dụng hoặc không thể khởi động. Hãy đóng app đang dùng camera rồi thử lại.';
  }

  if (errorName === 'OverconstrainedError' || errorName === 'ConstraintNotSatisfiedError') {
    return 'Thiết bị không đáp ứng cấu hình camera yêu cầu. Hệ thống đã thử fallback nhưng vẫn thất bại.';
  }

  if (errorName === 'NotSupportedError' || errorName === 'TypeError') {
    return getUnsupportedCameraApiHint();
  }

  if (
    errorMessage.includes('secure') ||
    errorMessage.includes('https') ||
    errorMessage.includes('insecure')
  ) {
    return getInsecureContextHint();
  }

  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('denied') ||
    errorMessage.includes('notallowed')
  ) {
    return 'Ứng dụng chưa có quyền camera. Hãy cấp quyền camera trong trình duyệt hoặc cài đặt thiết bị rồi thử lại.';
  }

  if (
    errorMessage.includes('getusermedia') ||
    errorMessage.includes('not supported') ||
    errorMessage.includes('unsupported')
  ) {
    return getUnsupportedCameraApiHint();
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Không truy cập được camera.';
}
