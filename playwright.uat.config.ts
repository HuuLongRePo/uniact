import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000'

/**
 * Playwright Configuration for UAT (User Acceptance Testing)
 * Separate from E2E config for cleaner test organization
 */
export default defineConfig({
  testDir: './test/uat',
  
  // Test match patterns (actor-based structure)
  testMatch: [
    '**/actor-*/**/*.spec.ts',
    '**/api-contracts/**/*.spec.ts',
    '**/cross-actor/**/*.spec.ts'
  ],
  
  // Output directory for test artifacts
  outputDir: 'test-results/uat',
  
  // Timeout for each test
  timeout: 30 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000
  },
  
  // Run tests serially for stability in UAT
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests
  retries: process.env.CI ? 2 : 0,
  
  // Number of workers (force serial execution by default)
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report/uat' }],
    ['json', { outputFile: 'test-results/uat-results.json' }],
    ['list']
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL
    baseURL,
    
    // Collect trace when retrying failed tests
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Navigation timeout
    navigationTimeout: 10000,
    
    // Action timeout
    actionTimeout: 5000,
  },
  
  // Project configurations for different browsers and viewports
  projects: [
    // Restrict to Chromium desktop for UAT stability
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    }
  ],
  
  // Web server configuration (auto-start dev server)
  ...(process.env.PW_SKIP_WEBSERVER === '1'
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120 * 1000,
          stdout: 'ignore',
          stderr: 'pipe',
        },
      }),
})
