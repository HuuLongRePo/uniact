import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function loadGlobalCss() {
  const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
  return fs.readFileSync(cssPath, 'utf8');
}

describe('app modal shell guards', () => {
  it('defines shared modal backdrop and panel primitives', () => {
    const css = loadGlobalCss();

    expect(css).toContain('.app-modal-backdrop {');
    expect(css).toContain('.app-modal-panel {');
    expect(css).toContain('.app-modal-panel-scroll {');
    expect(css).toContain('backdrop-filter: blur(10px);');
    expect(css).toContain('overflow-y: auto;');
  });

  it('keeps a dedicated dark-theme modal panel override', () => {
    const css = loadGlobalCss();

    expect(css).toContain(":root[data-theme='dark'] .app-modal-panel {");
    expect(css).toContain('rgba(15, 23, 42, 0.97)');
    expect(css).toContain('rgba(2, 6, 23, 0.52)');
  });
});
