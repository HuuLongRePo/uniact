import { test, expect } from '@playwright/test'
import { StudentHelper } from '../helpers/student.helper'
import { TeacherHelper } from '../helpers/teacher.helper'
import { AdminHelper } from '../helpers/admin.helper'

async function createAndApproveActivity(browser: any) {
  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  const student = new StudentHelper(studentPage)
  await student.login()

  const studentClassesRes = await studentPage.request.get('http://127.0.0.1:3000/api/classes')
  expect(studentClassesRes.ok()).toBeTruthy()
  const studentClassesData = await studentClassesRes.json()
  const classId = studentClassesData?.data?.classes?.[0]?.id ?? studentClassesData?.classes?.[0]?.id
  expect(classId).toBeTruthy()
  await studentContext.close()

  const teacherContext = await browser.newContext()
  const teacherPage = await teacherContext.newPage()
  const teacher = new TeacherHelper(teacherPage)
  await teacher.login()

  const typesRes = await teacherPage.request.get('http://127.0.0.1:3000/api/activity-types')
  expect(typesRes.ok()).toBeTruthy()
  const typesData = await typesRes.json()
  const activityTypeId = typesData?.types?.[0]?.id ?? typesData?.activityTypes?.[0]?.id
  expect(activityTypeId).toBeTruthy()

  const levelsRes = await teacherPage.request.get('http://127.0.0.1:3000/api/organization-levels')
  expect(levelsRes.ok()).toBeTruthy()
  const levelsData = await levelsRes.json()
  const organizationLevelId = levelsData?.levels?.[0]?.id ?? levelsData?.organization_levels?.[0]?.id
  expect(organizationLevelId).toBeTruthy()

  const unique = Date.now()
  const title = `UAT Register ${unique}`
  const createRes = await teacherPage.request.post('http://127.0.0.1:3000/api/activities', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Published by UAT for student registration',
      date_time: '2026-12-31T09:00',
      location: 'Room REG-201',
      max_participants: 30,
      class_ids: [classId],
      activity_type_id: activityTypeId,
      organization_level_id: organizationLevelId,
      files: [],
      status: 'draft',
    },
  })
  expect(createRes.ok()).toBeTruthy()
  const createData = await createRes.json()
  const activityId = createData?.data?.activity?.id ?? createData?.activity?.id ?? createData?.id
  expect(activityId).toBeTruthy()

  const submitRes = await teacherPage.request.post(`http://127.0.0.1:3000/api/activities/${activityId}/submit-approval`, {
    headers: { 'Content-Type': 'application/json' },
    data: {},
  })
  expect(submitRes.ok()).toBeTruthy()

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  const admin = new AdminHelper(adminPage)
  await admin.login()

  const approveRes = await adminPage.request.post(`http://127.0.0.1:3000/api/activities/${activityId}/approve`, {
    headers: { 'Content-Type': 'application/json' },
    data: { notes: 'Approved for student registration UAT' },
  })
  expect(approveRes.ok()).toBeTruthy()

  await teacherContext.close()
  await adminContext.close()

  return { activityId, title }
}

test.describe('Student - Discovery and registration backbone', () => {
  test('student can log in, see a published activity, and register', async ({ browser }) => {
    const { activityId, title } = await createAndApproveActivity(browser)

    const studentContext = await browser.newContext()
    const studentPage = await studentContext.newPage()
    const student = new StudentHelper(studentPage)
    await student.login()

    await studentPage.goto('/student/activities')
    await studentPage.waitForLoadState('domcontentloaded')
    await expect(studentPage.locator('body')).toContainText(/Hoạt động|Activities/i)
    await expect(studentPage.locator('body')).toContainText(title)

    const registerRes = await studentPage.request.post(`http://127.0.0.1:3000/api/activities/${activityId}/register`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect(registerRes.ok()).toBeTruthy()

    const activityRes = await studentPage.request.get(`http://127.0.0.1:3000/api/activities/${activityId}`)
    expect(activityRes.ok()).toBeTruthy()
    const activityData = await activityRes.json()
    const activity = activityData?.data?.activity ?? activityData?.activity
    expect(activity?.is_registered).toBeTruthy()
    expect(activity?.registration_status).toBe('registered')

    await studentContext.close()
  })
})
