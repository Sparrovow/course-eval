import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/admin/evaluations?id=X - Delete an evaluation
export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ code: 403, message: "仅管理员可操作" }, { status: 403 })
  }

  const url = new URL(request.url)
  const idStr = url.searchParams.get("id")

  if (!idStr) {
    return NextResponse.json({ code: 422, message: "请提供评价ID" }, { status: 422 })
  }

  try {
    const evalId = parseInt(idStr)
    await prisma.evaluation.delete({ where: { id: evalId } })

    // Also clean up stale StatsReport for this evaluation's course
    // Since we now use real-time stats, we can optionally delete stale reports
    // or leave them as historical data

    return NextResponse.json({ code: 200, message: "评价已删除" })
  } catch (error) {
    console.error("Delete evaluation error:", error)
    return NextResponse.json({ code: 500, message: "删除失败" }, { status: 500 })
  }
}
