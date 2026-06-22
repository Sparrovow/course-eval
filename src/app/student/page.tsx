"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface User { id: number; email: string; name: string; role: string; studentNo?: string; teacherNo?: string }
interface Course {
  id: number; code: string; name: string; credits: number; college: string; semester: string
  description: string; coverColor: string; teachers: { id: number; name: string; title: string }[]
  isEnrolled: boolean; isEvaluated: boolean; evalCount: number
}

export default function StudentPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) { router.push("/"); return }
    const parsed = JSON.parse(stored)
    if (parsed.role !== "STUDENT") {
      router.push(parsed.role === "TEACHER" ? "/teacher" : "/admin")
      return
    }
    setUser(parsed)

    fetch("/api/courses").then(r => r.json()).then(d => {
      if (d.code === 200) setCourses(d.data)
    }).finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    localStorage.removeItem("user")
    router.push("/")
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">在线课程评价系统</h1>
              <p className="text-xs text-gray-500">学生端</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name} ({user?.studentNo})
            </span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">退出</button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">课程列表</h2>
          <p className="text-gray-500 mt-1">
            浏览全部课程，对已选修的课程进行评价。共 {courses.length} 门课程，
            已选修 {courses.filter(c => c.isEnrolled).length} 门，
            已评价 {courses.filter(c => c.isEvaluated).length} 门
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {["全部课程", "已选修", "已评价", "待评价"].map((tab, i) => (
            <button key={i} className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              {tab}
            </button>
          ))}
        </div>

        {/* Course grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Color bar */}
              <div className="h-2" style={{ backgroundColor: course.coverColor }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-gray-400">{course.code}</span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-0.5">{course.name}</h3>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{course.semester}</span>
                </div>

                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>

                <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                  <span>学分: {course.credits}</span>
                  <span>·</span>
                  <span>{course.college}</span>
                  <span>·</span>
                  <span>{course.evalCount} 条评价</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {course.teachers.map(t => (
                    <span key={t.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {t.name} {t.title}
                    </span>
                  ))}
                </div>

                {/* Action button */}
                {course.isEvaluated ? (
                  <div className="w-full py-2 bg-green-50 text-green-700 text-center rounded-lg text-sm font-medium">
                    ✅ 已评价
                  </div>
                ) : course.isEnrolled ? (
                  <Link
                    href={`/student/evaluate/${course.id}`}
                    className="block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg text-sm font-medium transition-colors"
                  >
                    去评价
                  </Link>
                ) : (
                  <div className="w-full py-2 bg-gray-100 text-gray-400 text-center rounded-lg text-sm">
                    🔒 未选修
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
