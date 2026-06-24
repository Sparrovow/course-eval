"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AdminStats {
  courses: Array<{
    course: { id: number; code: string; name: string; coverColor: string; college: string; teachers?: Array<{ id: number; name: string; title: string; college?: string }> }
    dimensions: Record<string, { avgScore: number; evalCount: number; scoreDist: Record<number, number> }>
  }>
  evaluations: Array<{
    id: number; avgScore: number; scoreContent: number; scoreAttitude: number; scoreMethod: number
    scoreExam: number; scoreOverall: number; comment: string | null; createdAt: string
    student: { id: number; name: string; studentNo: string }
    course: { id: number; name: string; code: string }
  }>
  summary: { totalCourses: number; totalEvalCount: number }
}

interface CourseItem {
  id: number; code: string; name: string; credits: number; college: string; semester: string; evalCount: number
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [activeTab, setActiveTab] = useState<"dashboard" | "teachers" | "courses" | "evaluations" | "logs">("dashboard")
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState("")
  const [importMsg, setImportMsg] = useState("")
  const [showDetailModal, setShowDetailModal] = useState<number | null>(null)
  const [showTeacherModal, setShowTeacherModal] = useState<number | null>(null)
  const [teacherCollegeFilter, setTeacherCollegeFilter] = useState("")
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false)
  const [teacherForm, setTeacherForm] = useState({ name: "", title: "讲师", college: "计算机科学与技术学院", email: "", password: "123456" })
  const [loginLogs, setLoginLogs] = useState<any[]>([])
  const [formData, setFormData] = useState({ code: "", name: "", credits: "3", college: "计算机科学与技术学院", semester: "2024-2025-2", description: "", coverColor: "#3B82F6", teacherId: "" })
  const [dashboardCollegeFilter, setDashboardCollegeFilter] = useState("")

  const colleges = [...new Set(courses.map(c => c.college))].sort()

  // Build teacher stats from ALL teachers (not just those with evals)
  const teacherStats = (() => {
    const map = new Map<number, { teacher: { id: number; name: string; title: string; college: string }; courseIds: Set<number>; totalScore: number; evalCount: number; comments: any[] }>()
    // First, initialize from all courses (ensures all teachers are present)
    if (stats?.courses) {
      for (const cd of stats.courses) {
        const teachers = cd.course?.teachers || []
        for (const t of teachers) {
          if (!map.has(t.id)) {
            map.set(t.id, { teacher: { ...t, college: cd.course?.college || '' }, courseIds: new Set(), totalScore: 0, evalCount: 0, comments: [] })
          }
          map.get(t.id)!.courseIds.add(cd.course.id)
        }
      }
    }
    // Then add evaluation data
    if (stats?.evaluations) {
      for (const ev of stats.evaluations) {
        const cd = (stats.courses || []).find(c => c.course.id === ev.course.id)
        const teachers = (cd?.course?.teachers || []).map(t => ({ ...t, college: cd?.course?.college || '' }))
        for (const t of teachers) {
          if (!map.has(t.id)) {
            map.set(t.id, { teacher: t, courseIds: new Set(), totalScore: 0, evalCount: 0, comments: [] })
          }
          const entry = map.get(t.id)!
          entry.totalScore += ev.avgScore
          entry.evalCount++
          entry.comments.push(ev)
        }
      }
    }
    return Array.from(map.values()).map(e => ({
      ...e,
      avgScore: e.evalCount > 0 ? Math.round(e.totalScore / e.evalCount * 100) / 100 : 0,
      courseCount: e.courseIds.size,
    }))
  })()

  const courseEvals = (courseId: number) => (stats?.evaluations || []).filter(e => e.course.id === courseId)
  const detailCourse = stats?.courses.find(c => c.course.id === showDetailModal)

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    localStorage.removeItem("user")
    router.push("/")
  }

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) { router.push("/"); return }
    const user = JSON.parse(stored)
    if (user.role !== "ADMIN") { router.push("/"); return }
    refreshData()
    loadLogs()
  }, [router])

  const refreshData = () => {
    Promise.all([
      fetch("/api/stats/dashboard").then(r => r.json()),
      fetch("/api/courses").then(r => r.json()),
    ]).then(([statsData, coursesData]) => {
      if (statsData.code === 200) setStats(statsData.data)
      if (coursesData.code === 200) setCourses(coursesData.data)
    }).finally(() => setLoading(false))
  }

  const handleAddCourse = async () => {
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, teacherIds: formData.teacherId ? [parseInt(formData.teacherId)] : [] }),
    })
    const data = await res.json()
    if (data.code === 200) {
      setShowAddModal(false)
      setFormData({ code: "", name: "", credits: "3", college: "计算机科学与技术学院", semester: "2024-2025-2", description: "", coverColor: "#3B82F6", teacherId: "" })
      refreshData()
    } else {
      alert(data.message || "创建失败")
    }
  }

  const handleDeleteCourse = async (courseId: number, courseName: string) => {
    if (!confirm(`确定删除课程「${courseName}」吗？此操作不可恢复。`)) return
    const res = await fetch(`/api/admin/courses?id=${courseId}`, { method: "DELETE" })
    const data = await res.json()
    if (data.code === 200) {
      refreshData()
    } else {
      alert(data.message || "删除失败")
    }
  }

  const handleDeleteEval = async (evalId: number) => {
    if (!confirm("确定删除该评价记录吗？")) return
    const res = await fetch(`/api/admin/evaluations?id=${evalId}`, { method: "DELETE" })
    const data = await res.json()
    if (data.code === 200) refreshData()
    else alert(data.message || "删除失败")
  }

  const handleAddTeacher = async () => {
    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teacherForm),
    })
    const data = await res.json()
    if (data.code === 200) {
      setShowAddTeacherModal(false)
      setTeacherForm({ name: "", title: "讲师", college: "计算机科学与技术学院", email: "", password: "123456" })
      refreshData()
    } else {
      alert(data.message || "创建失败")
    }
  }

  const loadLogs = async () => {
    const res = await fetch("/api/admin/logs")
    const data = await res.json()
    if (data.code === 200) setLoginLogs(data.data)
  }

  const handleImportCSV = async () => {
    setImportMsg("")
    const lines = importText.trim().split("\n")
    if (lines.length < 2) { setImportMsg("请输入至少一行表头+一行数据"); return }
    const errors: string[] = []
    let successCount = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",")
      if (cols.length < 5) { errors.push(`行${i + 1}: 列数不足`); continue }
      const [code, name, credits, college, semester] = cols
      try {
        const res = await fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim(), name: name.trim(), credits, college: college.trim(), semester: semester.trim(), description: cols[5]?.trim() || "" }),
        })
        const data = await res.json()
        if (data.code === 200) successCount++
        else errors.push(`行${i + 1}: ${data.message}`)
      } catch { errors.push(`行${i + 1}: 网络错误`) }
    }

    setImportMsg(`导入完成：成功 ${successCount} 条，失败 ${errors.length} 条${errors.length > 0 ? '（' + errors.slice(0, 5).join('; ') + '）' : ''}`)
    if (successCount > 0) refreshData()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="text-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <div className="text-sm text-gray-500">加载中...</div>
    </div></div>
  )

  if (!stats || !courses) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">数据加载失败，请刷新重试</div>
  )

  // All courses ranking bar chart - SORTED by avgScore descending - REMOVED per user request
  // const sortedCourses and rankingOption deleted; only per-course cards remain

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
            { key: "teachers", label: "👨‍🏫 教师管理" },
            { key: "courses", label: "📚 课程管理" },
            { key: "evaluations", label: "💬 评价记录" },
            { key: "logs", label: "📋 登录日志" },
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "课程数量", value: stats?.summary.totalCourses || 0, color: "bg-blue-500" },
                { label: "评价总数", value: stats?.summary.totalEvalCount || 0, color: "bg-green-500" },
                { label: "学生总数", value: 44, color: "bg-orange-500" },
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

            {/* College filter */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-gray-500">学院筛选:</span>
              <select value={dashboardCollegeFilter} onChange={e => setDashboardCollegeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">全部学院 ({(stats?.courses || []).length}门)</option>
                {colleges.map(col => {
                  const cnt = (stats?.courses || []).filter(c => c.course.college === col).length
                  return <option key={col} value={col}>{col} ({cnt}门)</option>
                })}
              </select>
            </div>

            {/* Course cards overview with click-for-detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{/* (ranking chart removed) */}
              {(stats?.courses || []).filter(c => !dashboardCollegeFilter || c.course.college === dashboardCollegeFilter).map(c => (
                <div key={c.course.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowDetailModal(c.course.id)}>
                  <div className="h-1 w-full rounded-full mb-3" style={{ backgroundColor: c.course.coverColor }} />
                  <p className="text-xs text-gray-400">{c.course.code} · {c.course.college}</p>
                  <h4 className="font-semibold text-gray-900 mt-0.5 mb-1">{c.course.name}</h4>
                  {c.course.teachers && c.course.teachers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {c.course.teachers.map(t => (
                        <span key={t.id} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{t.name} {t.title}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end justify-between mt-2">
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

            {/* Course Detail Modal */}
            {showDetailModal && detailCourse && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(null)}>
                <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: detailCourse.course.coverColor }}>{detailCourse.course.name[0]}</div>
                      <div>
                        <h3 className="font-bold text-lg">{detailCourse.course.name}</h3>
                        <p className="text-xs text-gray-400">{detailCourse.course.code} · {detailCourse.course.college}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowDetailModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                  </div>
                  <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 rounded-xl">
                    <div className="text-center"><p className="text-3xl font-bold text-blue-600">{(() => { const evals = courseEvals(showDetailModal); return evals.length > 0 ? (evals.reduce((s: number, e: any) => s + e.avgScore, 0) / evals.length).toFixed(2) : "-" })()}</p><p className="text-xs text-blue-400">综合评分</p></div>
                    <div className="text-center"><p className="text-xl font-semibold text-gray-700">{courseEvals(showDetailModal).length}</p><p className="text-xs text-gray-400">评价人数</p></div>
                    {(() => {
                      const evals = courseEvals(showDetailModal);
                      if (evals.length === 0) return null;
                      const avgField = (field: string) => (evals.reduce((s: number, e: any) => s + e[field], 0) / evals.length).toFixed(1);
                      return (
                        <div className="flex-1 grid grid-cols-5 gap-2 text-center">
                          {[{k:"scoreContent",l:"内容"},{k:"scoreAttitude",l:"态度"},{k:"scoreMethod",l:"方法"},{k:"scoreExam",l:"考核"},{k:"scoreOverall",l:"综合"}].map(d => (
                            <div key={d.k}><p className="text-sm font-bold text-gray-700">{"★".repeat(Math.round(Number(avgField(d.k))))}{"☆".repeat(5-Math.round(Number(avgField(d.k))))}</p><p className="text-xs text-gray-400">{d.l}</p></div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-3">学生评价 ({courseEvals(showDetailModal).length}条)</h4>
                  {courseEvals(showDetailModal).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">该课程暂无评价记录</p>
                  ) : (
                    <div className="space-y-3">
                      {courseEvals(showDetailModal).map(ev => (
                        <div key={ev.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{ev.student.name}</span>
                            <div className="flex items-center gap-1 text-sm"><span className="text-yellow-500">⭐ {ev.avgScore.toFixed(1)}</span><span className="text-xs text-gray-400 ml-2">{new Date(ev.createdAt).toLocaleDateString()}</span></div>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-500 mb-1"><span>内容:{ev.scoreContent}</span><span>态度:{ev.scoreAttitude}</span><span>方法:{ev.scoreMethod}</span><span>考核:{ev.scoreExam}</span><span>综合:{ev.scoreOverall}</span></div>
                          {ev.comment && <p className="text-sm text-gray-700 mt-1">{ev.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "teachers" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">教师管理 ({teacherStats.length}人)</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAddTeacherModal(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">+ 新增教师</button>
                <span className="text-xs text-gray-400">学院筛选:</span>
                <select value={teacherCollegeFilter} onChange={e => setTeacherCollegeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">全部学院</option>
                  {colleges.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">教师姓名</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">职称</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">学院</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">教授课程</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">评价数</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">综合评分</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherStats.filter(t => !teacherCollegeFilter || t.teacher.college === teacherCollegeFilter).map(t => (
                    <tr key={t.teacher.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setShowTeacherModal(t.teacher.id)}>
                      <td className="py-3 px-4 font-medium text-gray-900">{t.teacher.name}</td>
                      <td className="py-3 px-4 text-gray-600">{t.teacher.title}</td>
                      <td className="py-3 px-4 text-gray-600">{t.teacher.college}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{t.courseCount}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{t.evalCount}</td>
                      <td className="py-3 px-4 text-center text-blue-600 font-semibold">{t.avgScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Teacher Detail Modal */}
            {showTeacherModal && (() => {
              const td = teacherStats.find(t => t.teacher.id === showTeacherModal)
              if (!td) return null
              return (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowTeacherModal(null)}>
                  <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">{td.teacher.name[0]}</div>
                        <div>
                          <h3 className="font-bold text-lg">{td.teacher.name}</h3>
                          <p className="text-xs text-gray-400">{td.teacher.title} · {td.teacher.college}</p>
                        </div>
                      </div>
                      <button onClick={() => setShowTeacherModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                    </div>
                    <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 rounded-xl">
                      <div className="text-center"><p className="text-2xl font-bold text-blue-600">{td.courseCount}</p><p className="text-xs text-blue-400">教授课程</p></div>
                      <div className="text-center"><p className="text-xl font-semibold text-gray-700">{td.evalCount}</p><p className="text-xs text-gray-400">评价总数</p></div>
                      <div className="text-center"><p className="text-2xl font-bold text-blue-600">{td.avgScore.toFixed(1)}</p><p className="text-xs text-blue-400">综合平均分</p></div>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-3">评价记录</h4>
                    {td.comments.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">暂无评价</p>
                    ) : (
                      <div className="space-y-3">
                        {td.comments.map((ev: any) => (
                          <div key={ev.id || Math.random()} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{ev.student?.name || "匿名"}</span>
                              <span className="text-xs text-gray-400">{ev.course?.code} {ev.course?.name} · ⭐{ev.avgScore?.toFixed(1)}</span>
                            </div>
                            {ev.comment && <p className="text-sm text-gray-700 mt-1">{ev.comment}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Add Teacher Modal */}
            {showAddTeacherModal && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddTeacherModal(false)}>
                <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-4">新增教师</h3>
                  <div className="space-y-3">
                    <div><input placeholder="教师姓名 *" value={teacherForm.name} onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /><label className="block text-xs text-gray-500 ml-1">教师姓名</label></div>
                    <div className="flex gap-2">
                      <div className="flex-1"><input placeholder="职称" value={teacherForm.title} onChange={e => setTeacherForm({ ...teacherForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /><label className="block text-xs text-gray-500 ml-1">职称</label></div>
                      <div className="flex-1"><input placeholder="学院" value={teacherForm.college} onChange={e => setTeacherForm({ ...teacherForm, college: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /><label className="block text-xs text-gray-500 ml-1">学院</label></div>
                    </div>
                    <div><input placeholder="邮箱" type="email" value={teacherForm.email} onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /><label className="block text-xs text-gray-500 ml-1">邮箱</label></div>
                    <div><input placeholder="密码" value={teacherForm.password} onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /><label className="block text-xs text-gray-500 ml-1">密码</label></div>
                    <div className="flex gap-2">
                      <button onClick={handleAddTeacher} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">创建</button>
                      <button onClick={() => setShowAddTeacherModal(false)} className="py-2 px-4 border border-gray-300 rounded-lg text-sm">取消</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "courses" && (
          <div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ 添加课程</button>
              <button onClick={() => setShowImportModal(true)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">📥 批量导入 CSV</button>
            </div>

            {/* Add Course Modal */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-4">添加新课程</h3>
                  <div className="space-y-3">
                    <input placeholder="课程编号 *" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <label className="block text-xs text-gray-500 -mt-2 ml-1">课程编号</label>
                    <input placeholder="课程名称 *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <label className="block text-xs text-gray-500 -mt-2 ml-1">课程名称</label>
                    <div className="flex gap-2">
                      <div className="w-1/3">
                        <input placeholder="学分" type="number" value={formData.credits} onChange={e => setFormData({ ...formData, credits: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        <label className="block text-xs text-gray-500 ml-1">学分</label>
                      </div>
                      <div className="flex-1">
                        <input placeholder="学院" value={formData.college} onChange={e => setFormData({ ...formData, college: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                        <label className="block text-xs text-gray-500 ml-1">学院</label>
                      </div>
                    </div>
                    <div>
                      <input placeholder="学期 (如 2024-2025-2)" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <label className="block text-xs text-gray-500 ml-1">学期</label>
                    </div>
                    <div>
                      <textarea placeholder="课程描述" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      <label className="block text-xs text-gray-500 ml-1">课程描述（可选）</label>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 ml-1 mb-1">授课教师 (可选)</label>
                      <select value={formData.teacherId} onChange={e => setFormData({ ...formData, teacherId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">不指定教师</option>
                        {(stats?.courses || []).flatMap(c => c.course.teachers || []).filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i).slice(0, 30).map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.title || ''})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddCourse} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">创建</button>
                      <button onClick={() => setShowAddModal(false)} className="py-2 px-4 border border-gray-300 rounded-lg text-sm">取消</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Import CSV Modal */}
            {showImportModal && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
                <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-2">批量导入课程</h3>
                  <p className="text-xs text-gray-500 mb-3">粘贴 CSV 数据（格式：编号,名称,学分,学院,学期,描述）。每行一个课程。</p>
                  <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={6} placeholder="CS401,网络安全基础,3,计算机科学与技术学院,2024-2025-2,学习网络安全核心知识" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
                  {importMsg && <p className="text-sm text-green-600 mt-2">{importMsg}</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleImportCSV} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">导入</button>
                    <button onClick={() => { setShowImportModal(false); setImportText(""); setImportMsg("") }} className="py-2 px-4 border border-gray-300 rounded-lg text-sm">取消</button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">全部课程 ({courses.length})</h3>
                <span className="text-xs text-gray-400">数据实时更新</span>
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
                    <div className="flex items-center gap-3">
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

        {activeTab === "logs" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">登录日志 ({loginLogs.length}条)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-3 px-3 font-medium text-gray-500">时间</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">用户</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500">角色</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">IP地址</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-500">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">暂无登录记录</td></tr>
                  ) : (
                    loginLogs.map((log: any) => (
                      <tr key={log.id} className="border-b border-gray-50">
                        <td className="py-3 px-3 text-gray-600 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-3 text-gray-900">{log.user?.name || "-"}</td>
                        <td className="py-3 px-3 text-center text-gray-500">{log.user?.role || "-"}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs font-mono">{log.ip || "-"}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={log.success ? "text-green-600" : "text-red-500"}>{log.success ? "成功" : "失败"}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
