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
  const title = `UAT Face Route ${unique}`
  const minute = String(unique % 60).padStart(2, '0')

  const createRes = await teacherPage.request.post('http://127.0.0.1:3000/api/activities', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Published by UAT for face attendance route',
      date_time: `2027-01-05T13:${minute}`,
      location: 'Room FACE-301',
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
      data: { notes: 'Approved for face attendance route UAT' },
    }
  )
  expect(approveRes.ok()).toBeTruthy()

  const addClassRes = await teacherPage.request.post(
    `http://127.0.0.1:3000/api/activities/${activityId}/participants/add-class`,
    {
      headers: { 'Content-Type': 'application/json' },
      data: { class_id: classId },
    }
  )
  expect(addClassRes.ok()).toBeTruthy()

  return { activityId, classId, title }
}

test.describe('Teacher - face attendance route', () => {
  test('teacher gets fallback guidance on low confidence, then records face attendance successfully', async ({ browser }) => {
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

    const { activityId } = await createApprovedMandatoryPilotActivity(studentPage, teacherPage, adminPage)

    const meRes = await studentPage.request.get('http://127.0.0.1:3000/api/auth/me')
    expect(meRes.ok()).toBeTruthy()
    const meData = await meRes.json()
    const studentId = meData?.data?.user?.id ?? meData?.user?.id
    expect(studentId).toBeTruthy()

    const lowConfidenceRes = await teacherPage.request.post('http://127.0.0.1:3000/api/attendance/face', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        activity_id: activityId,
        student_id: studentId,
        confidence_score: 0.6,
        upstream_verified: true,
        device_id: 'uat-cam-low',
      },
    })
    expect(lowConfidenceRes.status()).toBe(409)
    const lowConfidenceData = await lowConfidenceRes.json()
    expect(lowConfidenceData?.code).toBe('FACE_LOW_CONFIDENCE')
    expect(lowConfidenceData?.details?.recommended_fallback).toBe('manual')

    const successRes = await teacherPage.request.post('http://127.0.0.1:3000/api/attendance/face', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        activity_id: activityId,
        student_id: studentId,
        confidence_score: 0.91,
        upstream_verified: true,
        device_id: 'uat-cam-high',
      },
    })
    expect(successRes.ok()).toBeTruthy()
    const successData = await successRes.json()
    expect(successData?.data?.recorded).toBe(true)
    expect(successData?.data?.method).toBe('face')
    expect(successData?.data?.student_id).toBe(studentId)

    const duplicateRes = await teacherPage.request.post('http://127.0.0.1:3000/api/attendance/face', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        activity_id: activityId,
        student_id: studentId,
        confidence_score: 0.95,
        upstream_verified: true,
        device_id: 'uat-cam-high',
      },
    })
    expect(duplicateRes.ok()).toBeTruthy()
    const duplicateData = await duplicateRes.json()
    expect(duplicateData?.data?.recorded).toBe(false)
    expect(duplicateData?.data?.already_recorded).toBe(true)
    expect(duplicateData?.data?.method).toBe('face')

    await studentContext.close()
    await adminContext.close()
    await teacherContext.close()
  })
})
