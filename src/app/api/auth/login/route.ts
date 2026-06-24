import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signToken } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ code: 422, message: "Please enter email and password" }, { status: 422 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ code: 401, message: "Account not found" }, { status: 401 })
    }

    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) {
      return NextResponse.json({ code: 401, message: "Invalid password" }, { status: 401 })
    }

    const token = await signToken({ userId: user.id, role: user.role })

    // Record successful login
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        ip: request.headers.get("x-forwarded-for") || "",
        userAgent: request.headers.get("user-agent") || "",
        success: true,
      },
    })

    const response = NextResponse.json({
      code: 200,
      message: "登录成功",
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          studentNo: user.studentNo,
          teacherNo: user.teacherNo,
        },
      },
    })

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ code: 500, message: "Internal server error" }, { status: 500 })
  }
}
