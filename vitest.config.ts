import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    hookTimeout: 20000,
    testTimeout: 30000,
      setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**/*.spec.ts',
      '**/test/uat/**/*.spec.ts',
      '**/backups/**',
      '**/old/**',
      '**/*.d.ts'
    ],
    sequence: {
      concurrent: false
    },
    globals: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
