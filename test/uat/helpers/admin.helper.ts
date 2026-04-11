import { Page, expect } from '@playwright/test'
import { loginAs } from './login.helper'

/**
 * Admin Helper Utilities
 * Functions specific to Admin role testing
 */

export class AdminHelper {
  constructor(private page: Page) {}

  /**
   * Login as Admin
   */
  async login() {
    return await loginAs(this.page, 'admin')
  }

  /**
   * Navigate to admin section
   */
  async goToDashboard() {
    await this.page.goto('/admin/dashboard')
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForSelector('[data-testid="dashboard-heading"]', { timeout: 15000 })
  }

  async goToUsers() {
    await this.page.click('a[href="/admin/users"]')
    await expect(this.page).toHaveURL(/\/admin\/users/)
  }

  async goToClasses() {
    await this.page.click('a[href="/admin/classes"]')
    await expect(this.page).toHaveURL(/\/admin\/classes/)
  }

  async goToApprovals() {
    await this.page.click('a[href="/admin/approvals"]')
    await expect(this.page).toHaveURL(/\/admin\/approvals/)
  }

  async goToReports() {
    await this.page.click('a[href*="/admin/reports"]')
    await expect(this.page).toHaveURL(/\/admin\/reports/)
  }

  async goToSettings() {
    await this.page.click('a[href="/admin/settings"]')
    await expect(this.page).toHaveURL(/\/admin\/settings/)
  }

  /**
   * User Management
   */
  async createUser(userData: {
    email: string
    name: string
    role: 'admin' | 'teacher' | 'student'
    password?: string
  }) {
    await this.goToUsers()
    await this.page.click('button:has-text("Tạo mới"), a:has-text("Tạo người dùng")')

    await this.page.fill('input[name="email"]', userData.email)
    await this.page.fill('input[name="name"]', userData.name)
    await this.page.selectOption('select[name="role"]', userData.role)

    if (userData.password) {
      await this.page.fill('input[name="password"]', userData.password)
    }

    await this.page.click('button[type="submit"]')
    await expect(this.page.locator('text=/success|thành công/i')).toBeVisible({ timeout: 5000 })
  }

  async searchUsers(query: string) {
    await this.goToUsers()
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="Tìm"]')
    await searchInput.fill(query)
    await this.page.waitForTimeout(1000) // Wait for debounce
  }

  async filterUsersByRole(role: 'admin' | 'teacher' | 'student') {
    await this.page.selectOption('select[name="role"]', role)
    await this.page.waitForTimeout(1000)
  }

  /**
   * Class Management
   */
  async createClass(classData: {
    name: string
    grade: string
    teacher_id?: number
  }) {
    await this.goToClasses()
    await this.page.click('button:has-text("Tạo lớp"), a:has-text("Tạo mới")')

    await this.page.fill('input[name="name"]', classData.name)
    await this.page.fill('input[name="grade"]', classData.grade)

    if (classData.teacher_id) {
      await this.page.selectOption('select[name="teacher_id"]', classData.teacher_id.toString())
    }

    await this.page.click('button[type="submit"]')
    await expect(this.page.locator('text=/success|thành công/i')).toBeVisible({ timeout: 5000 })
  }

  /**
   * Approval Workflow
   */
  async approveActivity(activityId: number) {
    await this.goToApprovals()
    const activityRow = this.page.locator(`tr:has-text("${activityId}"), [data-activity-id="${activityId}"]`)
    await activityRow.locator('button:has-text("Duyệt"), button:has-text("Approve")').click()

    const confirmButton = this.page.locator('button:has-text("Xác nhận"), button:has-text("Confirm")')
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }

    await expect(this.page.locator('text=/approved|đã duyệt/i')).toBeVisible({ timeout: 5000 })
  }

  async rejectActivity(activityId: number, reason?: string) {
    await this.goToApprovals()
    const activityRow = this.page.locator(`tr:has-text("${activityId}"), [data-activity-id="${activityId}"]`)
    await activityRow.locator('button:has-text("Từ chối"), button:has-text("Reject")').click()

    if (reason) {
      await this.page.fill('textarea[name="reason"]', reason)
    }

    await this.page.click('button:has-text("Xác nhận"), button[type="submit"]')
    await expect(this.page.locator('text=/rejected|từ chối/i')).toBeVisible({ timeout: 5000 })
  }

  /**
   * Reports
   */
  async exportReport(reportType: 'csv' | 'excel' | 'pdf') {
    const exportButton = this.page.locator(`button:has-text("Export"), button:has-text("Xuất"), a:has-text("${reportType.toUpperCase()}")`)

    const downloadPromise = this.page.waitForEvent('download')
    await exportButton.click()
    const download = await downloadPromise

    return download
  }

  /**
   * System Configuration
   */
  async updateSystemConfig(config: Record<string, any>) {
    await this.goToSettings()

    for (const [key, value] of Object.entries(config)) {
      const input = this.page.locator(`input[name="${key}"], select[name="${key}"]`)
      if (await input.getAttribute('type') === 'checkbox') {
        if (value) {
          await input.check()
        } else {
          await input.uncheck()
        }
      } else {
        await input.fill(value.toString())
      }
    }

    await this.page.click('button:has-text("Lưu"), button[type="submit"]')
    await expect(this.page.locator('text=/success|thành công/i')).toBeVisible({ timeout: 5000 })
  }

  /**
   * Database Operations
   */
  async triggerBackup() {
    await this.page.goto('/admin/backup')
    await this.page.click('button:has-text("Sao lưu"), button:has-text("Backup")')
    await expect(this.page.locator('text=/backup.*success|sao lưu.*thành công/i')).toBeVisible({ timeout: 10000 })
  }

  /**
   * Audit Logs
   */
  async viewAuditLogs(filters?: {
    userId?: number
    action?: string
    dateFrom?: string
    dateTo?: string
  }) {
    await this.page.goto('/admin/audit')

    if (filters) {
      if (filters.userId) {
        await this.page.fill('input[name="user_id"]', filters.userId.toString())
      }
      if (filters.action) {
        await this.page.selectOption('select[name="action"]', filters.action)
      }
      if (filters.dateFrom) {
        await this.page.fill('input[name="date_from"]', filters.dateFrom)
      }
      if (filters.dateTo) {
        await this.page.fill('input[name="date_to"]', filters.dateTo)
      }

      await this.page.click('button:has-text("Áp dụng"), button[type="submit"]')
      await this.page.waitForTimeout(1000)
    }
  }
}
