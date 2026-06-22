import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, studentNo: true, teacherNo: true },
  })

  if (!user) {
    return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 })
  }

  return NextResponse.json({ code: 200, data: user })
}
