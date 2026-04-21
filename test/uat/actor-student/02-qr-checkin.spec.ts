import { test, expect } from '@playwright/test'
import { TeacherHelper } from '../helpers/teacher.helper'
import { AdminHelper } from '../helpers/admin.helper'
import { StudentHelper } from '../helpers/student.helper'

async function createApprovedRegisteredQrSession(studentPage: any, teacherPage: any, adminPage: any) {
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
  const title = `UAT QR Checkin ${unique}`
  const minute = String(unique % 60).padStart(2, '0')

  const createRes = await teacherPage.request.post('http://127.0.0.1:3000/api/activities', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Published by UAT for student QR check-in',
      date_time: `2027-01-04T10:${minute}`,
      location: 'Room QR-302',
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
      data: { notes: 'Approved for QR check-in UAT' },
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

  const meRes = await studentPage.request.get('http://127.0.0.1:3000/api/auth/me')
  expect(meRes.ok()).toBeTruthy()
  const meData = await meRes.json()
  const studentId = meData?.data?.user?.id ?? meData?.user?.id
  expect(studentId).toBeTruthy()

  const qrRes = await teacherPage.request.post('http://127.0.0.1:3000/api/qr-sessions', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      activity_id: activityId,
      expires_minutes: 5,
    },
  })
  expect(qrRes.status()).toBe(201)
  const qrData = await qrRes.json()
  const sessionId = qrData?.data?.session_id ?? qrData?.session_id
  const sessionToken = qrData?.data?.session_token ?? qrData?.session_token
  expect(sessionId).toBeTruthy()
  expect(sessionToken).toBeTruthy()

  return { activityId, sessionId, sessionToken, studentId }
}

test.describe('Student - QR check-in backbone', () => {
  test('student validates QR attendance and duplicate scan stays idempotent', async ({ browser }) => {
    // Keep this actor-flow stable under local dev cold starts and SSE teardown overhead.
    test.setTimeout(120_000)
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

    const { activityId, sessionId, sessionToken, studentId } = await createApprovedRegisteredQrSession(
      studentPage,
      teacherPage,
      adminPage
    )

    const firstScanRes = await studentPage.request.post('http://127.0.0.1:3000/api/attendance/validate', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        session_id: sessionId,
        qr_token: sessionToken,
      },
    })
    expect(firstScanRes.ok()).toBeTruthy()
    const firstScanData = await firstScanRes.json()
    expect(firstScanData?.data?.recorded ?? firstScanData?.recorded).toBeTruthy()

    const duplicateScanRes = await studentPage.request.post('http://127.0.0.1:3000/api/attendance/validate', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        session_id: sessionId,
        qr_token: sessionToken,
      },
    })
    expect(duplicateScanRes.ok()).toBeTruthy()
    const duplicateScanData = await duplicateScanRes.json()
    expect(duplicateScanData?.data?.already_recorded ?? duplicateScanData?.already_recorded).toBeTruthy()

    const scansRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/qr-sessions/${sessionId}/scans`)
    expect(scansRes.ok()).toBeTruthy()
    const scansData = await scansRes.json()
    const scans = scansData?.data?.scans ?? scansData?.scans ?? []
    expect(scans.length).toBe(1)
    expect(Number(scans[0]?.student_id)).toBe(studentId)

    const attendanceRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/activities/${activityId}/attendance`)
    expect(attendanceRes.ok()).toBeTruthy()
    const attendanceData = await attendanceRes.json()
    const records = attendanceData?.data?.records ?? attendanceData?.records ?? []
    const matched = records.find((record: any) => Number(record.student_id) === studentId)
    expect(matched).toBeTruthy()
    expect(String(matched?.status)).toBe('present')

    await studentContext.close()
    await adminContext.close()
    await teacherContext.close()
  })
})
