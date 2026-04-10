import { test, expect } from '@playwright/test'
import { TeacherHelper } from '../helpers/teacher.helper'
import { AdminHelper } from '../helpers/admin.helper'
import { StudentHelper } from '../helpers/student.helper'

async function createApprovedRegisteredAttendedActivity(studentPage: any, teacherPage: any, adminPage: any) {
  const studentMeRes = await studentPage.request.get('http://127.0.0.1:3000/api/auth/me')
  expect(studentMeRes.ok()).toBeTruthy()
  const studentMeData = await studentMeRes.json()
  const studentId = studentMeData?.data?.user?.id ?? studentMeData?.user?.id
  expect(studentId).toBeTruthy()

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
  const title = `UAT Evaluation ${unique}`
  const minute = String(unique % 60).padStart(2, '0')

  const createRes = await teacherPage.request.post('http://127.0.0.1:3000/api/activities', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Published by UAT for evaluation flow',
      date_time: `2027-01-06T10:${minute}`,
      location: 'Room EVA-301',
      max_participants: 30,
      class_ids: [],
      voluntary_class_ids: [classId],
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
      data: { notes: 'Approved for evaluation UAT' },
    }
  )
  expect(approveRes.ok()).toBeTruthy()

  const registerRes = await studentPage.request.post(
    `http://127.0.0.1:3000/api/activities/${activityId}/register`,
    {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    }
  )
  if (!registerRes.ok()) {
    const registerBody = await registerRes.text()
    const alreadyRegistered =
      registerRes.status() === 400 && /đã đăng ký hoạt động này rồi|da dang ky hoat dong nay roi/i.test(registerBody)
    if (!alreadyRegistered) {
      throw new Error(`Student register failed: ${registerRes.status()} ${registerBody}`)
    }
  }

  const participantsBeforeRes = await teacherPage.request.get(
    `http://127.0.0.1:3000/api/teacher/activities/${activityId}/participants`
  )
  expect(participantsBeforeRes.ok()).toBeTruthy()
  const participantsBeforeData = await participantsBeforeRes.json()
  const participationId = participantsBeforeData?.data?.[0]?.id ?? participantsBeforeData?.participants?.[0]?.id
  expect(participationId).toBeTruthy()

  const manualAttendanceRes = await teacherPage.request.post('http://127.0.0.1:3000/api/attendance/manual', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      activity_id: activityId,
      student_ids: [studentId],
      mark_as: 'attended',
    },
  })
  expect(manualAttendanceRes.ok()).toBeTruthy()

  return { activityId, participationId, studentId }
}

test.describe('Teacher - Evaluation and scoring backbone', () => {
  test('teacher evaluates an attended participant and scoring is persisted', async ({ browser }) => {
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

    const { activityId, participationId, studentId } = await createApprovedRegisteredAttendedActivity(
      studentPage,
      teacherPage,
      adminPage
    )

    const evaluateRes = await teacherPage.request.post(
      `http://127.0.0.1:3000/api/teacher/activities/${activityId}/evaluate`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          evaluations: [
            {
              participation_id: participationId,
              achievement_level: 'good',
              feedback: 'Ổn định',
            },
          ],
        },
      }
    )
    expect(evaluateRes.ok()).toBeTruthy()
    const evaluateData = await evaluateRes.json()
    const successRows = evaluateData?.data?.success ?? evaluateData?.success ?? []
    expect(successRows.length).toBe(1)
    expect(Number(successRows[0]?.participation_id)).toBe(participationId)
    expect(Number(successRows[0]?.student_id)).toBe(studentId)
    expect(Number(successRows[0]?.points ?? 0)).toBeGreaterThan(0)

    const participantsAfterRes = await teacherPage.request.get(
      `http://127.0.0.1:3000/api/teacher/activities/${activityId}/participants`
    )
    expect(participantsAfterRes.ok()).toBeTruthy()
    const participantsAfterData = await participantsAfterRes.json()
    const participant = (participantsAfterData?.data ?? participantsAfterData?.participants ?? []).find(
      (row: any) => Number(row.id) === participationId
    )
    expect(participant).toBeTruthy()
    expect(String(participant?.achievement_level)).toBe('good')
    expect(String(participant?.feedback)).toBe('Ổn định')

    await studentContext.close()
    await adminContext.close()
    await teacherContext.close()
  })
})
