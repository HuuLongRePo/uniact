import { test, expect } from '@playwright/test'
import { TeacherHelper } from '../helpers/teacher.helper'
import { AdminHelper } from '../helpers/admin.helper'
import { StudentHelper } from '../helpers/student.helper'

async function createApprovedRegisteredActivity(studentPage: any, teacherPage: any, adminPage: any) {
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
  const title = `UAT QR ${unique}`
  const minute = String(unique % 60).padStart(2, '0')

  const createRes = await teacherPage.request.post('http://127.0.0.1:3000/api/activities', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Published by UAT for QR attendance',
      date_time: `2027-01-03T10:${minute}`,
      location: 'Room QR-301',
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
      data: { notes: 'Approved for QR UAT' },
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

  return { activityId, title }
}

test.describe('Teacher - QR session backbone', () => {
  test('teacher creates, observes, and closes a QR session', async ({ browser }) => {
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

    const { activityId } = await createApprovedRegisteredActivity(studentPage, teacherPage, adminPage)

    const createQrRes = await teacherPage.request.post('http://127.0.0.1:3000/api/qr-sessions', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        activity_id: activityId,
        expires_minutes: 5,
      },
    })
    expect(createQrRes.status()).toBe(201)
    const createQrData = await createQrRes.json()
    const sessionId = createQrData?.data?.session_id ?? createQrData?.session_id
    const sessionToken = createQrData?.data?.session_token ?? createQrData?.session_token
    expect(sessionId).toBeTruthy()
    expect(sessionToken).toBeTruthy()

    const historyRes = await teacherPage.request.get('http://127.0.0.1:3000/api/qr-sessions')
    expect(historyRes.ok()).toBeTruthy()
    const historyData = await historyRes.json()
    const sessions = historyData?.data?.sessions ?? historyData?.sessions ?? []
    const createdSession = sessions.find((s: any) => s.id === sessionId)
    expect(createdSession).toBeTruthy()
    expect(Number(createdSession?.activity_id)).toBe(activityId)

    const scansBeforeRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/qr-sessions/${sessionId}/scans`)
    expect(scansBeforeRes.ok()).toBeTruthy()
    const scansBeforeData = await scansBeforeRes.json()
    const scansBefore = scansBeforeData?.data?.scans ?? scansBeforeData?.scans ?? []
    expect(Array.isArray(scansBefore)).toBeTruthy()
    expect(scansBefore.length).toBe(0)

    const studentValidateRes = await studentPage.request.post('http://127.0.0.1:3000/api/attendance/validate', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        session_id: sessionId,
        qr_token: sessionToken,
      },
    })
    expect(studentValidateRes.ok()).toBeTruthy()

    const scansAfterRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/qr-sessions/${sessionId}/scans`)
    expect(scansAfterRes.ok()).toBeTruthy()
    const scansAfterData = await scansAfterRes.json()
    const scansAfter = scansAfterData?.data?.scans ?? scansAfterData?.scans ?? []
    expect(scansAfter.length).toBe(1)

    const endRes = await teacherPage.request.post(`http://127.0.0.1:3000/api/qr-sessions/${sessionId}/end`)
    expect(endRes.ok()).toBeTruthy()

    const historyAfterEndRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/activities/${activityId}/qr-sessions`)
    expect(historyAfterEndRes.ok()).toBeTruthy()
    const historyAfterEndData = await historyAfterEndRes.json()
    const activitySessions = historyAfterEndData?.data?.sessions ?? historyAfterEndData?.sessions ?? []
    const endedSession = activitySessions.find((s: any) => s.id === sessionId)
    expect(endedSession).toBeTruthy()
    expect(String(endedSession?.status)).toBe('ended')

    await studentContext.close()
    await adminContext.close()
    await teacherContext.close()
  })
})
