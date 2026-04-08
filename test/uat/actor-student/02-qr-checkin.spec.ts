import { test, expect } from '@playwright/test'

test.describe('Student - QR check-in backbone', () => {
  test('skeleton: student validates QR attendance', async ({ page }) => {
    test.skip(true, 'Rebuild QR check-in flow after validating session creation + seeded activity state')
    await page.goto('/student/activities')
    await expect(page.locator('body')).toBeVisible()
  })
})
