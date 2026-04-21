import ClientProviders from '@/components/ClientProviders';
import './globals.css';

const THEME_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const storageKey = 'uniact-theme-preference';
    const root = document.documentElement;
    const savedPreference = localStorage.getItem(storageKey);
    const validPreference =
      savedPreference === 'light' || savedPreference === 'dark' || savedPreference === 'system'
        ? savedPreference
        : 'system';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedTheme =
      validPreference === 'system' ? (prefersDark ? 'dark' : 'light') : validPreference;
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-theme-preference', validPreference);
    root.style.colorScheme = resolvedTheme;
  } catch (error) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-theme-preference', 'system');
    document.documentElement.style.colorScheme = 'light';
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="font-sans">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
