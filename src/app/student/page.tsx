"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface User { id: number; email: string; name: string; role: string; studentNo?: string; teacherNo?: string }
interface Course {
  id: number; code: string; name: string; credits: number; college: string; semester: string
  description: string; coverColor: string; teachers: { id: number; name: string; title: string }[]
  isEnrolled: boolean; isEvaluated: boolean; evalCount: number
}
interface MyEval {
  id: number; avgScore: number; scoreContent: number; scoreAttitude: number; scoreMethod: number
  scoreExam: number; scoreOverall: number; comment: string | null; createdAt: string
  course: { id: number; code: string; name: string; semester: string; coverColor: string }
}

export default function StudentPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [myEvals, setMyEvals] = useState<MyEval[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("全部课程")
  const [search, setSearch] = useState("")
  const [semesterFilter, setSemesterFilter] = useState("")
  const [collegeFilter, setCollegeFilter] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [detailEval, setDetailEval] = useState<MyEval | null>(null)
  const [showCourseDetail, setShowCourseDetail] = useState<number | null>(null)
  const [courseDetailData, setCourseDetailData] = useState<{ evals: any[]; avgScore: number; evalCount: number } | null>(null)

  const fetchCourseDetail = async (courseId: number) => {
    const res = await fetch(`/api/stats/dashboard?courseId=${courseId}`)
    const d = await res.json()
    if (d.code === 200) {
      setCourseDetailData({
        evals: d.data.evaluations || [],
        avgScore: d.data.courses?.[0]?.dimensions?.overall?.avgScore || 0,
        evalCount: d.data.courses?.[0]?.dimensions?.overall?.evalCount || 0,
      })
    }
    setShowCourseDetail(courseId)
  }

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

    fetch("/api/stats/dashboard").then(r => r.json()).then(d => {
      if (d.code === 200) setMyEvals(d.data.myEvaluations || [])
    })
  }, [router])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    localStorage.removeItem("user")
    router.push("/")
  }

  const semesters = useMemo(() => [...new Set(courses.map(c => c.semester))].sort(), [courses])
  const colleges = useMemo(() => [...new Set(courses.map(c => c.college))].sort(), [courses])

  const filtered = useMemo(() => {
    let result = courses
    if (activeTab === "已选修") result = result.filter(c => c.isEnrolled)
    if (activeTab === "已评价") result = result.filter(c => c.isEvaluated)
    if (activeTab === "待评价") result = result.filter(c => c.isEnrolled && !c.isEvaluated)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c => c.name.includes(q) || c.code.toLowerCase().includes(q))
    }
    if (semesterFilter) result = result.filter(c => c.semester === semesterFilter)
    if (collegeFilter) result = result.filter(c => c.college === collegeFilter)
    return result
  }, [courses, activeTab, search, semesterFilter, collegeFilter])

  const findMyEval = (courseId: number) => myEvals.find(e => e.course.id === courseId)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">加载课程数据...</p>
      </div>
    </div>
  )

  const tabs = [
    { key: "全部课程", label: `全部课程 (${courses.length})` },
    { key: "已选修", label: `已选修 (${courses.filter(c => c.isEnrolled).length})` },
    { key: "已评价", label: `已评价 (${courses.filter(c => c.isEvaluated).length})` },
    { key: "待评价", label: `待评价 (${courses.filter(c => c.isEnrolled && !c.isEvaluated).length})` },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">在线课程评价系统</h1>
              <p className="text-xs text-gray-500">学生端</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              {showHistory ? "← 返回课程" : "📋 我的评价历史"}
            </button>
            <span className="text-sm text-gray-600 hidden sm:inline">{user?.name} ({user?.studentNo})</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">退出</button>
          </div>
        </div>

        {/* Sticky filter bar */}
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text" placeholder="搜索课程..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
            <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">全部学期</option>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">全部学院</option>
              {colleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-1.5">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.key ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {showHistory ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">我的评价历史</h2>
            <p className="text-gray-500 mb-6">共 {myEvals.length} 条评价记录</p>
            {myEvals.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
                你还没有提交过任何评价
              </div>
            ) : (
              <div className="space-y-4">
                {myEvals.map(e => (
                  <div key={e.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: e.course.coverColor }}>
                          {e.course.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{e.course.code}</span>
                            <h3 className="font-semibold text-gray-900">{e.course.name}</h3>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{e.course.semester} · {new Date(e.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-blue-600">
                          <span className="text-yellow-400">⭐</span>
                          <span className="font-bold text-lg">{e.avgScore.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    {e.comment && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{e.comment}</div>
                    )}
                    <div className="flex gap-3 text-xs text-gray-500 mt-2">
                      <span>内容: {"★".repeat(e.scoreContent)}{"☆".repeat(5 - e.scoreContent)}</span>
                      <span>态度: {"★".repeat(e.scoreAttitude)}{"☆".repeat(5 - e.scoreAttitude)}</span>
                      <span>方法: {"★".repeat(e.scoreMethod)}{"☆".repeat(5 - e.scoreMethod)}</span>
                      <span>考核: {"★".repeat(e.scoreExam)}{"☆".repeat(5 - e.scoreExam)}</span>
                      <span>综合: {"★".repeat(e.scoreOverall)}{"☆".repeat(5 - e.scoreOverall)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">课程列表</h2>
              <p className="text-gray-500 mt-1">
                共 {courses.length} 门课程 · 已选修 {courses.filter(c => c.isEnrolled).length} 门 · 已评价 {courses.filter(c => c.isEvaluated).length} 门 · 待评价 {courses.filter(c => c.isEnrolled && !c.isEvaluated).length} 门
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
                没有符合条件的课程
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(course => (
                  <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-2" style={{ backgroundColor: course.coverColor }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs font-medium text-gray-400">{course.code}</span>
                          <h3 className="text-lg font-semibold text-gray-900 mt-0.5">{course.name}</h3>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded whitespace-nowrap">{course.semester}</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                      <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                        <span>学分: {course.credits}</span><span>·</span>
                        <span>{course.college}</span><span>·</span>
                        <span>{course.evalCount} 条评价</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {course.teachers.map(t => (
                          <span key={t.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {t.name} {t.title}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        {course.isEvaluated ? (
                          <>
                            <button
                              onClick={() => { const e = findMyEval(course.id); if (e) setDetailEval(e) }}
                              className="flex-1 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                            >
                              ✅ 已评价（点此查看）
                            </button>
                            <button
                              onClick={() => fetchCourseDetail(course.id)}
                              className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              📊 课程评价
                            </button>
                          </>
                        ) : course.isEnrolled ? (
                          <>
                            <Link
                              href={`/student/evaluate/${course.id}`}
                              className="block flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg text-sm font-medium transition-colors"
                            >
                              ✏️ 去评价
                            </Link>
                            <button
                              onClick={() => fetchCourseDetail(course.id)}
                              className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              📊 课程评价
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => fetchCourseDetail(course.id)}
                              className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              📊 查看课程评价
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {detailEval && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailEval(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: detailEval.course.coverColor }}>
                    {detailEval.course.name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{detailEval.course.name}</h3>
                    <p className="text-xs text-gray-400">{detailEval.course.code} · {detailEval.course.semester}</p>
                  </div>
                </div>
                <button onClick={() => setDetailEval(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="flex items-center justify-center gap-2 py-4 mb-4 bg-blue-50 rounded-xl">
                <span className="text-yellow-400 text-xl">⭐</span>
                <span className="text-3xl font-bold text-blue-600">{detailEval.avgScore.toFixed(1)}</span>
                <span className="text-sm text-blue-400">/ 5.0</span>
              </div>
              <div className="space-y-3 mb-4">
                {[
                  { label: "教学内容", score: detailEval.scoreContent },
                  { label: "教学态度", score: detailEval.scoreAttitude },
                  { label: "教学方法", score: detailEval.scoreMethod },
                  { label: "考核方式", score: detailEval.scoreExam },
                  { label: "综合满意度", score: detailEval.scoreOverall },
                ].map(d => (
                  <div key={d.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{d.label}</span>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={s <= d.score ? "text-yellow-400" : "text-gray-200"}>★</span>
                      ))}
                      <span className="text-sm font-medium text-gray-700 ml-2 w-4">{d.score}</span>
                    </div>
                  </div>
                ))}
              </div>
              {detailEval.comment && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">留言评价</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{detailEval.comment}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">提交时间: {new Date(detailEval.createdAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Course Public Detail Modal */}
        {showCourseDetail && courseDetailData && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCourseDetail(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: courses.find(c => c.id === showCourseDetail)?.coverColor || "#3B82F6" }}>
                    {courses.find(c => c.id === showCourseDetail)?.name?.[0] || ""}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{courses.find(c => c.id === showCourseDetail)?.name}</h3>
                    <p className="text-xs text-gray-400">{courses.find(c => c.id === showCourseDetail)?.code} · {courses.find(c => c.id === showCourseDetail)?.semester}</p>
                  </div>
                </div>
                <button onClick={() => setShowCourseDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 rounded-xl">
                <div className="text-center"><p className="text-3xl font-bold text-blue-600">{courseDetailData.avgScore.toFixed(2)}</p><p className="text-xs text-blue-400">综合评分</p></div>
                <div className="text-center"><p className="text-xl font-semibold text-gray-700">{courseDetailData.evalCount}</p><p className="text-xs text-gray-400">评价人数</p></div>
                <div className="flex-1 grid grid-cols-5 gap-2 text-center">
                  {["scoreContent","scoreAttitude","scoreMethod","scoreExam","scoreOverall"].map(f => {
                    const lbl = f==="scoreContent"?"内容":f==="scoreAttitude"?"态度":f==="scoreMethod"?"方法":f==="scoreExam"?"考核":"综合"
                    const avg = courseDetailData.evals.length>0?Math.round(courseDetailData.evals.reduce((s:number,e:any)=>s+(e[f]||0),0)/courseDetailData.evals.length*100)/100:0
                    return <div key={f}><p className="text-sm font-bold text-gray-700">{"★".repeat(Math.round(avg))}{"☆".repeat(5-Math.round(avg))}</p><p className="text-xs text-gray-400">{lbl}</p></div>
                  })}
                </div>
              </div>
              <h4 className="font-semibold text-gray-900 mb-3">全部评价 ({courseDetailData.evals.length}条)</h4>
              {courseDetailData.evals.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">该课程暂无评价记录</p>
              ) : (
                <div className="space-y-3">
                  {courseDetailData.evals.map(ev => (
                    <div key={ev.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{ev.student?.name || "匿名"}</span>
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
      </main>
    </div>
  )
}
