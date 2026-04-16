'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-white p-6 text-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Đã xảy ra lỗi hệ thống</h1>
            <p className="mt-3 text-sm text-gray-600">
              UniAct gặp lỗi không mong muốn. Vui lòng thử lại.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
