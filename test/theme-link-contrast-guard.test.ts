import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function loadGlobalCss() {
  const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
  return fs.readFileSync(cssPath, 'utf8');
}

describe('dark theme link contrast guards', () => {
  it('does not force a blanket dark-mode color on all links', () => {
    const css = loadGlobalCss();

    expect(css).not.toContain(":root[data-theme='dark'] a {");
    expect(css).toContain(":root[data-theme='dark'] a:not([class]),");
    expect(css).toContain(":root[data-theme='dark'] a[class=''] {");
  });

  it('keeps landing primary actions with explicit readable text color', () => {
    const css = loadGlobalCss();
    const primaryActionRule =
      css.match(
        /\.landing-action-primary,\s*[\s\S]*?\.landing-action-primary:focus-visible\s*{[\s\S]*?}/
      )?.[0] ?? '';
    const primaryActionHoverRule =
      css.match(/\.landing-action-primary:hover\s*{[\s\S]*?}/)?.[0] ?? '';

    expect(primaryActionRule).toContain('.landing-action-primary:link,');
    expect(primaryActionRule).toMatch(/color:\s*(var\(--app-action-primary-text\)|#f8fafc)\s*!important;/);
    expect(primaryActionRule).toMatch(
      /-webkit-text-fill-color:\s*(var\(--app-action-primary-text\)|#f8fafc)\s*!important;/
    );
    expect(primaryActionHoverRule).toContain('color: var(--app-action-primary-text) !important;');
  });

  it('enforces readable text for dark-mode button-like links and buttons', () => {
    const css = loadGlobalCss();

    expect(css).toContain(":root[data-theme='dark'] a.landing-action-primary,");
    expect(css).toContain(":root[data-theme='dark'] a.landing-action-primary:link,");
    expect(css).toContain(":root[data-theme='dark'] a.landing-action-primary:visited,");
    expect(css).toContain(":root[data-theme='dark'] a[class*='bg-blue-'][class*='text-white'],");
    expect(css).toContain(
      ":root[data-theme='dark'] button[class*='bg-blue-'][class*='text-white']:not(:disabled),"
    );
    expect(css).toContain(":root[data-theme='dark'] a[class*='text-white'],");
    expect(css).toContain(":root[data-theme='dark'] a[class*='text-white/'],");
    expect(css).toContain(":root[data-theme='dark'] button[class*='text-white']:not(:disabled),");
    expect(css).toContain(":root[data-theme='dark'] button[class*='text-white/']:not(:disabled),");
    expect(css).toContain(
      ":root[data-theme='dark'] [role='button'][class*='text-white']:not([aria-disabled='true']) {"
    );
    expect(css).toContain('filter: none !important;');
    expect(css).toContain('mix-blend-mode: normal !important;');
  });

  it('keeps the same readable guard when only system dark mode is active', () => {
    const css = loadGlobalCss();

    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(":root:not([data-theme='light']) a.landing-action-primary,");
    expect(css).toContain(":root:not([data-theme='light']) a.landing-action-primary:link,");
    expect(css).toContain(":root:not([data-theme='light']) a.landing-action-primary:visited,");
    expect(css).toContain(
      ":root:not([data-theme='light']) a[class*='bg-blue-'][class*='text-white'],"
    );
    expect(css).toContain(
      ":root:not([data-theme='light']) button[class*='bg-blue-'][class*='text-white']:not(:disabled),"
    );
    expect(css).toContain(":root:not([data-theme='light']) a[class*='text-white'],");
    expect(css).toContain(":root:not([data-theme='light']) a[class*='text-white/'],");
    expect(css).toContain(
      ":root:not([data-theme='light']) button[class*='text-white']:not(:disabled),"
    );
    expect(css).toContain(
      ":root:not([data-theme='light']) button[class*='text-white/']:not(:disabled),"
    );
    expect(css).toContain(":root:not([data-theme='light'])");
    expect(css).toContain(
      "[role='button'][class*='text-white']:not([aria-disabled='true']) {"
    );
  });
});
