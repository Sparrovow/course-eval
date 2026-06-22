import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 })
  }

  const courses = await prisma.course.findMany({
    include: {
      courseTeachers: {
        include: {
          teacher: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
      },
      evaluations: {
        select: { id: true, studentId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get enrollment status for student, teacher's own evaluation info for teacher
  let evaluatedCourseIds: number[] = []
  let enrolledCourseIds: number[] = []
  let teacherCourseIds: number[] = []

  if (session.role === "STUDENT") {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: session.userId },
      select: { courseId: true },
    })
    enrolledCourseIds = enrollments.map(e => e.courseId)

    const evaluations = await prisma.evaluation.findMany({
      where: { studentId: session.userId },
      select: { courseId: true },
    })
    evaluatedCourseIds = evaluations.map(e => e.courseId)
  } else if (session.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.userId },
      include: { courseTeachers: { select: { courseId: true } } },
    })
    if (teacher) {
      teacherCourseIds = teacher.courseTeachers.map(ct => ct.courseId)
    }
  }

  const enrichedCourses = courses.map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    credits: c.credits,
    college: c.college,
    semester: c.semester,
    description: c.description,
    coverColor: c.coverColor,
    teachers: c.courseTeachers.map(ct => ({
      id: ct.teacher.user.id,
      name: ct.teacher.user.name,
      title: ct.teacher.title,
    })),
    isEnrolled: enrolledCourseIds.includes(c.id),
    isEvaluated: evaluatedCourseIds.includes(c.id),
    isOwnCourse: teacherCourseIds.includes(c.id),
    evalCount: c.evaluations.length,
  }))

  return NextResponse.json({ code: 200, data: enrichedCourses })
}
