export default function ConsentSettingsPage() {
  return (
    <main className="mx-auto mt-10 max-w-2xl rounded-xl bg-white p-6 text-slate-900">
      <h1 className="mb-3 text-2xl font-semibold">Cài đặt quyền riêng tư</h1>
      <p className="mb-4 text-sm">Thiết lập đồng ý sử dụng dữ liệu cho các tính năng hệ thống.</p>

      <form className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input defaultChecked type="checkbox" />
          Cho phép lưu tùy chọn phiên
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" />
          Cho phép phân tích ẩn danh
        </label>
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          type="button"
        >
          Lưu cài đặt
        </button>
      </form>
    </main>
  );
}
