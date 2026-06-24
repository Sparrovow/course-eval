import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ code: 403, message: "仅管理员可操作" }, { status: 403 })
  }

  try {
    const logs = await prisma.loginLog.findMany({
      include: { user: { select: { email: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ code: 200, data: logs })
  } catch (error) {
    console.error("Logs error:", error)
    return NextResponse.json({ code: 500, message: "服务器内部错误" }, { status: 500 })
  }
}
