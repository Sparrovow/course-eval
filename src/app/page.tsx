"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FaEnvelope, FaLock, FaGithub, FaWeixin, FaQq, FaGraduationCap } from "react-icons/fa6"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (data.code === 200) {
        // Store user info in localStorage for client-side access
        localStorage.setItem("user", JSON.stringify(data.data.user))
        // Redirect based on role
        const role = data.data.user.role
        if (role === "STUDENT") router.push("/student")
        else if (role === "TEACHER") router.push("/teacher")
        else if (role === "ADMIN") router.push("/admin")
      } else {
        setError(data.message || "登录失败")
      }
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex-col justify-center items-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <FaGraduationCap className="text-5xl" />
            <h1 className="text-3xl font-bold">在线课程评价系统</h1>
          </div>
          <p className="text-lg text-blue-100 mb-8">
            高校课程评价平台 · 多维评分 · 数据可视化
          </p>
          <div className="flex gap-4 justify-center text-sm text-blue-200">
            <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full" /> 系统已就绪</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full" /> HTTPS加密</div>
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8 text-blue-600">
            <FaGraduationCap className="text-3xl" />
            <h1 className="text-2xl font-bold">在线课程评价系统</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">欢迎回来</h2>
          <p className="text-gray-500 mb-8">请输入您的账号信息登录系统</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-500">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                记住我
              </label>
              <a href="#" className="text-blue-600 hover:text-blue-700">忘记密码？</a>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "登录中..." : "登 录"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">第三方登录</span>
            </div>
          </div>

          {/* Social login */}
          <div className="flex gap-3">
            <button onClick={() => setError("第三方登录暂未开通")} className="flex-1 py-2.5 border border-gray-300 rounded-lg flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition-colors">
              <FaWeixin className="text-green-500" /> 微信
            </button>
            <button onClick={() => setError("第三方登录暂未开通")} className="flex-1 py-2.5 border border-gray-300 rounded-lg flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition-colors">
              <FaQq className="text-blue-500" /> QQ
            </button>
            <button onClick={() => setError("第三方登录暂未开通")} className="flex-1 py-2.5 border border-gray-300 rounded-lg flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition-colors">
              <FaGithub className="text-gray-800" /> GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
