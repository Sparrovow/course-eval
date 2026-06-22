import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ code: 200, message: "已退出登录" })
  response.cookies.set("token", "", { httpOnly: true, maxAge: 0 })
  return response
}
