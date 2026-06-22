import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "STUDENT") {
    return NextResponse.json({ code: 403, message: "仅学生可提交评价" }, { status: 403 })
  }

  try {
    const { courseId, scores, comment, isAnonymous } = await request.json()

    if (!courseId || !scores || scores.length !== 5) {
      return NextResponse.json({ code: 422, message: "请完成所有维度的评分" }, { status: 422 })
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: session.userId, courseId } },
    })
    if (!enrollment) {
      return NextResponse.json({ code: 403, message: "您未选修该课程，无法评价" }, { status: 403 })
    }

    // Check duplicate
    const existing = await prisma.evaluation.findUnique({
      where: { studentId_courseId: { studentId: session.userId, courseId } },
    })
    if (existing) {
      return NextResponse.json({ code: 409, message: "您已对该课程进行过评价，不可重复提交" }, { status: 409 })
    }

    // Validate scores
    for (const s of scores) {
      if (s < 1 || s > 5) {
        return NextResponse.json({ code: 422, message: "评分范围为1-5分" }, { status: 422 })
      }
    }

    // Handle comment length
    const safeComment = comment ? comment.slice(0, 500) : ""

    const avg = scores.reduce((a: number, b: number) => a + b, 0) / 5

    const evaluation = await prisma.evaluation.create({
      data: {
        studentId: session.userId,
        courseId,
        scoreContent: scores[0],
        scoreAttitude: scores[1],
        scoreMethod: scores[2],
        scoreExam: scores[3],
        scoreOverall: scores[4],
        avgScore: Math.round(avg * 100) / 100,
        comment: safeComment,
        isAnonymous: isAnonymous || false,
      },
    })

    return NextResponse.json({
      code: 200,
      message: "评价提交成功",
      data: { evaluationId: evaluation.id },
    })
  } catch (error) {
    console.error("Submit evaluation error:", error)
    return NextResponse.json({ code: 500, message: "服务器内部错误" }, { status: 500 })
  }
}
