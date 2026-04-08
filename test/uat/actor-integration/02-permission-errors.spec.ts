import { test, expect } from '@playwright/test'

test.describe('Integration - Permission and guard errors', () => {
  test('skeleton: unauthorized role access is blocked', async ({ page }) => {
    test.skip(true, 'Rebuild permission regression after validating guard behavior by actor')
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
  })
})
