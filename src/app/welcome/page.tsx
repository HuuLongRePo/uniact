import Link from 'next/link';

export default function WelcomePage() {
  return (
    <main className="mx-auto mt-10 max-w-2xl rounded-xl bg-white p-6 text-slate-900">
      <h1 className="mb-3 text-2xl font-semibold">Chào mừng đến với UniAct</h1>
      <p className="mb-3">Trang này đã được chuyển sang App Router để thống nhất kiến trúc Next.js.</p>
      <p className="text-sm">
        Tiếp tục đến{' '}
        <Link className="text-blue-600 hover:underline" href="/consent-settings">
          cài đặt quyền riêng tư
        </Link>{' '}
        hoặc{' '}
        <Link className="text-blue-600 hover:underline" href="/upgrade">
          nâng cấp
        </Link>
        .
      </p>
    </main>
  );
}
