import { test, expect } from '@playwright/test'

test.describe('Student - Scoring and leaderboard', () => {
  test('skeleton: student views scores and ranking', async ({ page }) => {
    test.skip(true, 'Rebuild scoring flow after backbone attendance/evaluation is stable')
    await page.goto('/student')
    await expect(page.locator('body')).toBeVisible()
  })
})
