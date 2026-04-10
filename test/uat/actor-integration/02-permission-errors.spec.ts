import { test, expect } from '@playwright/test'
import { TeacherHelper } from '../helpers/teacher.helper'
import { StudentHelper } from '../helpers/student.helper'

test.describe('Integration - Permission and guard errors', () => {
  test('unauthorized role access is blocked', async ({ browser }) => {
    const anonymousContext = await browser.newContext()
    const anonymousPage = await anonymousContext.newPage()

    const teacherContext = await browser.newContext()
    const teacherPage = await teacherContext.newPage()
    const teacher = new TeacherHelper(teacherPage)
    await teacher.login()

    const studentContext = await browser.newContext()
    const studentPage = await studentContext.newPage()
    const student = new StudentHelper(studentPage)
    await student.login()

    const anonAdminRes = await anonymousPage.request.get('http://127.0.0.1:3000/api/admin/activities/pending')
    expect([401, 403]).toContain(anonAdminRes.status())

    const teacherAdminRes = await teacherPage.request.get('http://127.0.0.1:3000/api/admin/users')
    expect(teacherAdminRes.status()).toBe(403)

    const studentTeacherRes = await studentPage.request.get('http://127.0.0.1:3000/api/teacher/classes')
    expect([401, 403]).toContain(studentTeacherRes.status())

    const studentAdminApproveRes = await studentPage.request.post(
      'http://127.0.0.1:3000/api/activities/1/approve',
      {
        headers: { 'Content-Type': 'application/json' },
        data: { notes: 'should be blocked' },
      }
    )
    expect([401, 403]).toContain(studentAdminApproveRes.status())

    await studentContext.close()
    await teacherContext.close()
    await anonymousContext.close()
  })
})
