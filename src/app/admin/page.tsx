"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ReactECharts from "echarts-for-react"

interface AdminStats {
  courses: Array<{
    course: { id: number; code: string; name: string; coverColor: string; college: string }
    dimensions: Record<string, { avgScore: number; evalCount: number; scoreDist: Record<number, number> }>
  }>
  evaluations: Array<{
    id: number; avgScore: number; comment: string | null; createdAt: string
    student: { id: number; name: string; studentNo: string }
    course: { id: number; name: string; code: string }
  }>
  summary: { totalCourses: number; totalEvalCount: number }
}

interface Course {
  id: number; code: string; name: string; credits: number; college: string; semester: string; evalCount: number
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [activeTab, setActiveTab] = useState<"dashboard" | "courses" | "evaluations">("dashboard")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) { router.push("/"); return }
    const user = JSON.parse(stored)
    if (user.role !== "ADMIN") { router.push("/"); return }

    Promise.all([
      fetch("/api/stats/dashboard").then(r => r.json()),
      fetch("/api/courses").then(r => r.json()),
    ]).then(([statsData, coursesData]) => {
      if (statsData.code === 200) setStats(statsData.data)
      if (coursesData.code === 200) setCourses(coursesData.data)
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

  // All courses ranking bar chart
  const rankingOption = {
    tooltip: { trigger: "axis" as const },
    grid: { left: 30, right: 50, top: 10, bottom: 30 },
    xAxis: { type: "value" as const, max: 5, name: "平均分" },
    yAxis: {
      type: "category" as const,
      data: (stats?.courses || []).map(c => `${c.course.code} ${c.course.name}`).reverse(),
      axisLabel: { fontSize: 11 },
    },
    series: [{
      type: "bar",
      data: (stats?.courses || []).map(c => ({
        value: c.dimensions.overall?.avgScore?.toFixed(2) || 0,
        itemStyle: { color: c.course.coverColor, borderRadius: [0, 4, 4, 0] },
      })).reverse(),
      label: { show: true, position: "right" as const, fontSize: 11 },
    }],
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">系统管理后台</h1>
              <p className="text-xs text-gray-500">管理员控制台</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">退出</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit">
          {[
            { key: "dashboard", label: "📊 数据概览" },
            { key: "courses", label: "📚 课程管理" },
            { key: "evaluations", label: "💬 评价记录" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "课程总数", value: stats?.summary.totalCourses || 0, color: "bg-blue-500" },
                { label: "评价总数", value: stats?.summary.totalEvalCount || 0, color: "bg-green-500" },
                { label: "评价覆盖率", value: `${(stats?.summary.totalEvalCount || 0) * 5}%`, color: "bg-purple-500" },
                { label: "学生人数", value: 3, color: "bg-orange-500" },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-12 rounded-full ${card.color}`} />
                    <div>
                      <p className="text-xs text-gray-500">{card.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Course ranking chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">课程评价排名</h3>
              <ReactECharts option={rankingOption} style={{ height: 400 }} />
            </div>

            {/* Per-course summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(stats?.courses || []).map(c => (
                <div key={c.course.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="h-1 w-full rounded-full mb-3" style={{ backgroundColor: c.course.coverColor }} />
                  <p className="text-xs text-gray-400">{c.course.code} · {c.course.college}</p>
                  <h4 className="font-semibold text-gray-900 mt-0.5 mb-2">{c.course.name}</h4>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-gray-500">综合评分</p>
                      <p className="text-2xl font-bold text-gray-900">{c.dimensions.overall?.avgScore?.toFixed(2) || "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">评价数</p>
                      <p className="text-lg font-semibold text-gray-700">{c.dimensions.overall?.evalCount || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "courses" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">全部课程 ({courses.length})</h3>
              <span className="text-xs text-gray-400">数据来源于系统预设</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">课程编号</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">课程名称</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">学院</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">学分</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">学期</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">评价数</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-gray-600">{c.code}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{c.name}</td>
                      <td className="py-3 px-4 text-gray-600">{c.college}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{c.credits}</td>
                      <td className="py-3 px-4 text-gray-500">{c.semester}</td>
                      <td className="py-3 px-4 text-center text-blue-600 font-medium">{c.evalCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "evaluations" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">评价记录 ({stats?.evaluations?.length || 0}条)</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {(stats?.evaluations || []).map(e => (
                <div key={e.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{e.student.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{e.student.studentNo}</span>
                      <span className="text-xs text-gray-300 mx-2">·</span>
                      <span className="text-xs text-blue-600">{e.course.code} {e.course.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-blue-600">{e.avgScore.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {e.comment && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{e.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
