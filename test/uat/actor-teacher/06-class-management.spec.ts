import { test, expect } from '@playwright/test'

test.describe('Teacher - Class management backbone', () => {
  test('skeleton: teacher manages class roster', async ({ page }) => {
    test.skip(true, 'Rebuild class management flow after validating teacher/classes APIs')
    await page.goto('/teacher/classes')
    await expect(page.getByTestId('classes-heading')).toBeVisible()
  })
})
