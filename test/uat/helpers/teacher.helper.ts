import { Page, expect } from '@playwright/test'
import { BASE_URL } from './test-accounts'
import { loginAs } from './login.helper'

/**
 * Teacher Helper - UI Interactions for Teacher Tests
 * Stable methods based on actual UI testids
 */
export class TeacherHelper {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  // Login as teacher
  async login() {
    return await loginAs(this.page, 'teacher')
  }

  // Dashboard navigation
  async goToDashboard() {
    await this.page.goto(`${BASE_URL}/teacher/dashboard`)
    // Wait for loading spinner to disappear if present
    const spinner = this.page.locator('.animate-spin').first()
    if (await spinner.isVisible().catch(() => false)) {
      await spinner.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {})
    }
    await expect(this.page.locator('[data-testid="dashboard-heading"]')).toBeVisible()
  }

  // Activities navigation
  async goToActivities() {
    await this.page.goto(`${BASE_URL}/teacher/activities`)
    await expect(this.page.locator('[data-testid="activities-heading"]')).toBeVisible()
  }

  // Get activity card by title
  async findActivityByTitle(title: string) {
    const rows = await this.page.locator('[data-testid^="activity-card-"]').all()
    for (const row of rows) {
      if ((await row.textContent())?.includes(title)) {
        return row
      }
    }
    return null
  }

  // Create new activity
  async createNewActivity() {
    const btn = this.page.locator('[data-testid="btn-create-activity"]')
    await expect(btn).toBeVisible()
    await btn.click()
    const createDialogHeading = this.page
      .locator('text=/Tạo hoạt động mới|Tao hoat dong moi|Chỉnh sửa hoạt động|Chinh sua hoat dong/i')
      .first()
    const dialogVisible = await createDialogHeading.isVisible({ timeout: 3000 }).catch(() => false)
    if (dialogVisible) {
      return
    }

    await this.page.waitForURL(/\/(teacher\/activities\/new|activities\/new)/)
  }

  // Fill activity form
  async fillActivityForm(data: {
    title: string
    description: string
    location: string
    date?: string // ISO-like: YYYY-MM-DDTHH:mm or YYYY-MM-DD
    maxParticipants?: string
  }) {
    // Title
    await this.page.locator('input[name="title"], input[placeholder*="Tiêu đề"], input[type="text"]').first().fill(data.title)

    // Description
    const descField = this.page.locator('textarea[name="description"], textarea, input[name="description"]').first()
    if (await descField.isVisible()) {
      await descField.fill(data.description)
    }

    // Location
    const locField = this.page.locator('input[name="location"], input[placeholder*="Địa điểm"], input[type="text"]').nth(1)
    if (await locField.isVisible()) {
      await locField.fill(data.location)
    }

    // Date/Time (if provided)
    if (data.date) {
      const [datePart, timePart] = data.date.includes('T') ? data.date.split('T') : [data.date, '']
      const dateInput = this.page.locator('input[type="date"]').first()
      if (await dateInput.isVisible()) {
        await dateInput.fill(datePart)
      }
      const timeInput = this.page.locator('input[type="time"]').first()
      if (timePart && await timeInput.isVisible()) {
        await timeInput.fill(timePart)
      }
    }

    // Classes (select first option to satisfy required)
    const classSelect = this.page.locator('select[multiple]')
    if (await classSelect.isVisible()) {
      const firstOption = classSelect.locator('option').first()
      const val = await firstOption.getAttribute('value')
      if (val) {
        await classSelect.selectOption([val])
      }
    }

    // Max Participants (if provided)
    if (data.maxParticipants) {
      const maxField = this.page.locator('input[name="max_participants"], input[type="number"]').first()
      if (await maxField.isVisible()) {
        await maxField.fill(data.maxParticipants)
      }
    }
  }

  // Submit activity form
  async submitActivityForm() {
    const submitBtn = this.page
      .locator('button:has-text("Gửi duyệt"), button:has-text("Gui duyet"), button[type="submit"]')
      .first()
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()
  }

  // Save as draft
  async saveDraft() {
    const draftBtn = this.page
      .locator(
        'button:has-text("Lưu nháp"), button:has-text("Luu nhap"), button:has-text("Save draft"), button:has-text("Save Draft"), button:has-text("Draft")'
      )
      .first()
    if (await draftBtn.isVisible()) {
      await draftBtn.click()
      await this.page.waitForTimeout(500)
    }
  }

  // Submit for approval
  async submitForApproval(activityTitle?: string) {
    if (activityTitle) {
      await this.goToActivities()
      const card = await this.findActivityByTitle(activityTitle)
      if (card) {
        const submitBtn = card
          .locator(
            'button:has-text("Gửi duyệt"), button:has-text("Gui duyet"), button:has-text("Submit")'
          )
          .first()
        if (await submitBtn.isVisible()) {
          await submitBtn.click()
          // Handle confirmation if appears
          const confirmBtn = this.page.locator('button:has-text("Xác nhận"), button:has-text("Confirm")').first()
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click()
          }
          await this.page.waitForTimeout(500)
        }
      }
    }
  }

  // View activity detail
  async viewActivityDetail(activityId: number) {
    await this.page.goto(`${BASE_URL}/teacher/activities/${activityId}`)
    await this.page.waitForLoadState('networkidle')
  }

  // Mark attendance
  async markAttendance(studentName: string, status: 'present' | 'absent' | 'late') {
    const studentRow = await this.page.locator(`text="${studentName}"`).first().locator('../..')

    if (await studentRow.isVisible()) {
      const statusBtn = studentRow.locator(`button:has-text("${status}"), select`)
      if (await statusBtn.isVisible()) {
        await statusBtn.click()
        await this.page.waitForTimeout(300)
      }
    }
  }

  // Evaluate student
  async evaluateStudent(studentName: string, rating: string) {
    const studentRow = await this.page.locator(`text="${studentName}"`).first().locator('../..')

    if (await studentRow.isVisible()) {
      const ratingSelect = studentRow.locator('select[name="rating"], button:has-text("rating")')
      if (await ratingSelect.isVisible()) {
        await ratingSelect.click()
        const option = this.page.locator(`button:has-text("${rating}"), text="${rating}"`)
        if (await option.isVisible()) {
          await option.click()
        }
      }
    }
  }

  // View participants
  async viewParticipants(activityId: number) {
    await this.page.goto(`${BASE_URL}/teacher/activities/${activityId}/participants`)
    await this.page.waitForLoadState('networkidle')
  }

  // Access QR Code page
  async goToQRCode(activityId: number) {
    await this.page.goto(`${BASE_URL}/teacher/qr?activity_id=${activityId}`)
    await this.page.waitForLoadState('networkidle')
  }

  // Access attendance policy page
  async goToAttendancePolicy(activityId?: number) {
    const suffix = activityId ? `?activityId=${activityId}` : ''
    await this.page.goto(`${BASE_URL}/teacher/attendance/policy${suffix}`)
    await this.page.waitForLoadState('networkidle')
    await expect(this.page.locator('[data-testid="attendance-policy-heading"]')).toBeVisible()
  }

  // Verify dashboard stats visible
  async verifyDashboardStats() {
    await this.goToDashboard()
    const stats = ['stat-total-activities', 'stat-pending-activities', 'stat-published-activities', 'stat-total-participants']
    for (const stat of stats) {
      await expect(this.page.locator(`[data-testid="${stat}"]`)).toBeVisible()
    }
  }

  // Verify activities list visible
  async verifyActivitiesList() {
    await this.goToActivities()
    await expect(this.page.locator('[data-testid="activities-heading"]')).toBeVisible()
  }

  // Wait for success message
  async waitForSuccess(timeout = 5000) {
    const successMessages = [
      'text=/thành công|success|done/i',
      'text=/đã cập nhật|updated/i',
      'text=/đã tạo|created/i'
    ]

    for (const msg of successMessages) {
      const elem = this.page.locator(msg)
      if (await elem.isVisible({ timeout: 1000 }).catch(() => false)) {
        return
      }
    }
  }
}
