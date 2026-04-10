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
  const title = `UAT Attendance ${unique}`
  const minute = String(unique % 60).padStart(2, '0')
  const createRes = await teacherPage.request.post('http://127.0.0.1:3000/api/activities', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Published by UAT for manual attendance',
      date_time: `2027-01-02T09:${minute}`,
      location: 'Room ATT-301',
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

  const submitRes = await teacherPage.request.post(`http://127.0.0.1:3000/api/activities/${activityId}/submit-approval`, {
    headers: { 'Content-Type': 'application/json' },
    data: {},
  })
  expect(submitRes.ok()).toBeTruthy()

  const approveRes = await adminPage.request.post(`http://127.0.0.1:3000/api/activities/${activityId}/approve`, {
    headers: { 'Content-Type': 'application/json' },
    data: { notes: 'Approved for manual attendance UAT' },
  })
  expect(approveRes.ok()).toBeTruthy()

  const registerRes = await studentPage.request.post(`http://127.0.0.1:3000/api/activities/${activityId}/register`, {
    headers: { 'Content-Type': 'application/json' },
    data: {},
  })
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

  return { activityId, title, studentId }
}

test.describe('Teacher - Manual attendance backbone', () => {
  test('teacher can mark a registered student as attended manually', async ({ browser }) => {
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

    const { activityId, studentId } = await createApprovedRegisteredActivity(studentPage, teacherPage, adminPage)

    const getListRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/attendance/manual?activity_id=${activityId}`)
    expect(getListRes.ok()).toBeTruthy()
    const getListData = await getListRes.json()
    const students = getListData?.data?.students ?? getListData?.students ?? []
    expect(Array.isArray(students)).toBeTruthy()
    expect(students.some((s: any) => s.user_id === studentId)).toBeTruthy()

    const postRes = await teacherPage.request.post('http://127.0.0.1:3000/api/attendance/manual', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        activity_id: activityId,
        student_ids: [studentId],
        achievements: {
          [studentId]: 'participated',
        },
      },
    })
    expect(postRes.ok()).toBeTruthy()

    const verifyRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/attendance/manual?activity_id=${activityId}`)
    expect(verifyRes.ok()).toBeTruthy()
    const verifyData = await verifyRes.json()
    const verifiedStudents = verifyData?.data?.students ?? verifyData?.students ?? []
    const matched = verifiedStudents.find((s: any) => s.user_id === studentId)
    expect(matched).toBeTruthy()
    expect(matched?.attendance_status).toBe('attended')
    expect(matched?.achievement_level).toBe('participated')

    await studentContext.close()
    await adminContext.close()
    await teacherContext.close()
  })
})
