import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Real-time stats computed from Evaluation table, not pre-calculated StatsReport
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 })
  }
  const url = new URL(request.url)
  const courseIdStr = url.searchParams.get("courseId")

  try {
    if (session.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.userId },
        include: { courseTeachers: { include: { course: true } } },
      })

      if (!teacher) {
        return NextResponse.json({ code: 404, message: "教师信息不存在" }, { status: 404 })
      }

      const courseIds = teacher.courseTeachers.map(ct => ct.courseId)

      // Get all evaluations for these courses
      const evaluations = await prisma.evaluation.findMany({
        where: { courseId: { in: courseIds } },
        include: {
          student: { select: { id: true, name: true, studentNo: true } },
          course: { select: { id: true, name: true, code: true, coverColor: true } },
        },
        orderBy: { createdAt: "desc" },
      })

      // Compute real-time stats per course
      const courseDataMap = new Map<number, {
        course: { id: number; code: string; name: string; coverColor: string }
        evals: typeof evaluations
      }>()

      for (const courseId of courseIds) {
        const ct = teacher.courseTeachers.find(ct => ct.courseId === courseId)
        if (ct) {
          courseDataMap.set(courseId, {
            course: { id: ct.course.id, code: ct.course.code, name: ct.course.name, coverColor: ct.course.coverColor },
            evals: [],
          })
        }
      }

      for (const e of evaluations) {
        const entry = courseDataMap.get(e.course.id)
        if (entry) entry.evals.push(e)
      }

      // Build dashboard data
      const dimKeys = ["content", "attitude", "method", "exam", "overall"] as const
      const dimLabels: Record<string, string> = { content: "教学内容", attitude: "教学态度", method: "教学方法", exam: "考核方式", overall: "综合满意度" }
      const dimMap = { content: "scoreContent", attitude: "scoreAttitude", method: "scoreMethod", exam: "scoreExam", overall: "scoreOverall" } as const

      function calcStats(scores: number[]) {
        const n = scores.length
        if (n === 0) return { avgScore: 0, median: 0, stdDev: 0, maxScore: 0, minScore: 0, evalCount: 0, scoreDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
        const mean = scores.reduce((a, b) => a + b, 0) / n
        const sorted = [...scores].sort((a, b) => a - b)
        const m = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
        const vari = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / n
        const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        for (const s of scores) dist[s] = (dist[s] || 0) + 1
        return {
          avgScore: Math.round(mean * 100) / 100,
          median: Math.round(m * 100) / 100,
          stdDev: Math.round(Math.sqrt(vari) * 100) / 100,
          maxScore: Math.max(...scores),
          minScore: Math.min(...scores),
          evalCount: n,
          scoreDist: dist,
        }
      }

      const courses = Array.from(courseDataMap.entries()).map(([courseId, data]) => {
        const evals = data.evals
        const dimensions: Record<string, any> = {}
        for (const dim of dimKeys) {
          const field = dimMap[dim]
          const scores = evals.map(e => (e as any)[field] as number)
          dimensions[dim] = { ...calcStats(scores), wordCloud: [] }
        }
        return { course: data.course, dimensions }
      })

      const allOverall = courses.map(c => c.dimensions.overall).filter(d => d.evalCount > 0)
      const totalEvalCount = evaluations.length

      return NextResponse.json({
        code: 200,
        data: {
          courses,
          evaluations,
          summary: {
            totalCourses: courses.length,
            totalEvalCount,
            overallAvg: totalEvalCount > 0
              ? Math.round(allOverall.reduce((s, d) => s + d.avgScore * d.evalCount, 0) / allOverall.reduce((s, d) => s + d.evalCount, 0) * 100) / 100
              : 0,
          },
        },
      })
    }

    if (session.role === "ADMIN") {
      const evaluations = await prisma.evaluation.findMany({
        include: {
          student: { select: { id: true, name: true, studentNo: true } },
          course: { select: { id: true, name: true, code: true, coverColor: true, college: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })

      const courses = await prisma.course.findMany({
        include: {
          courseTeachers: { include: { teacher: { include: { user: { select: { name: true } } } } } },
        },
      })

      // Real-time course stats computed from evaluations
      const courseEvalMap = new Map<number, { total: number; count: number }>()
      for (const e of evaluations) {
        const entry = courseEvalMap.get(e.course.id) || { total: 0, count: 0 }
        entry.total += e.avgScore
        entry.count++
        courseEvalMap.set(e.course.id, entry)
      }

      const courseDashboards = courses.map(c => {
        const stats = courseEvalMap.get(c.id)
        const avgScore = stats ? Math.round(stats.total / stats.count * 100) / 100 : 0
        const evalCount = stats ? stats.count : 0
        return {
          course: {
            id: c.id, code: c.code, name: c.name, coverColor: c.coverColor, college: c.college,
            teachers: c.courseTeachers.map(ct => ({
              id: ct.teacher.id,
              name: ct.teacher.user.name,
              title: ct.teacher.title,
            })),
          },
          dimensions: {
            overall: { avgScore, evalCount },
          },
        }
      })

      return NextResponse.json({
        code: 200,
        data: {
          courses: courseDashboards,
          evaluations,
          summary: {
            totalCourses: courses.length,
            totalEvalCount: evaluations.length,
          },
        },
      })
    }

    if (session.role === "STUDENT") {
      // If courseId is provided, return that course's public evaluations
      if (courseIdStr) {
        const courseId = parseInt(courseIdStr)
        const evaluations = await prisma.evaluation.findMany({
          where: { courseId },
          include: {
            student: { select: { id: true, name: true, studentNo: true } },
            course: { select: { id: true, name: true, code: true, coverColor: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        const course = await prisma.course.findUnique({
          where: { id: courseId },
          include: { courseTeachers: { include: { teacher: { include: { user: { select: { name: true } } } } } } },
        })
        const dimData: any = {}
        if (evaluations.length > 0) {
          const avgScores = evaluations.map(e => e.avgScore)
          dimData.overall = {
            avgScore: Math.round(avgScores.reduce((a: number, b: number) => a + b, 0) / avgScores.length * 100) / 100,
            evalCount: evaluations.length,
          }
        } else {
          dimData.overall = { avgScore: 0, evalCount: 0 }
        }
        return NextResponse.json({
          code: 200,
          data: {
            courses: course ? [{
              course: course ? {
                id: course.id, code: course.code, name: course.name, coverColor: course.coverColor, college: course.college,
                teachers: course.courseTeachers.map(ct => ({ id: ct.teacher.id, name: ct.teacher.user.name, title: ct.teacher.title })),
              } : null,
              dimensions: dimData,
            }] : [],
            evaluations,
          },
        })
      }

      const myEvals = await prisma.evaluation.findMany({
        where: { studentId: session.userId },
        include: {
          course: { select: { id: true, code: true, name: true, semester: true, coverColor: true } },
        },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json({
        code: 200,
        data: { myEvaluations: myEvals },
      })
    }

    return NextResponse.json({ code: 403, message: "权限不足" }, { status: 403 })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json({ code: 500, message: "服务器内部错误" }, { status: 500 })
  }
}
