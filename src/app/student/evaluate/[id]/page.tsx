"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface Course {
  id: number; code: string; name: string; credits: number; semester: string
  coverColor: string; teachers: { id: number; name: string; title: string }[]
  isEvaluated: boolean
}

const DIMENSIONS = [
  { key: "content", label: "教学内容", desc: "课程内容是否充实、前沿，知识体系是否完整" },
  { key: "attitude", label: "教学态度", desc: "教师授课是否认真负责，备课是否充分" },
  { key: "method", label: "教学方法", desc: "教学方法是否灵活多样，是否注重互动启发" },
  { key: "exam", label: "考核方式", desc: "考核方式是否科学合理，评分标准是否公正" },
  { key: "overall", label: "综合满意度", desc: "对该课程的整体满意程度" },
]

export default function EvaluatePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const stored = localStorage.getItem("user")
    if (!stored) { router.push("/"); return }
    const user = JSON.parse(stored)
    if (user.role !== "STUDENT") { router.push("/"); return }

    fetch("/api/courses").then(r => r.json()).then(d => {
      if (d.code === 200) {
        const found = d.data.find((c: Course) => c.id === parseInt(courseId))
        if (found) setCourse(found)
        else router.push("/student")
      }
    }).finally(() => setLoading(false))
  }, [courseId, router])

  const handleSubmit = async () => {
    // Validate all dimensions scored
    for (const dim of DIMENSIONS) {
      if (!scores[dim.key]) {
        setError(`请为「${dim.label}」打分`)
        return
      }
    }

    setError("")
    setSubmitting(true)

    const scoreArray = DIMENSIONS.map(d => scores[d.key])
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: parseInt(courseId), scores: scoreArray, comment }),
      })
      const data = await res.json()

      if (data.code === 200) {
        router.push("/student?evaluated=true")
      } else {
        setError(data.message || "提交失败")
      }
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  )
  if (!course) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/student" className="text-gray-400 hover:text-gray-600">← 返回</Link>
            <h1 className="text-lg font-bold text-gray-900">课程评价</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Course info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: course.coverColor }}>
              {course.name[0]}
            </div>
            <div>
              <div className="text-xs text-gray-400">{course.code} · {course.semester}</div>
              <h2 className="text-xl font-bold text-gray-900">{course.name}</h2>
              <div className="flex gap-2 mt-1">
                {course.teachers.map(t => <span key={t.id} className="text-xs text-blue-600">{t.name} {t.title}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Scoring - 5 dimensions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-1">多维评分</h3>
          <p className="text-sm text-gray-500 mb-6">请从以下五个维度对课程进行评分（1-5分）</p>

          {DIMENSIONS.map(dim => (
            <div key={dim.key} className="mb-6 last:mb-0 pb-6 last:pb-0 border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-900">{dim.label}</span>
                  <span className="text-xs text-gray-400 ml-2">{dim.desc}</span>
                </div>
                {scores[dim.key] && (
                  <span className="text-sm font-semibold text-blue-600">{scores[dim.key]} 分</span>
                )}
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    onClick={() => setScores(prev => ({ ...prev, [dim.key]: score }))}
                    className={`w-full py-3 rounded-lg text-sm font-medium transition-all
                      ${scores[dim.key] === score
                        ? "bg-blue-600 text-white shadow-md scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-300">
                <span>很差</span><span>较差</span><span>一般</span><span>良好</span><span>优秀</span>
              </div>
            </div>
          ))}
        </div>

        {/* Comment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-1">文字点评</h3>
          <p className="text-sm text-gray-500 mb-3">可选，分享你的学习体验和意见（限500字）</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 500))}
            placeholder="请输入你对课程的点评和建议..."
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/500</p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-6">{error}</div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {submitting ? "提交中..." : "提交评价"}
        </button>
      </main>
    </div>
  )
}
