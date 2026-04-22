import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function walkFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function routeExists(href: string) {
  const pathWithoutQuery = href.split('?')[0];
  const base = path.join(process.cwd(), 'src', 'app', ...pathWithoutQuery.split('/').filter(Boolean));
  return (
    fs.existsSync(path.join(base, 'page.tsx')) ||
    fs.existsSync(path.join(base, 'page.ts')) ||
    fs.existsSync(path.join(base, 'route.ts')) ||
    fs.existsSync(path.join(base, 'route.tsx'))
  );
}

describe('actor route integrity', () => {
  const actorRoots = ['admin', 'student', 'teacher'] as const;

  for (const actor of actorRoots) {
    const actorRoot = path.join(process.cwd(), 'src', 'app', actor);
    const actorFiles = walkFiles(actorRoot);

    it(`[${actor}] does not use generic dashboard redirects`, () => {
      const offenders = actorFiles.filter((filePath) => {
        const source = fs.readFileSync(filePath, 'utf8');
        return (
          source.includes("router.push('/dashboard')") || source.includes('router.push("/dashboard")')
        );
      });

      expect(offenders).toEqual([]);
    });

    it(`[${actor}] keeps static href links namespaced and resolvable`, () => {
      const hrefRegex = /href=["'](\/[^"']+)["']/g;
      const unresolved: string[] = [];
      const invalidNamespace: string[] = [];

      for (const filePath of actorFiles) {
        const source = fs.readFileSync(filePath, 'utf8');
        const hrefs = [...source.matchAll(hrefRegex)].map((match) => match[1]);

        for (const href of hrefs) {
          if (href.startsWith('/api/')) {
            continue;
          }

          if (href === '/login') {
            continue;
          }

          if (!href.startsWith(`/${actor}/`)) {
            invalidNamespace.push(`${path.relative(process.cwd(), filePath)} -> ${href}`);
            continue;
          }

          if (!routeExists(href)) {
            unresolved.push(`${path.relative(process.cwd(), filePath)} -> ${href}`);
          }
        }
      }

      expect(invalidNamespace).toEqual([]);
      expect(unresolved).toEqual([]);
    });
  }
});
