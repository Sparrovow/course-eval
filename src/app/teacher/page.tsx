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

interface StatsResponse {
  courses: TeacherData[]
  summary: { totalCourses: number; totalEvalCount: number; overallAvg: number }
}

export default function TeacherPage() {
  const router = useRouter()
  const [data, setData] = useState<StatsResponse | null>(null)
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) { router.push("/"); return }
    const user = JSON.parse(stored)
    if (user.role !== "TEACHER") { router.push("/"); return }

    fetch("/api/stats/dashboard").then(r => r.json()).then(d => {
      if (d.code === 200) setData(d.data)
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

  // 1. Score distribution bar chart
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

  // 2. Radar chart
  const radarOption = {
    tooltip: {},
    radar: {
      indicator: dimKeys.map(k => ({ name: dimLabels[k], max: 5 })),
      center: ["50%", "55%"],
      radius: "70%",
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

  // 3. Trend (simulated from all courses)
  const trendOption = {
    tooltip: { trigger: "axis" as const },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category" as const,
      data: data.courses.map(c => c.course.code),
      axisLabel: { rotate: 30 },
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

  // 4. Word cloud
  const wordCloudData = overall?.wordCloud || []
  const wordCloudOption = {
    tooltip: { show: true },
    series: [{
      type: "wordCloud" as any,
      shape: "circle" as const,
      width: "100%",
      height: "100%",
      sizeRange: [14, 40],
      rotationRange: [0, 0],
      textStyle: {
        fontFamily: "sans-serif",
        fontWeight: "bold",
        color: () => ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"][Math.floor(Math.random() * 7)],
      },
      data: wordCloudData.map((w: any) => ({ name: w.word, value: w.weight })),
    }],
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">教师数据看板</h1>
              <p className="text-xs text-gray-500">查看名下课程的评价统计与分析</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">退出</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "课程总数", value: data.summary.totalCourses, color: "bg-blue-500" },
            { label: "评价总数", value: data.summary.totalEvalCount, color: "bg-green-500" },
            { label: "综合平均分", value: data.summary.overallAvg.toFixed(2), color: "bg-purple-500" },
            { label: "评价覆盖率", value: `${Math.min(data.summary.totalEvalCount * 10, 100)}%`, color: "bg-orange-500" },
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

        {/* Course selector tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {data.courses.map((c, i) => (
            <button
              key={c.course.id}
              onClick={() => setSelectedCourseIdx(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${i === selectedCourseIdx ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
            >
              {c.course.code} {c.course.name}
            </button>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Score Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-1">评分分布</h3>
            <p className="text-xs text-gray-400 mb-4">全部维度评分1-5分频次统计</p>
            <ReactECharts option={distOption} style={{ height: 280 }} />
          </div>

          {/* Radar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-1">五维雷达图</h3>
            <p className="text-xs text-gray-400 mb-2">{selected.course.name}</p>
            <ReactECharts option={radarOption} style={{ height: 280 }} />
          </div>

          {/* Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-1">课程对比趋势</h3>
            <p className="text-xs text-gray-400 mb-4">名下各课程综合平均分对比</p>
            <ReactECharts option={trendOption} style={{ height: 280 }} />
          </div>

          {/* Word Cloud */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-1">评价词云</h3>
            <p className="text-xs text-gray-400 mb-4">高频关键词分析</p>
            {wordCloudData.length > 0 ? (
              <ReactECharts option={wordCloudOption} style={{ height: 280 }} />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">暂无足够留言数据生成词云</div>
            )}
          </div>
        </div>

        {/* Detailed stats table */}
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
      </main>
    </div>
  )
}
