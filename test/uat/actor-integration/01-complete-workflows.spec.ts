import { test, expect } from '@playwright/test'
import { TeacherHelper } from '../helpers/teacher.helper'
import { AdminHelper } from '../helpers/admin.helper'
import { StudentHelper } from '../helpers/student.helper'

async function createApprovedActivityForStudent(studentPage: any, teacherPage: any, adminPage: any) {
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
  const title = `UAT Integration ${unique}`
  const minute = String(unique % 60).padStart(2, '0')

  const createRes = await teacherPage.request.post('http://127.0.0.1:3000/api/activities', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Full happy path UAT',
      date_time: `2027-01-08T10:${minute}`,
      location: 'Room INT-301',
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
      data: { notes: 'Approved for integration UAT' },
    }
  )
  expect(approveRes.ok()).toBeTruthy()

  return { activityId, title, studentId }
}

test.describe('Integration - Complete backbone workflows', () => {
  test('teacher -> admin -> student -> QR attendance -> evaluation happy path', async ({ browser }) => {
    test.setTimeout(90_000)
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

    const { activityId, title, studentId } = await createApprovedActivityForStudent(
      studentPage,
      teacherPage,
      adminPage
    )

    const registerRes = await studentPage.request.post(
      `http://127.0.0.1:3000/api/activities/${activityId}/register`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {},
      }
    )
    expect(registerRes.ok()).toBeTruthy()

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

    const studentScanRes = await studentPage.request.post('http://127.0.0.1:3000/api/attendance/validate', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        session_id: sessionId,
        qr_token: sessionToken,
      },
    })
    expect(studentScanRes.ok()).toBeTruthy()

    const participantsRes = await teacherPage.request.get(
      `http://127.0.0.1:3000/api/teacher/activities/${activityId}/participants`
    )
    expect(participantsRes.ok()).toBeTruthy()
    const participantsData = await participantsRes.json()
    const participant = (participantsData?.data ?? participantsData?.participants ?? []).find(
      (row: any) => Number(row.student_id) === Number(studentId)
    )
    expect(participant?.id).toBeTruthy()

    const evaluateRes = await teacherPage.request.post(
      `http://127.0.0.1:3000/api/teacher/activities/${activityId}/evaluate`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          evaluations: [
            {
              participation_id: participant.id,
              achievement_level: 'excellent',
              feedback: 'Happy path passed',
            },
          ],
        },
      }
    )
    expect(evaluateRes.ok()).toBeTruthy()

    const attendanceRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/activities/${activityId}/attendance`)
    expect(attendanceRes.ok()).toBeTruthy()
    const attendanceData = await attendanceRes.json()
    const records = attendanceData?.data?.records ?? attendanceData?.records ?? []
    const record = records.find((row: any) => Number(row.student_id) === Number(studentId))
    expect(record).toBeTruthy()
    expect(String(record?.status)).toBe('present')

    const statsRes = await studentPage.request.get('http://127.0.0.1:3000/api/student/statistics')
    expect(statsRes.ok()).toBeTruthy()
    const statsData = await statsRes.json()
    const statistics = statsData?.statistics ?? statsData?.data?.statistics ?? statsData?.data
    expect(Number(statistics?.totalScore ?? 0)).toBeGreaterThan(0)
    expect(Number(statistics?.attendedActivities ?? 0)).toBeGreaterThan(0)

    const notificationsRes = await studentPage.request.get('http://127.0.0.1:3000/api/notifications?per_page=20')
    expect(notificationsRes.ok()).toBeTruthy()
    const notificationsData = await notificationsRes.json()
    const notifications = notificationsData?.data?.notifications ?? notificationsData?.notifications ?? []
    const achievementNotification = notifications.find(
      (row: any) => row.type === 'achievement' && String(row.message).includes(title)
    )
    expect(achievementNotification).toBeTruthy()

    await studentContext.close()
    await adminContext.close()
    await teacherContext.close()
  })

  test('teacher -> admin -> student -> face attendance -> student visibility -> teacher report happy path', async ({ browser }) => {
    test.setTimeout(90_000)
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

    const { activityId, title, studentId } = await createApprovedActivityForStudent(
      studentPage,
      teacherPage,
      adminPage
    )

    const registerRes = await studentPage.request.post(
      `http://127.0.0.1:3000/api/activities/${activityId}/register`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {},
      }
    )
    expect(registerRes.ok()).toBeTruthy()

    const faceRes = await teacherPage.request.post('http://127.0.0.1:3000/api/attendance/face', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        activity_id: activityId,
        student_id: studentId,
        confidence_score: 0.91,
        upstream_verified: true,
        device_id: 'uat-integration-face',
      },
    })
    expect(faceRes.ok()).toBeTruthy()
    const faceData = await faceRes.json()
    expect(faceData?.data?.recorded).toBe(true)
    expect(faceData?.data?.method).toBe('face')

    const notificationsRes = await studentPage.request.get('http://127.0.0.1:3000/api/notifications?per_page=20')
    expect(notificationsRes.ok()).toBeTruthy()
    const notificationsData = await notificationsRes.json()
    const notifications = notificationsData?.data?.notifications ?? notificationsData?.notifications ?? []
    const faceNotification = notifications.find(
      (row: any) => row.title === 'Face attendance thành công' && String(row.message).includes(title)
    )
    expect(faceNotification).toBeTruthy()

    const historyRes = await studentPage.request.get('http://127.0.0.1:3000/api/student/history')
    expect(historyRes.ok()).toBeTruthy()
    const historyData = await historyRes.json()
    const history = historyData?.data?.history ?? historyData?.history ?? []
    const historyItem = history.find((row: any) => Number(row.activity_id) === Number(activityId))
    expect(historyItem?.attended).toBe(1)
    expect(historyItem?.attendance_method).toBe('face')

    const reportRes = await teacherPage.request.get('http://127.0.0.1:3000/api/teacher/reports/attendance/records')
    expect(reportRes.ok()).toBeTruthy()
    const reportData = await reportRes.json()
    const reportRecords = reportData?.data?.records ?? reportData?.records ?? []
    const reportRecord = reportRecords.find(
      (row: any) => Number(row.student_id) === Number(studentId) && String(row.activity_name) === title
    )
    expect(reportRecord).toBeTruthy()
    expect(reportRecord?.method).toBe('face')
    expect(reportRecord?.status).toBe('present')

    await studentContext.close()
    await adminContext.close()
    await teacherContext.close()
  })
})
