import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ code: 403, message: "仅管理员可操作" }, { status: 403 })
  }

  try {
    const { name, title, college, email, password } = await request.json()

    if (!name || !title || !college || !email || !password) {
      return NextResponse.json({ code: 422, message: "请填写所有必填字段" }, { status: 422 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ code: 409, message: "该邮箱已被使用" }, { status: 409 })
    }

    const hash = bcrypt.hashSync(password, 10)
    const teacherNo = "T" + String(Math.floor(Math.random() * 9000) + 1000)

    const user = await prisma.user.create({
      data: { email, password: hash, name, role: "TEACHER", teacherNo },
    })

    await prisma.teacher.create({
      data: { userId: user.id, title, college },
    })

    return NextResponse.json({
      code: 200,
      message: "教师创建成功",
      data: { id: user.id, name, email, title, college },
    })
  } catch (error) {
    console.error("Create teacher error:", error)
    return NextResponse.json({ code: 500, message: "服务器内部错误" }, { status: 500 })
  }
}
