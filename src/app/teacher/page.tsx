"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ReactECharts from "echarts-for-react"

interface TeacherData {
  course: { id: number; code: string; name: string; coverColor: string }
  dimensions: Record<string, {
    avgScore: number; median: number; stdDev: number; maxScore: number; minScore: number
    evalCount: number; scoreDist: Record<number, number>; wordCloud: { word: string; weight: number }[]
  }>
}
interface EvaluationComment {
  id: number; avgScore: number; scoreContent: number; scoreAttitude: number; scoreMethod: number
  scoreExam: number; scoreOverall: number; comment: string | null; createdAt: string
  student: { id: number; name: string; studentNo: string }
  course: { id: number; name: string; code: string }
}
interface StatsResponse {
  courses: TeacherData[]
  summary: { totalCourses: number; totalEvalCount: number; overallAvg: number }
}

export default function TeacherPage() {
  const router = useRouter()
  const [data, setData] = useState<StatsResponse | null>(null)
  const [comments, setComments] = useState<EvaluationComment[]>([])
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) { router.push("/"); return }
    const user = JSON.parse(stored)
    if (user.role !== "TEACHER") { router.push("/"); return }

    fetch("/api/stats/dashboard").then(r => r.json()).then(d => {
      if (d.code === 200) {
        setData(d.data)
        setComments(d.data.evaluations || [])
      }
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
  if (!data || data.courses.length === 0) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">暂无数据</div>
  )

  const selected = data.courses[selectedCourseIdx]
  const overall = selected?.dimensions.overall
  const dimKeys = ["content", "attitude", "method", "exam", "overall"] as const
  const dimLabels: Record<string, string> = { content: "教学内容", attitude: "教学态度", method: "教学方法", exam: "考核方式", overall: "综合满意度" }

  // Filter comments for selected course
  const courseComments = comments.filter(c => c.course.id === selected.course.id)

  const distOption = {
    tooltip: { trigger: "axis" as const },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: "category" as const, data: ["1分", "2分", "3分", "4分", "5分"] },
    yAxis: { type: "value" as const, name: "次数" },
    series: [{
      name: "评分分布", type: "bar",
      data: overall ? [overall.scoreDist[1] || 0, overall.scoreDist[2] || 0, overall.scoreDist[3] || 0, overall.scoreDist[4] || 0, overall.scoreDist[5] || 0] : [],
      itemStyle: {
        color: (params: any) => ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"][params.dataIndex],
        borderRadius: [4, 4, 0, 0],
      },
    }],
  }

  const radarOption = {
    tooltip: {},
    radar: {
      indicator: dimKeys.map(k => ({ name: dimLabels[k], max: 5 })),
      center: ["50%", "55%"], radius: "70%",
    },
    series: [{
      type: "radar",
      data: [{
        value: dimKeys.map(k => selected.dimensions[k]?.avgScore || 0),
        name: selected.course.name,
        areaStyle: { color: "rgba(59,130,246,0.2)" },
        lineStyle: { color: "#3b82f6", width: 2 },
        itemStyle: { color: "#3b82f6" },
      }],
    }],
  }

  const trendOption = {
    tooltip: { trigger: "axis" as const },
    grid: { left: 40, right: 20, top: 20, bottom: 60 },
    xAxis: {
      type: "category" as const,
      data: data.courses.map(c => c.course.code),
      axisLabel: { rotate: 45, fontSize: 10 },
    },
    yAxis: { type: "value" as const, min: 0, max: 5, name: "平均分" },
    series: [{
      name: "课程平均分", type: "line",
      data: data.courses.map(c => Math.round(c.dimensions.overall?.avgScore * 20) / 20),
      smooth: true,
      lineStyle: { color: "#3b82f6", width: 3 },
      itemStyle: { color: "#3b82f6" },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(59,130,246,0.3)" }, { offset: 1, color: "rgba(59,130,246,0)" }] } },
    }],
  }

  const wordCloudData = overall?.wordCloud || []
  const wordCloudOption = {
    tooltip: { show: true },
    series: [{
      type: "wordCloud" as any,
      shape: "circle" as const,
      width: "100%", height: "100%",
      sizeRange: [14, 40], rotationRange: [0, 0],
      textStyle: {
        fontFamily: "sans-serif", fontWeight: "bold",
        color: () => ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"][Math.floor(Math.random() * 7)],
      },
      data: wordCloudData.map((w: any) => ({ name: w.word, value: w.weight })),
    }],
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">教师数据看板</h1>
              <p className="text-xs text-gray-500">查看名下课程的评价统计与分析</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowComments(!showComments)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              {showComments ? "← 返回看板" : "💬 查看留言明细"}
            </button>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">退出</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {showComments ? (
          /* ─── Comments Detail View ─── */
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">留言明细</h2>
            <p className="text-gray-500 mb-6">共 {courseComments.length} 条留言</p>

            {/* Course selector */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {data.courses.map((c, i) => (
                <button key={c.course.id} onClick={() => setSelectedCourseIdx(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${i === selectedCourseIdx ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                  {c.course.code} {c.course.name} ({comments.filter(cm => cm.course.id === c.course.id).length})
                </button>
              ))}
            </div>

            {courseComments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
                该课程暂无评价留言
              </div>
            ) : (
              <div className="space-y-4">
                {courseComments.map(cm => (
                  <div key={cm.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-medium text-gray-900">{cm.student.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{cm.student.studentNo}</span>
                        <span className="text-xs text-gray-300 mx-2">·</span>
                        <span className="text-xs text-gray-400">{new Date(cm.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 font-bold">
                        ⭐ {cm.avgScore.toFixed(1)}
                      </div>
                    </div>

                    {/* Score detail */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-gray-500">
                      <span>教学内容 {cm.scoreContent}</span>
                      <span>教学态度 {cm.scoreAttitude}</span>
                      <span>教学方法 {cm.scoreMethod}</span>
                      <span>考核方式 {cm.scoreExam}</span>
                      <span>综合 {cm.scoreOverall}</span>
                    </div>

                    {cm.comment ? (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{cm.comment}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">（该学生未填写文字留言）</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ─── Dashboard View ─── */
          <div>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "教授课程", value: data.summary.totalCourses, color: "bg-blue-500" },
                { label: "评价总数", value: data.summary.totalEvalCount, color: "bg-green-500" },
                { label: "综合平均分", value: data.summary.overallAvg.toFixed(2), color: "bg-purple-500" },
                { label: "留言总数", value: comments.length, color: "bg-orange-500" },
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

            {/* Course selector */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {data.courses.map((c, i) => (
                <button key={c.course.id} onClick={() => setSelectedCourseIdx(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${i === selectedCourseIdx ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                  {c.course.code} {c.course.name}
                </button>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-1">评分分布</h3>
                <p className="text-xs text-gray-400 mb-4">全部维度评分1-5分频次统计</p>
                <ReactECharts option={distOption} style={{ height: 280 }} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-1">五维雷达图</h3>
                <p className="text-xs text-gray-400 mb-2">{selected.course.name}</p>
                <ReactECharts option={radarOption} style={{ height: 280 }} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-1">课程对比趋势</h3>
                <p className="text-xs text-gray-400 mb-4">名下各课程综合平均分对比</p>
                <ReactECharts option={trendOption} style={{ height: 280 }} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-1">最近评价记录</h3>
                <p className="text-xs text-gray-400 mb-4">该课程最新学生评价</p>
                {(() => {
                  const recentEvals = (comments || []).filter(c => c.course.id === selected.course.id).slice(0, 5)
                  if (recentEvals.length === 0) return (
                    <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">该课程暂无评价记录</div>
                  )
                  return (
                    <div className="space-y-3 max-h-[260px] overflow-y-auto">
                      {recentEvals.map(ce => (
                        <div key={ce.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-gray-900">{ce.student.name}</span>
                            <span className="text-xs text-blue-600 font-semibold">⭐ {ce.avgScore.toFixed(1)}</span>
                          </div>
                          {ce.comment ? (
                            <p className="text-xs text-gray-600 line-clamp-2">{ce.comment}</p>
                          ) : (
                            <p className="text-xs text-gray-400 italic">无文字留言</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{new Date(ce.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Stats table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{selected.course.name} · 各维度详细统计</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 text-gray-500 font-medium">维度</th>
                      <th className="text-right py-3 px-3 text-gray-500 font-medium">平均分</th>
                      <th className="text-right py-3 px-3 text-gray-500 font-medium">中位数</th>
                      <th className="text-right py-3 px-3 text-gray-500 font-medium">标准差</th>
                      <th className="text-right py-3 px-3 text-gray-500 font-medium">最高</th>
                      <th className="text-right py-3 px-3 text-gray-500 font-medium">最低</th>
                      <th className="text-right py-3 px-3 text-gray-500 font-medium">评价数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dimKeys.map(k => {
                      const d = selected.dimensions[k]
                      if (!d) return null
                      return (
                        <tr key={k} className="border-b border-gray-100">
                          <td className="py-3 px-3 font-medium text-gray-900">{dimLabels[k]}</td>
                          <td className="py-3 px-3 text-right text-gray-700">{d.avgScore.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-gray-700">{d.median.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-gray-700">{d.stdDev.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-green-600">{d.maxScore.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-red-500">{d.minScore.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-gray-500">{d.evalCount}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
