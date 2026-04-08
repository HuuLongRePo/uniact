import { Page, expect } from '@playwright/test'
import { loginAs } from './login.helper'

/**
 * Student Helper Utilities
 * Functions specific to Student role testing
 */

export class StudentHelper {
  constructor(private page: Page) {}

  /**
   * Login as Student
   */
  async login() {
    return await loginAs(this.page, 'student')
  }

  /**
   * Navigate to student sections
   */
  async goToActivities() {
    await this.page.click('a[href="/student/activities"]')
    await expect(this.page).toHaveURL(/\/student\/activities/)
  }

  async goToMyActivities() {
    await this.page.click('a[href="/student/my-activities"]')
    await expect(this.page).toHaveURL(/\/student\/my-activities/)
  }

  async goToScores() {
    await this.page.click('a[href="/student/scores"]')
    await expect(this.page).toHaveURL(/\/student\/scores/)
  }

  async goToRanking() {
    await this.page.click('a[href="/student/ranking"]')
    await expect(this.page).toHaveURL(/\/student\/ranking/)
  }

  async goToAwards() {
    await this.page.click('a[href="/student/awards"]')
    await expect(this.page).toHaveURL(/\/student\/awards/)
  }

  async goToNotifications() {
    await this.page.click('a[href="/student/notifications"]')
    await expect(this.page).toHaveURL(/\/student\/notifications/)
  }

  /**
   * Activity Discovery & Registration
   */
  async browseActivities() {
    await this.goToActivities()
    await expect(this.page.locator('h1, h2')).toContainText(/Activities|Hoạt động/i)
  }

  async searchActivities(query: string) {
    await this.goToActivities()
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="Tìm"]')
    await searchInput.fill(query)
    await this.page.waitForTimeout(1000) // Debounce
  }

  async filterActivitiesByType(typeId: number) {
    await this.page.selectOption('select[name="type_id"]', typeId.toString())
    await this.page.waitForTimeout(1000)
  }

  async filterActivitiesByDate(dateFrom?: string, dateTo?: string) {
    if (dateFrom) {
      await this.page.fill('input[name="date_from"]', dateFrom)
    }
    if (dateTo) {
      await this.page.fill('input[name="date_to"]', dateTo)
    }
    await this.page.click('button:has-text("Áp dụng"), button[type="submit"]')
    await this.page.waitForTimeout(1000)
  }

  async viewActivityDetail(activityId: number) {
    await this.page.goto(`/student/activities/${activityId}`)
    await expect(this.page.locator('h1, h2')).toBeVisible()
  }

  async registerForActivity(activityId: number) {
    await this.viewActivityDetail(activityId)
    await this.page.click('button:has-text("Đăng ký"), button:has-text("Register")')

    // Confirm if dialog appears
    const confirmButton = this.page.locator('button:has-text("Xác nhận"), button:has-text("Confirm")')
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }

    await expect(this.page.locator('text=/registered|đã đăng ký/i')).toBeVisible({ timeout: 5000 })
  }

  async unregisterFromActivity(activityId: number) {
    await this.viewActivityDetail(activityId)
    await this.page.click('button:has-text("Hủy đăng ký"), button:has-text("Unregister")')

    const confirmButton = this.page.locator('button:has-text("Xác nhận"), button:has-text("Confirm")')
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }

    await expect(this.page.locator('text=/unregistered|đã hủy/i')).toBeVisible({ timeout: 5000 })
  }

  /**
   * QR Check-in
   */
  async scanQRCode(qrToken: string) {
    // Navigate to QR scan page
    await this.page.goto('/student/qr-scan')

    // For testing, we'll submit token directly
    await this.page.fill('input[name="qr_token"], input[placeholder*="QR"]', qrToken)
    await this.page.click('button:has-text("Check-in"), button[type="submit"]')

    await expect(this.page.locator('text=/success|thành công/i')).toBeVisible({ timeout: 5000 })
  }

  async viewAttendanceHistory() {
    await this.page.goto('/student/history')
    await expect(this.page.locator('h1, h2')).toContainText(/History|Lịch sử/i)
  }

  /**
   * Scores & Points
   */
  async viewTotalPoints() {
    await this.page.goto('/student/statistics')
    const totalPoints = await this.page.locator('[data-testid="total-points"], .total-points').textContent()
    return totalPoints
  }

  async viewDetailedScores() {
    await this.goToScores()
    await expect(this.page.locator('table, .scores-table')).toBeVisible()
  }

  async viewPointsBreakdown() {
    await this.page.goto('/student/points-breakdown')
    await expect(this.page.locator('canvas, svg, [data-testid="chart"]')).toBeVisible({ timeout: 5000 })
  }

  async viewParticipationHistory() {
    await this.page.goto('/student/history')
    await expect(this.page.locator('table, .history-table')).toBeVisible()
  }

  /**
   * Ranking & Leaderboard
   */
  async viewLeaderboard() {
    await this.goToRanking()
    await expect(this.page.locator('table, .leaderboard')).toBeVisible()
  }

  async viewMyRank() {
    await this.goToRanking()
    const myRank = await this.page.locator('[data-testid="my-rank"], .my-rank').textContent()
    return myRank
  }

  async compareWithClass() {
    await this.page.goto('/student/class-comparison')
    await expect(this.page.locator('canvas, svg, [data-testid="chart"]')).toBeVisible({ timeout: 5000 })
  }

  /**
   * Awards & Achievements
   */
  async viewAwards() {
    await this.goToAwards()
    await expect(this.page.locator('h1, h2')).toContainText(/Awards|Khen thưởng/i)
  }

  async viewBadges() {
    await this.page.goto('/student/badges')
    const badgeCount = await this.page.locator('[data-testid="badge"], .badge').count()
    expect(badgeCount).toBeGreaterThanOrEqual(0)
  }

  /**
   * Notifications
   */
  async viewNotifications() {
    await this.goToNotifications()
    await expect(this.page.locator('h1, h2')).toContainText(/Notifications|Thông báo/i)
  }

  async markNotificationAsRead(notificationId: number) {
    const notificationItem = this.page.locator(`[data-notification-id="${notificationId}"]`)
    await notificationItem.click()

    // Should navigate to notification detail or mark as read
    await this.page.waitForTimeout(1000)
  }

  async markAllNotificationsAsRead() {
    await this.goToNotifications()
    const markAllButton = this.page.locator('button:has-text("Đánh dấu tất cả"), button:has-text("Mark all")')

    if (await markAllButton.isVisible()) {
      await markAllButton.click()
      await expect(this.page.locator('text=/marked|đã đánh dấu/i')).toBeVisible({ timeout: 3000 })
    }
  }

  /**
   * Polls
   */
  async viewPolls() {
    await this.page.goto('/student/polls')
    await expect(this.page.locator('h1, h2')).toContainText(/Polls|Khảo sát/i)
  }

  async votePoll(pollId: number, optionIndex: number) {
    await this.page.goto(`/student/polls/${pollId}`)

    const option = this.page.locator(`input[name="option"][value="${optionIndex}"]`)
    await option.check()

    await this.page.click('button[type="submit"]:has-text("Vote"), button[type="submit"]:has-text("Bình chọn")')
    await expect(this.page.locator('text=/voted|đã bình chọn/i')).toBeVisible({ timeout: 5000 })
  }

  /**
   * Profile
   */
  async viewProfile() {
    await this.page.goto('/student/profile')
    await expect(this.page.locator('h1, h2')).toContainText(/Profile|Hồ sơ/i)
  }

  async updateProfile(updates: {
    name?: string
    avatar?: string
    bio?: string
  }) {
    await this.viewProfile()
    await this.page.click('button:has-text("Chỉnh sửa"), button:has-text("Edit")')

    if (updates.name) {
      await this.page.fill('input[name="name"]', updates.name)
    }
    if (updates.bio) {
      await this.page.fill('textarea[name="bio"]', updates.bio)
    }

    await this.page.click('button[type="submit"]')
    await expect(this.page.locator('text=/updated|đã cập nhật/i')).toBeVisible({ timeout: 5000 })
  }
}
