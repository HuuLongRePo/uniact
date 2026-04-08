import { test, expect } from '@playwright/test'
import { AdminHelper } from '../helpers/admin.helper'

test.describe('Admin - User management backbone', () => {
  test('admin can log in and access user management page', async ({ page }) => {
    const admin = new AdminHelper(page)
    await admin.login()
    await page.goto('/admin/users')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.locator('body')).toContainText(/UniAct|Quản lý|người dùng|Users/i)
  })
})
