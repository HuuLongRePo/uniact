import { test, expect } from '@playwright/test'
import { TeacherHelper } from '../helpers/teacher.helper'

test.describe('Teacher - Activity CRUD backbone', () => {
  test('teacher can log in and access activities management', async ({ page }) => {
    const teacher = new TeacherHelper(page)
    await teacher.login()
    await page.goto('/teacher/activities')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/teacher\/activities/)
    await expect(page.locator('body')).toContainText(/UniAct|Hoạt động|giảng viên|Activities/i)
  })
})
