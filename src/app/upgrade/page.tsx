export default function UpgradePage() {
  return (
    <main className="mx-auto mt-10 max-w-2xl rounded-xl bg-white p-6 text-slate-900">
      <h1 className="mb-3 text-2xl font-semibold">Trang nâng cấp</h1>
      <p className="mb-3">Nội dung legacy đã được chuyển sang route Next.js để dễ bảo trì.</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Đồng bộ theo App Router</li>
        <li>Chuẩn hóa UTF-8 và mã nguồn TSX</li>
        <li>Sẵn sàng mở rộng theo nghiệp vụ hệ thống</li>
      </ul>
    </main>
  );
}
