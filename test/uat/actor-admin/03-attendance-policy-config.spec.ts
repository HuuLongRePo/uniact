import { test, expect } from '@playwright/test'
import { AdminHelper } from '../helpers/admin.helper'

test.describe('Admin - attendance policy config', () => {
  test('admin can open attendance policy config page from sidebar and inspect policy fields', async ({ page }) => {
    const admin = new AdminHelper(page)
    await admin.login()

    await page.goto('/admin/dashboard')
    await expect(page.locator('[data-testid="dashboard-heading"]')).toBeVisible()

    const policyLink = page.locator('a[href="/admin/system-config/attendance-policy"]').first()
    await expect(policyLink).toBeVisible()
    await policyLink.click()

    await expect(page).toHaveURL(/\/admin\/system-config\/attendance-policy/)
    await expect(page.locator('[data-testid="admin-attendance-policy-heading"]')).toBeVisible()
    await expect(page.getByText('Ngưỡng p95 response time (ms)', { exact: true })).toBeVisible()
    await expect(page.getByText('Cách chọn activity cho face pilot', { exact: true })).toBeVisible()
    await expect(page.getByText('Ngưỡng confidence tối thiểu', { exact: true }).first()).toBeVisible()
  })
})
