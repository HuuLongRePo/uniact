import { test, expect } from '@playwright/test'

test.describe('Teacher - Evaluation and scoring backbone', () => {
  test('skeleton: teacher evaluates participants', async ({ page }) => {
    test.skip(true, 'Rebuild evaluation flow after auditing scoring side effects')
    await page.goto('/teacher/activities')
    await expect(page.locator('body')).toBeVisible()
  })
})
