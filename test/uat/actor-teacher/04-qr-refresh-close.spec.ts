import { test, expect } from '@playwright/test'

test.describe('Teacher - QR session backbone', () => {
  test('skeleton: teacher creates and manages QR session', async ({ page }) => {
    test.skip(true, 'Rebuild QR lifecycle after validating QR routes and publish/approval prerequisites')
    await page.goto('/teacher/qr')
    await expect(page.locator('body')).toBeVisible()
  })
})
