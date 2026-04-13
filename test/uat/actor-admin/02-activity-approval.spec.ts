import { test, expect } from '@playwright/test'
import { AdminHelper } from '../helpers/admin.helper'
import { BASE_URL } from '../helpers/test-accounts'

test.describe('Admin - Activity approval backbone', () => {
  test('admin can log in and access approval queue', async ({ page }) => {
    const admin = new AdminHelper(page)
    await admin.login()
    await page.goto(`${BASE_URL}/admin/approvals`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/admin\/approvals/)
    await expect(page.locator('body')).toContainText(/duyệt|approval|phê duyệt|UniAct/i)
  })
})
