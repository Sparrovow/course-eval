import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("📡 Connected to Supabase PostgreSQL!")

  // Create tables via raw SQL
  const sqls = [
    `CREATE TABLE IF NOT EXISTS "User" (
      id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      name TEXT NOT NULL, role TEXT NOT NULL, "studentNo" TEXT UNIQUE,
      "teacherNo" TEXT UNIQUE, "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "Teacher" (
      id SERIAL PRIMARY KEY, "userId" INT UNIQUE REFERENCES "User"(id),
      title TEXT NOT NULL, college TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "Course" (
      id SERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      credits FLOAT NOT NULL, college TEXT NOT NULL, semester TEXT NOT NULL,
      description TEXT NOT NULL, "coverColor" TEXT DEFAULT '#3B82F6',
      "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "CourseTeacher" (
      id SERIAL PRIMARY KEY, "courseId" INT REFERENCES "Course"(id),
      "teacherId" INT REFERENCES "Teacher"(id),
      UNIQUE("courseId", "teacherId")
    )`,
    `CREATE TABLE IF NOT EXISTS "Enrollment" (
      id SERIAL PRIMARY KEY, "studentId" INT REFERENCES "User"(id),
      "courseId" INT REFERENCES "Course"(id),
      UNIQUE("studentId", "courseId")
    )`,
    `CREATE TABLE IF NOT EXISTS "Evaluation" (
      id SERIAL PRIMARY KEY, "studentId" INT REFERENCES "User"(id),
      "courseId" INT REFERENCES "Course"(id),
      "scoreContent" INT NOT NULL, "scoreAttitude" INT NOT NULL,
      "scoreMethod" INT NOT NULL, "scoreExam" INT NOT NULL,
      "scoreOverall" INT NOT NULL, "avgScore" FLOAT NOT NULL,
      comment TEXT, "isAnonymous" BOOLEAN DEFAULT false,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("studentId", "courseId")
    )`,
    `CREATE TABLE IF NOT EXISTS "StatsReport" (
      id SERIAL PRIMARY KEY, "courseId" INT REFERENCES "Course"(id),
      dimension TEXT NOT NULL, "avgScore" FLOAT NOT NULL,
      median FLOAT NOT NULL, "stdDev" FLOAT NOT NULL,
      "maxScore" FLOAT NOT NULL, "minScore" FLOAT NOT NULL,
      "evalCount" INT NOT NULL, "scoreDist" TEXT NOT NULL,
      "wordCloud" TEXT, "generatedAt" TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "LoginLog" (
      id SERIAL PRIMARY KEY, "userId" INT REFERENCES "User"(id),
      ip TEXT DEFAULT '', "userAgent" TEXT DEFAULT '',
      success BOOLEAN NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "SystemConfig" (
      id SERIAL PRIMARY KEY, key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW()
    )`,
  ]

  for (const sql of sqls) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch (e: any) {
      if (!e.message.includes("already exists")) {
        console.log("⚠️  SQL error:", e.message.slice(0, 80))
      }
    }
  }
  console.log("✅ Tables created")

  // Check if already seeded
  const existing = await prisma.$queryRawUnsafe<[{c: bigint}]>(`SELECT COUNT(*) as c FROM "User"`)
  if (Number(existing[0].c) > 0) {
    console.log("📋 Data already exists, skipping seed")
    console.log("🎉 Done!")
    return
  }

  // Seed data
  const hash = bcrypt.hashSync("123456", 10)

  const admin = await prisma.user.create({ data: { email: "admin@courseeval.com", password: hash, name: "管理员", role: "ADMIN" } })
  const teacher1 = await prisma.user.create({ data: { email: "wang@courseeval.com", password: hash, name: "王建国", role: "TEACHER", teacherNo: "T2001001" } })
  const teacher2 = await prisma.user.create({ data: { email: "zhang@courseeval.com", password: hash, name: "张丽华", role: "TEACHER", teacherNo: "T2002003" } })
  const teacher3 = await prisma.user.create({ data: { email: "liu@courseeval.com", password: hash, name: "刘明远", role: "TEACHER", teacherNo: "T2003015" } })
  const student1 = await prisma.user.create({ data: { email: "xuhe@courseeval.com", password: hash, name: "徐鹤", role: "STUDENT", studentNo: "20232132046" } })
  const student2 = await prisma.user.create({ data: { email: "liyang@courseeval.com", password: hash, name: "李阳", role: "STUDENT", studentNo: "20232132027" } })
  const student3 = await prisma.user.create({ data: { email: "zhanghe@courseeval.com", password: hash, name: "张贺", role: "STUDENT", studentNo: "20232132024" } })

  const t1 = await prisma.teacher.create({ data: { userId: teacher1.id, title: "教授", college: "计算机科学与技术学院" } })
  const t2 = await prisma.teacher.create({ data: { userId: teacher2.id, title: "副教授", college: "计算机科学与技术学院" } })
  const t3 = await prisma.teacher.create({ data: { userId: teacher3.id, title: "讲师", college: "数学与统计学院" } })

  const courses = await Promise.all([
    prisma.course.create({ data: { code: "CS301", name: "Web前端开发技术", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", description: "学习HTML、CSS、JavaScript及现代前端框架。", coverColor: "#3B82F6" } }),
    prisma.course.create({ data: { code: "CS302", name: "数据库系统原理", credits: 4, college: "计算机科学与技术学院", semester: "2024-2025-2", description: "关系数据库理论、SQL、设计与优化。", coverColor: "#10B981" } }),
    prisma.course.create({ data: { code: "CS303", name: "操作系统", credits: 4, college: "计算机科学与技术学院", semester: "2024-2025-1", description: "进程管理、内存管理、文件系统。", coverColor: "#F59E0B" } }),
    prisma.course.create({ data: { code: "CS304", name: "计算机网络", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-1", description: "TCP/IP协议栈、路由、传输层协议。", coverColor: "#EF4444" } }),
    prisma.course.create({ data: { code: "CS305", name: "软件工程", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", description: "软件开发全生命周期管理。", coverColor: "#8B5CF6" } }),
    prisma.course.create({ data: { code: "MATH201", name: "高等数学（下）", credits: 5, college: "数学与统计学院", semester: "2024-2025-2", description: "多元微积分、无穷级数、微分方程。", coverColor: "#EC4899" } }),
    prisma.course.create({ data: { code: "CS306", name: "人工智能导论", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", description: "AI基本概念、搜索、机器学习入门。", coverColor: "#06B6D4" } }),
    prisma.course.create({ data: { code: "MATH202", name: "线性代数", credits: 3, college: "数学与统计学院", semester: "2024-2025-1", description: "向量空间、矩阵理论、线性变换。", coverColor: "#84CC16" } }),
  ])

  await prisma.courseTeacher.createMany({
    data: [
      { courseId: courses[0].id, teacherId: t1.id }, { courseId: courses[4].id, teacherId: t1.id }, { courseId: courses[6].id, teacherId: t1.id },
      { courseId: courses[1].id, teacherId: t2.id }, { courseId: courses[2].id, teacherId: t2.id }, { courseId: courses[3].id, teacherId: t2.id },
      { courseId: courses[5].id, teacherId: t3.id }, { courseId: courses[7].id, teacherId: t3.id },
    ],
  })

  // Enrollments
  for (const c of [courses[0], courses[1], courses[2], courses[3], courses[4], courses[5]]) {
    await prisma.enrollment.create({ data: { studentId: student1.id, courseId: c.id } })
  }
  for (const c of [courses[0], courses[1], courses[2], courses[3], courses[6], courses[7]]) {
    await prisma.enrollment.create({ data: { studentId: student2.id, courseId: c.id } })
  }
  for (const c of [courses[0], courses[2], courses[3], courses[4], courses[5]]) {
    await prisma.enrollment.create({ data: { studentId: student3.id, courseId: c.id } })
  }

  const evalData: { studentId: number; courseId: number; scores: number[]; comment: string }[] = [
    { studentId: student1.id, courseId: courses[0].id, scores: [5, 5, 4, 4, 5], comment: "王老师的课讲得非常生动，项目实践丰富，学到了很多实用的前端技术，强烈推荐！" },
    { studentId: student1.id, courseId: courses[1].id, scores: [4, 4, 3, 5, 4], comment: "张老师讲解清晰，数据库实验设计合理。期末考试难度较大。" },
    { studentId: student1.id, courseId: courses[2].id, scores: [4, 4, 4, 3, 4], comment: "课程内容扎实，但实验环境配置略麻烦。张老师批改作业很认真。" },
    { studentId: student1.id, courseId: courses[3].id, scores: [5, 5, 4, 5, 5], comment: "张老师的计算机网络课是全年级口碑最好的课程之一！内容紧跟前沿。" },
    { studentId: student1.id, courseId: courses[4].id, scores: [4, 5, 5, 4, 5], comment: "王老师的软件工程课注重团队协作和实际项目，对就业帮助很大。" },
    { studentId: student1.id, courseId: courses[5].id, scores: [3, 4, 3, 3, 3], comment: "高数难度较高，刘老师上课节奏偏快。但答疑很耐心。" },
    { studentId: student2.id, courseId: courses[0].id, scores: [5, 5, 5, 4, 5], comment: "Web前端课让我从零基础到能独立搭建网站，王老师的项目式教学方式太好了。" },
    { studentId: student2.id, courseId: courses[1].id, scores: [5, 5, 4, 5, 5], comment: "数据库课程让我对SQL和数据建模有了深刻理解，实验课设计非常用心。" },
    { studentId: student2.id, courseId: courses[2].id, scores: [3, 3, 3, 4, 3], comment: "操作系统理论较深，希望多一些实践环节。张老师授课态度好但内容有些枯燥。" },
    { studentId: student2.id, courseId: courses[3].id, scores: [5, 4, 4, 4, 4], comment: "计算机网络课程内容丰富，抓包实验很有趣。张老师总能解答疑问。" },
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
        avgScore: Math.round(avg * 100) / 100, comment: e.comment,
      },
    })
  }

  // Stats
  const courseEvalMap = new Map<number, { avgs: number[]; comments: string[] }>()
  for (const e of evalData) {
    if (!courseEvalMap.has(e.courseId)) courseEvalMap.set(e.courseId, { avgs: [], comments: [] })
    courseEvalMap.get(e.courseId)!.avgs.push(e.scores.reduce((a, b) => a + b, 0) / 5)
    courseEvalMap.get(e.courseId)!.comments.push(e.comment)
  }

  const meaningfulWords = ["老师", "课程", "实验", "项目", "考试", "作业", "教学", "设计", "数据库", "前端", "内容", "技术", "实践", "框架", "系统", "学习", "编程", "讲解", "态度", "耐心", "经验", "方法", "丰富", "实用", "清晰", "深刻"]
  const dims = ["overall", "content", "attitude", "method", "exam"]

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
    const cw = meaningfulWords.map(w => ({ word: w, weight: (courseText.match(new RegExp(w, "g")) || []).length })).filter(w => w.weight > 0).sort((a, b) => b.weight - a.weight).slice(0, 50)

    for (const dim of dims) {
      await prisma.statsReport.create({
        data: {
          courseId, dimension: dim,
          avgScore: Math.round(mean * 100) / 100, median: Math.round(median * 100) / 100,
          stdDev: Math.round(stdDev * 100) / 100, maxScore: Math.max(...avgs), minScore: Math.min(...avgs),
          evalCount: n, scoreDist: JSON.stringify(dist), wordCloud: JSON.stringify(cw),
        },
      })
    }
  }

  console.log("✅ Data seeded")
  console.log("🎉 Done! Supabase is ready.")
  console.log("")
  console.log("📋 Preset accounts (password: 123456):")
  console.log("   admin@courseeval.com     - 管理员")
  console.log("   xuhe@courseeval.com      - 学生·徐鹤")
  console.log("   wang@courseeval.com      - 教师·王建国")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => { prisma.$disconnect(); pool.end() })
