import { test, expect } from '@playwright/test'
import { TeacherHelper } from '../helpers/teacher.helper'
import { AdminHelper } from '../helpers/admin.helper'
import { StudentHelper } from '../helpers/student.helper'

async function createApprovedMandatoryPilotActivity(studentPage: any, teacherPage: any, adminPage: any) {
  const studentClassesRes = await studentPage.request.get('http://127.0.0.1:3000/api/classes')
  expect(studentClassesRes.ok()).toBeTruthy()
  const studentClassesData = await studentClassesRes.json()
  const classId = studentClassesData?.data?.classes?.[0]?.id ?? studentClassesData?.classes?.[0]?.id
  expect(classId).toBeTruthy()

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
  const title = `UAT Policy Pilot ${unique}`
  const minute = String(unique % 60).padStart(2, '0')

  const createRes = await teacherPage.request.post('http://127.0.0.1:3000/api/activities', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Published by UAT for attendance policy / face pilot',
      date_time: `2027-01-04T11:${minute}`,
      location: 'Room FP-301',
      max_participants: 120,
      class_ids: [],
      mandatory_class_ids: [classId],
      voluntary_class_ids: [],
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

  const submitRes = await teacherPage.request.post(
    `http://127.0.0.1:3000/api/activities/${activityId}/submit-approval`,
    {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    }
  )
  expect(submitRes.ok()).toBeTruthy()

  const approveRes = await adminPage.request.post(
    `http://127.0.0.1:3000/api/activities/${activityId}/approve`,
    {
      headers: { 'Content-Type': 'application/json' },
      data: { notes: 'Approved for attendance policy / face pilot UAT' },
    }
  )
  expect(approveRes.ok()).toBeTruthy()

  return { activityId, title }
}

test.describe('Teacher - attendance policy / face pilot', () => {
  test('teacher can inspect face-pilot eligibility and QR fallback recommendation', async ({ browser }) => {
    test.setTimeout(60_000)

    const teacherContext = await browser.newContext()
    const teacherPage = await teacherContext.newPage()
    const teacher = new TeacherHelper(teacherPage)
    await teacher.login()

    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const admin = new AdminHelper(adminPage)
    await admin.login()

    const studentContext = await browser.newContext()
    const studentPage = await studentContext.newPage()
    const student = new StudentHelper(studentPage)
    await student.login()

    const { activityId, title } = await createApprovedMandatoryPilotActivity(studentPage, teacherPage, adminPage)

    const policyRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/activities/${activityId}/attendance-policy`)
    expect(policyRes.ok()).toBeTruthy()
    const policyData = await policyRes.json()
    expect(policyData?.data?.policy?.facePilot?.eligible).toBe(true)
    expect(policyData?.data?.policy?.facePilot?.preferredPrimaryMethod).toBe('face')

    const fallbackRes = await teacherPage.request.post(
      `http://127.0.0.1:3000/api/activities/${activityId}/attendance-policy/fallback`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          responseTimeP95Ms: 1700,
          queueBacklog: 30,
          scanFailureRate: 0.2,
          sampleSize: 25,
        },
      }
    )
    expect(fallbackRes.ok()).toBeTruthy()
    const fallbackData = await fallbackRes.json()
    expect(fallbackData?.data?.fallback?.triggered).toBe(true)
    expect(fallbackData?.data?.fallback?.recommended_target_mode).toBe('mixed')

    await teacher.goToAttendancePolicy(activityId)
    await expect(teacherPage.locator(`button:has-text("${title}")`).first()).toBeVisible()
    await teacherPage.locator(`button:has-text("${title}")`).first().click()
    await expect(teacherPage.locator('[data-testid="face-pilot-eligibility"]')).toContainText('Eligible')

    const evaluateBtn = teacherPage.locator('button:has-text("Đánh giá fallback")').first()
    await expect(evaluateBtn).toBeVisible()
    await evaluateBtn.click()
    await expect(teacherPage.locator('[data-testid="fallback-status"]')).toContainText('Nên fallback')

    await studentContext.close()
    await adminContext.close()
    await teacherContext.close()
  })
})
