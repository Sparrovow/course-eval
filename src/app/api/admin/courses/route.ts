import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/admin/courses - Create a new course
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ code: 403, message: "仅管理员可操作" }, { status: 403 })
  }

  try {
    const { code, name, credits, college, semester, description, coverColor, teacherIds } = await request.json()

    if (!code || !name || !credits || !college || !semester) {
      return NextResponse.json({ code: 422, message: "请填写必填字段（编号、名称、学分、学院、学期）" }, { status: 422 })
    }

    // Check duplicate code
    const existing = await prisma.course.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ code: 409, message: `课程编号 ${code} 已存在` }, { status: 409 })
    }

    const course = await prisma.course.create({
      data: {
        code,
        name,
        credits: parseFloat(credits) || 3,
        college,
        semester,
        description: description || "",
        coverColor: coverColor || "#3B82F6",
      },
    })

    // Link teachers if provided
    if (teacherIds && Array.isArray(teacherIds) && teacherIds.length > 0) {
      for (const teacherId of teacherIds) {
        await prisma.courseTeacher.create({
          data: { courseId: course.id, teacherId: parseInt(teacherId) },
        })
      }
    }

    return NextResponse.json({ code: 200, message: "课程创建成功", data: course })
  } catch (error) {
    console.error("Create course error:", error)
    return NextResponse.json({ code: 500, message: "服务器内部错误" }, { status: 500 })
  }
}

// DELETE /api/admin/courses?id=X - Delete a course
export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ code: 403, message: "仅管理员可操作" }, { status: 403 })
  }

  const url = new URL(request.url)
  const idStr = url.searchParams.get("id")

  if (!idStr) {
    return NextResponse.json({ code: 422, message: "请提供课程ID" }, { status: 422 })
  }

  try {
    const courseId = parseInt(idStr)

    // Remove related data first
    await prisma.courseTeacher.deleteMany({ where: { courseId } })
    await prisma.enrollment.deleteMany({ where: { courseId } })
    await prisma.statsReport.deleteMany({ where: { courseId } })
    await prisma.evaluation.deleteMany({ where: { courseId } })
    await prisma.course.delete({ where: { id: courseId } })

    return NextResponse.json({ code: 200, message: "课程已删除" })
  } catch (error) {
    console.error("Delete course error:", error)
    return NextResponse.json({ code: 500, message: "删除失败" }, { status: 500 })
  }
}
