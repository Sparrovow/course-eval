import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 })
  }

  const url = new URL(request.url)
  const courseIdStr = url.searchParams.get("courseId")

  try {
    if (session.role === "TEACHER") {
      // Teacher dashboard - all stats for their courses
      const teacher = await prisma.teacher.findUnique({
        where: { userId: session.userId },
        include: {
          courseTeachers: {
            include: {
              course: true,
            },
          },
        },
      })

      if (!teacher) {
        return NextResponse.json({ code: 404, message: "教师信息不存在" }, { status: 404 })
      }

      const courseIds = teacher.courseTeachers.map(ct => ct.courseId)
      const stats = await prisma.statsReport.findMany({
        where: { courseId: { in: courseIds } },
        include: { course: { select: { id: true, code: true, name: true, coverColor: true } } },
      })

      // Build per-course dashboard data
      const dashboardMap = new Map<number, any>()
      for (const stat of stats) {
        if (!dashboardMap.has(stat.courseId)) {
          dashboardMap.set(stat.courseId, {
            course: stat.course,
            dimensions: {} as Record<string, any>,
          })
        }
        dashboardMap.get(stat.courseId)!.dimensions[stat.dimension] = {
          avgScore: stat.avgScore,
          median: stat.median,
          stdDev: stat.stdDev,
          maxScore: stat.maxScore,
          minScore: stat.minScore,
          evalCount: stat.evalCount,
          scoreDist: JSON.parse(stat.scoreDist),
          wordCloud: stat.wordCloud ? JSON.parse(stat.wordCloud) : [],
        }
      }

      const courseDashboards = Array.from(dashboardMap.values())

      // Total stats across all courses
      const allOverall = courseDashboards
        .map(d => d.dimensions.overall)
        .filter(Boolean)
      const totalEvalCount = allOverall.reduce((s, d) => s + d.evalCount, 0)

      return NextResponse.json({
        code: 200,
        data: {
          courses: courseDashboards,
          summary: {
            totalCourses: courseDashboards.length,
            totalEvalCount,
            overallAvg: totalEvalCount > 0
              ? Math.round(allOverall.reduce((s, d) => s + d.avgScore * d.evalCount, 0) / totalEvalCount * 100) / 100
              : 0,
          },
        },
      })
    }

    if (session.role === "ADMIN") {
      // Admin - can see all stats or filter by course
      const whereClause = courseIdStr ? { courseId: parseInt(courseIdStr) } : {}
      const stats = await prisma.statsReport.findMany({
        where: whereClause,
        include: { course: { select: { id: true, code: true, name: true, coverColor: true, college: true } } },
      })

      const dashboardMap = new Map<number, any>()
      for (const stat of stats) {
        if (!dashboardMap.has(stat.courseId)) {
          dashboardMap.set(stat.courseId, {
            course: stat.course,
            dimensions: {} as Record<string, any>,
          })
        }
        dashboardMap.get(stat.courseId)!.dimensions[stat.dimension] = {
          avgScore: stat.avgScore,
          median: stat.median,
          stdDev: stat.stdDev,
          maxScore: stat.maxScore,
          minScore: stat.minScore,
          evalCount: stat.evalCount,
          scoreDist: JSON.parse(stat.scoreDist),
          wordCloud: stat.wordCloud ? JSON.parse(stat.wordCloud) : [],
        }
      }

      const allCourses = Array.from(dashboardMap.values())
      const totalEvalCount = allCourses.reduce((s, d) => s + (d.dimensions.overall?.evalCount || 0), 0)

      // Also return all evaluations for admin
      const evaluations = courseIdStr
        ? await prisma.evaluation.findMany({
            where: { courseId: parseInt(courseIdStr) },
            include: {
              student: { select: { id: true, name: true, studentNo: true } },
              course: { select: { id: true, name: true, code: true } },
            },
            orderBy: { createdAt: "desc" },
          })
        : await prisma.evaluation.findMany({
            include: {
              student: { select: { id: true, name: true, studentNo: true } },
              course: { select: { id: true, name: true, code: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })

      return NextResponse.json({
        code: 200,
        data: {
          courses: allCourses,
          evaluations,
          summary: {
            totalCourses: allCourses.length,
            totalEvalCount,
          },
        },
      })
    }

    // Student - can only see their own eval history or a specific course's stats
    if (session.role === "STUDENT") {
      const myEvals = await prisma.evaluation.findMany({
        where: { studentId: session.userId },
        include: {
          course: { select: { id: true, code: true, name: true, semester: true, coverColor: true } },
        },
        orderBy: { createdAt: "desc" },
      })

      return NextResponse.json({
        code: 200,
        data: {
          myEvaluations: myEvals,
        },
      })
    }

    return NextResponse.json({ code: 403, message: "权限不足" }, { status: 403 })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json({ code: 500, message: "服务器内部错误" }, { status: 500 })
  }
}
