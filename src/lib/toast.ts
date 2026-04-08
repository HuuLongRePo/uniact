// Toast notification helper functions
// Sử dụng thay thế alert() và console.log()

import toastLib from 'react-hot-toast';

export const showToast = {
  /**
   * Hiển thị thông báo thành công
   */
  success: (message: string) => {
    toastLib.success(message);
  },

  /**
   * Hiển thị thông báo lỗi
   */
  error: (message: string) => {
    toastLib.error(message);
  },

  /**
   * Hiển thị thông báo loading
   */
  loading: (message: string) => {
    return toastLib.loading(message);
  },

  /**
   * Hiển thị thông báo info
   */
  info: (message: string) => {
    toastLib(message, {
      icon: 'ℹ️',
    });
  },

  /**
   * Hiển thị thông báo warning
   */
  warn: (message: string) => {
    toastLib(message, {
      icon: '⚠️',
    });
  },

  /**
   * Hiển thị promise toast (auto loading → success/error)
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toastLib.promise(promise, messages);
  },

  /**
   * Dismiss toast
   */
  dismiss: (toastId?: string) => {
    if (toastId) {
      toastLib.dismiss(toastId);
    } else {
      toastLib.dismiss();
    }
  },

  /**
   * Custom toast với options
   */
  custom: (message: string, options?: any) => {
    toastLib(message, options);
  },
};

// Export enhanced toast with all methods
export const toast = {
  success: showToast.success,
  error: showToast.error,
  loading: showToast.loading,
  warn: showToast.warn,
  info: showToast.info,
  promise: showToast.promise,
  dismiss: showToast.dismiss,
  custom: showToast.custom,
  // Pass-through original toast for direct usage
  show: toastLib,
};
//   saveData(),
//   {
//     loading: 'Đang lưu...',
//     success: 'Lưu thành công!',
//     error: 'Lỗi khi lưu'
//   }
// )
