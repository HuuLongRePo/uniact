import { test, expect } from '@playwright/test'

test.describe('Student - Awards and notifications', () => {
  test('skeleton: student views awards and notifications', async ({ page }) => {
    test.skip(true, 'Rebuild awards/notifications flow after P1 stabilization')
    await page.goto('/student/notifications')
    await expect(page.locator('body')).toBeVisible()
  })
})
