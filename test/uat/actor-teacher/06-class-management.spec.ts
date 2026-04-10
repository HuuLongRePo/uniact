import { test, expect } from '@playwright/test'
import { TeacherHelper } from '../helpers/teacher.helper'
import { AdminHelper } from '../helpers/admin.helper'

test.describe('Teacher - Class management backbone', () => {
  test('teacher manages class roster', async ({ browser }) => {
    const teacherContext = await browser.newContext()
    const teacherPage = await teacherContext.newPage()
    const teacher = new TeacherHelper(teacherPage)
    await teacher.login()

    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const admin = new AdminHelper(adminPage)
    await admin.login()

    const classesRes = await teacherPage.request.get('http://127.0.0.1:3000/api/teacher/classes')
    expect(classesRes.ok()).toBeTruthy()
    const classesData = await classesRes.json()
    const classes = classesData?.data?.classes ?? classesData?.classes ?? []
    expect(classes.length).toBeGreaterThan(0)
    const classId = classes[0].id
    expect(classId).toBeTruthy()

    const beforeStudentsRes = await teacherPage.request.get(
      `http://127.0.0.1:3000/api/teacher/classes/${classId}/students`
    )
    expect(beforeStudentsRes.ok()).toBeTruthy()
    const beforeStudentsData = await beforeStudentsRes.json()
    const beforeStudents = beforeStudentsData?.data?.students ?? beforeStudentsData?.students ?? []
    const beforeCount = beforeStudents.length

    const unique = Date.now()
    const tempEmail = `temp.class.${unique}@school.edu`
    const createUserRes = await adminPage.request.post('http://127.0.0.1:3000/api/admin/users', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        email: tempEmail,
        password: 'student123',
        full_name: `Temp Class Student ${unique}`,
        role: 'student',
      },
    })
    expect(createUserRes.status()).toBe(201)
    const createUserData = await createUserRes.json()
    const studentId = createUserData?.data?.id
    expect(studentId).toBeTruthy()

    const addStudentRes = await teacherPage.request.post(
      `http://127.0.0.1:3000/api/teacher/classes/${classId}/students`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: { email: tempEmail },
      }
    )
    expect(addStudentRes.ok()).toBeTruthy()

    const afterAddRes = await teacherPage.request.get(
      `http://127.0.0.1:3000/api/teacher/classes/${classId}/students`
    )
    expect(afterAddRes.ok()).toBeTruthy()
    const afterAddData = await afterAddRes.json()
    const afterAddStudents = afterAddData?.data?.students ?? afterAddData?.students ?? []
    expect(afterAddStudents.length).toBe(beforeCount + 1)
    const addedStudent = afterAddStudents.find((row: any) => Number(row.id) === Number(studentId))
    expect(addedStudent).toBeTruthy()
    expect(String(addedStudent?.email)).toBe(tempEmail)

    const removeStudentRes = await teacherPage.request.delete(
      `http://127.0.0.1:3000/api/teacher/classes/${classId}/students/${studentId}`
    )
    expect(removeStudentRes.ok()).toBeTruthy()

    const afterRemoveRes = await teacherPage.request.get(
      `http://127.0.0.1:3000/api/teacher/classes/${classId}/students`
    )
    expect(afterRemoveRes.ok()).toBeTruthy()
    const afterRemoveData = await afterRemoveRes.json()
    const afterRemoveStudents = afterRemoveData?.data?.students ?? afterRemoveData?.students ?? []
    expect(afterRemoveStudents.length).toBe(beforeCount)
    const removedStudent = afterRemoveStudents.find((row: any) => Number(row.id) === Number(studentId))
    expect(removedStudent).toBeFalsy()

    await adminContext.close()
    await teacherContext.close()
  })
})
