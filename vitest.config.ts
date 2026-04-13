import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    hookTimeout: 20000,
    testTimeout: 30000,
      setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**/*.spec.ts',
      '**/test/uat/**/*.spec.ts',
      '**/quarantine/**',
      '**/test-results/**',
      '**/.next/**',
      '**/test/error-boundary.test.tsx',
      '**/test/unit/connection-manager.test.js',
      '**/test/unit/quota-parser.test.js',
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
