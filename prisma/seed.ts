import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import bcrypt from "bcryptjs"

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seeding database...")

  // Clean existing data
  await prisma.loginLog.deleteMany()
  await prisma.statsReport.deleteMany()
  await prisma.evaluation.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.courseTeacher.deleteMany()
  await prisma.teacher.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()

  const hash = bcrypt.hashSync("123456", 10)

  // ─── Users ───────────────────────────────────────
  const admin = await prisma.user.create({ data: { email: "admin@courseeval.com", password: hash, name: "管理员", role: "ADMIN" } })
  const teacher1 = await prisma.user.create({ data: { email: "wang@courseeval.com", password: hash, name: "王建国", role: "TEACHER", teacherNo: "T2001001" } })
  const teacher2 = await prisma.user.create({ data: { email: "zhang@courseeval.com", password: hash, name: "张丽华", role: "TEACHER", teacherNo: "T2002003" } })
  const teacher3 = await prisma.user.create({ data: { email: "liu@courseeval.com", password: hash, name: "刘明远", role: "TEACHER", teacherNo: "T2003015" } })
  const student1 = await prisma.user.create({ data: { email: "xuhe@courseeval.com", password: hash, name: "徐鹤", role: "STUDENT", studentNo: "20232132046" } })
  const student2 = await prisma.user.create({ data: { email: "liyang@courseeval.com", password: hash, name: "李阳", role: "STUDENT", studentNo: "20232132027" } })
  const student3 = await prisma.user.create({ data: { email: "zhanghe@courseeval.com", password: hash, name: "张贺", role: "STUDENT", studentNo: "20232132024" } })

  console.log("  ✅ Users created")

  // ─── Teachers ────────────────────────────────────
  const t1 = await prisma.teacher.create({ data: { userId: teacher1.id, title: "教授", college: "计算机科学与技术学院" } })
  const t2 = await prisma.teacher.create({ data: { userId: teacher2.id, title: "副教授", college: "计算机科学与技术学院" } })
  const t3 = await prisma.teacher.create({ data: { userId: teacher3.id, title: "讲师", college: "数学与统计学院" } })

  // ─── Courses ─────────────────────────────────────
  const courses = await Promise.all([
    prisma.course.create({ data: { code: "CS301", name: "Web前端开发技术", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", description: "学习HTML、CSS、JavaScript及现代前端框架，掌握构建交互式Web应用的核心技能。", coverColor: "#3B82F6" } }),
    prisma.course.create({ data: { code: "CS302", name: "数据库系统原理", credits: 4, college: "计算机科学与技术学院", semester: "2024-2025-2", description: "涵盖关系数据库理论、SQL语言、数据库设计与优化、事务管理等数据库核心技术。", coverColor: "#10B981" } }),
    prisma.course.create({ data: { code: "CS303", name: "操作系统", credits: 4, college: "计算机科学与技术学院", semester: "2024-2025-1", description: "学习进程管理、内存管理、文件系统和设备管理等操作系统核心概念与实现原理。", coverColor: "#F59E0B" } }),
    prisma.course.create({ data: { code: "CS304", name: "计算机网络", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-1", description: "系统学习TCP/IP协议栈、网络层路由、传输层协议及网络安全等计算机网络基础。", coverColor: "#EF4444" } }),
    prisma.course.create({ data: { code: "CS305", name: "软件工程", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", description: "学习软件开发全生命周期管理，包括需求分析、系统设计、编码实现、测试与维护。", coverColor: "#8B5CF6" } }),
    prisma.course.create({ data: { code: "MATH201", name: "高等数学（下）", credits: 5, college: "数学与统计学院", semester: "2024-2025-2", description: "学习多元微积分、无穷级数、常微分方程等高等数学核心内容。", coverColor: "#EC4899" } }),
    prisma.course.create({ data: { code: "CS306", name: "人工智能导论", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", description: "介绍人工智能的基本概念、搜索算法、机器学习基础、神经网络与深度学习入门。", coverColor: "#06B6D4" } }),
    prisma.course.create({ data: { code: "MATH202", name: "线性代数", credits: 3, college: "数学与统计学院", semester: "2024-2025-1", description: "学习向量空间、矩阵理论、线性变换、特征值与特征向量等线性代数基础知识。", coverColor: "#84CC16" } }),
  ])

  // ─── Course-Teacher associations ────────────────
  // 王建国: Web前端, 软件工程, AI导论 | 张丽华: 数据库, 操作系统, 计算机网络 | 刘明远: 高数, 线代
  await prisma.courseTeacher.createMany({
    data: [
      { courseId: courses[0].id, teacherId: t1.id }, { courseId: courses[4].id, teacherId: t1.id }, { courseId: courses[6].id, teacherId: t1.id },
      { courseId: courses[1].id, teacherId: t2.id }, { courseId: courses[2].id, teacherId: t2.id }, { courseId: courses[3].id, teacherId: t2.id },
      { courseId: courses[5].id, teacherId: t3.id }, { courseId: courses[7].id, teacherId: t3.id },
    ],
  })

  // ─── Enrollments ─────────────────────────────────
  for (const c of [courses[0], courses[1], courses[2], courses[3], courses[4], courses[5]]) {
    await prisma.enrollment.create({ data: { studentId: student1.id, courseId: c.id } })
  }
  for (const c of [courses[0], courses[1], courses[2], courses[3], courses[6], courses[7]]) {
    await prisma.enrollment.create({ data: { studentId: student2.id, courseId: c.id } })
  }
  for (const c of [courses[0], courses[2], courses[3], courses[4], courses[5]]) {
    await prisma.enrollment.create({ data: { studentId: student3.id, courseId: c.id } })
  }

  // ─── Evaluations ─────────────────────────────────
  const evalData: { studentId: number; courseId: number; scores: number[]; comment: string }[] = [
    { studentId: student1.id, courseId: courses[0].id, scores: [5, 5, 4, 4, 5], comment: "王老师的课讲得非常生动，项目实践丰富，学到了很多实用的前端技术，强烈推荐！" },
    { studentId: student1.id, courseId: courses[1].id, scores: [4, 4, 3, 5, 4], comment: "张老师讲解清晰，数据库实验设计合理。期末考试难度较大，但确实考察了理解深度。" },
    { studentId: student1.id, courseId: courses[2].id, scores: [4, 4, 4, 3, 4], comment: "课程内容扎实，但实验环境配置略麻烦。张老师批改作业很认真。" },
    { studentId: student1.id, courseId: courses[3].id, scores: [5, 5, 4, 5, 5], comment: "张老师的计算机网络课是全年级口碑最好的课程之一！内容紧跟前沿，课堂互动多。" },
    { studentId: student1.id, courseId: courses[4].id, scores: [4, 5, 5, 4, 5], comment: "王老师的软件工程课注重团队协作和实际项目，对就业帮助很大。" },
    { studentId: student1.id, courseId: courses[5].id, scores: [3, 4, 3, 3, 3], comment: "高数难度较高，刘老师上课节奏偏快，有时跟不上。但答疑很耐心。" },

    { studentId: student2.id, courseId: courses[0].id, scores: [5, 5, 5, 4, 5], comment: "Web前端课让我从零基础到能独立搭建网站，王老师的项目式教学方式太好了。" },
    { studentId: student2.id, courseId: courses[1].id, scores: [5, 5, 4, 5, 5], comment: "数据库课程让我对SQL和数据建模有了深刻理解，实验课设计非常用心。" },
    { studentId: student2.id, courseId: courses[2].id, scores: [3, 3, 3, 4, 3], comment: "操作系统理论较深，希望多一些实践环节。张老师授课态度很好但内容有些枯燥。" },
    { studentId: student2.id, courseId: courses[3].id, scores: [5, 4, 4, 4, 4], comment: "计算机网络课程内容丰富，抓包实验很有趣。张老师总能解答我们的疑问。" },
    { studentId: student2.id, courseId: courses[6].id, scores: [4, 4, 4, 3, 4], comment: "AI导论让我对人工智能产生了浓厚兴趣，王老师讲课很有感染力。" },
    { studentId: student2.id, courseId: courses[7].id, scores: [4, 3, 4, 4, 4], comment: "线代课程难度适中，刘老师讲得比较清楚，但板书速度有点快。" },

    { studentId: student3.id, courseId: courses[0].id, scores: [4, 4, 4, 3, 4], comment: "前端课程实践性强，学到了很多。希望框架部分可以多讲一些。" },
    { studentId: student3.id, courseId: courses[2].id, scores: [3, 4, 3, 3, 3], comment: "操作系统课程理论偏多，实验课时间不太够用。" },
    { studentId: student3.id, courseId: courses[3].id, scores: [4, 5, 4, 4, 4], comment: "计算机网络课很有意思，老师讲解通俗易懂，抓包实验印象深刻。" },
    { studentId: student3.id, courseId: courses[4].id, scores: [5, 5, 5, 4, 5], comment: "软件工程课让我明白了团队协作的重要性，项目开发全流程实践非常宝贵。" },
    { studentId: student3.id, courseId: courses[5].id, scores: [3, 4, 3, 2, 3], comment: "高数考试比较难，希望能多一些习题课和辅导。" },
  ]

  for (const e of evalData) {
    const avg = (e.scores.reduce((a, b) => a + b, 0) / e.scores.length)
    await prisma.evaluation.create({
      data: {
        studentId: e.studentId, courseId: e.courseId,
        scoreContent: e.scores[0], scoreAttitude: e.scores[1], scoreMethod: e.scores[2],
        scoreExam: e.scores[3], scoreOverall: e.scores[4],
        avgScore: Math.round(avg * 100) / 100,
        comment: e.comment,
      },
    })
  }

  // ─── StatsReports ────────────────────────────────
  const courseEvalMap = new Map<number, { avgs: number[]; comments: string[] }>()
  for (const e of evalData) {
    if (!courseEvalMap.has(e.courseId)) { courseEvalMap.set(e.courseId, { avgs: [], comments: [] }) }
    courseEvalMap.get(e.courseId)!.avgs.push(e.scores.reduce((a, b) => a + b, 0) / 5)
    courseEvalMap.get(e.courseId)!.comments.push(e.comment)
  }

  const meaningfulWords = ["老师", "课程", "实验", "项目", "考试", "作业", "教学", "设计", "数据库", "前端", "内容", "技术", "实践", "框架", "系统", "学习", "编程", "讲解", "态度", "耐心", "经验", "方法", "丰富", "实用", "清晰", "深刻", "兴趣", "团队", "就业", "网络", "协议", "算法", "机器学习", "智能", "开发", "测试", "维护", "管理", "安全", "架构", "互动", "答疑", "协作", "项目式", "板书", "感染力", "期末", "综合", "技能", "环境", "课堂", "进度", "辅导"]

  const globalWordFreq = new Map<string, number>()
  for (const [_cid, data] of courseEvalMap) {
    const allText = data.comments.join("")
    for (const mw of meaningfulWords) {
      const count = (allText.match(new RegExp(mw, "g")) || []).length
      if (count > 0) globalWordFreq.set(mw, (globalWordFreq.get(mw) || 0) + count)
    }
  }
  const globalWordCloud = Array.from(globalWordFreq.entries()).map(([word, weight]) => ({ word, weight })).sort((a, b) => b.weight - a.weight).slice(0, 50)

  const dimensionNames = ["overall", "content", "attitude", "method", "exam"]
  for (const [courseId, data] of courseEvalMap) {
    const avgs = data.avgs
    const n = avgs.length
    const mean = avgs.reduce((a, b) => a + b, 0) / n
    const sorted = [...avgs].sort((a, b) => a - b)
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
    const variance = avgs.reduce((s, v) => s + (v - mean) ** 2, 0) / n
    const stdDev = Math.sqrt(variance)

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const e of evalData.filter(e => e.courseId === courseId)) {
      for (const s of e.scores) dist[s] = (dist[s] || 0) + 1
    }

    const courseText = data.comments.join("")
    const courseWords = meaningfulWords.map(mw => {
      const count = (courseText.match(new RegExp(mw, "g")) || []).length
      return { word: mw, weight: count }
    }).filter(w => w.weight > 0).sort((a, b) => b.weight - a.weight).slice(0, 50)

    for (const dim of dimensionNames) {
      await prisma.statsReport.create({
        data: {
          courseId, dimension: dim,
          avgScore: Math.round(mean * 100) / 100,
          median: Math.round(median * 100) / 100,
          stdDev: Math.round(stdDev * 100) / 100,
          maxScore: Math.max(...avgs), minScore: Math.min(...avgs),
          evalCount: n,
          scoreDist: JSON.stringify(dist),
          wordCloud: JSON.stringify(courseWords),
        },
      })
    }
  }

  console.log("  ✅ Courses, enrollments, evaluations, stats created")
  console.log("🎉 Seed completed!")
  console.log("")
  console.log("📋 Preset accounts (password: 123456):")
  console.log("   admin@courseeval.com     - 管理员")
  console.log("   xuhe@courseeval.com      - 徐鹤 (学生)")
  console.log("   liyang@courseeval.com    - 李阳 (学生)")
  console.log("   zhanghe@courseeval.com   - 张贺 (学生)")
  console.log("   wang@courseeval.com      - 王建国 (教师)")
  console.log("   zhang@courseeval.com     - 张丽华 (教师)")
  console.log("   liu@courseeval.com       - 刘明远 (教师)")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
