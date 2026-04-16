export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Không tìm thấy trang</h1>
        <p className="mt-3 text-sm text-gray-600">
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
        </p>
      </div>
    </div>
  );
}
