import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Clearing old data...");
  await prisma.loginLog.deleteMany();
  await prisma.statsReport.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseTeacher.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const hash = bcrypt.hashSync("123456", 10);

  // ─── Users ───────────────────────────────────────
  const admin = await createUser({ email: "admin@courseeval.com", password: hash, name: "管理员", role: "ADMIN" });
  const t1User = await createUser({ email: "wang@courseeval.com", password: hash, name: "王建国", role: "TEACHER", teacherNo: "T2001001" });
  const t2User = await createUser({ email: "zhang@courseeval.com", password: hash, name: "张丽华", role: "TEACHER", teacherNo: "T2002003" });
  const t3User = await createUser({ email: "liu@courseeval.com", password: hash, name: "刘明远", role: "TEACHER", teacherNo: "T2003015" });
  const t4User = await createUser({ email: "chen@courseeval.com", password: hash, name: "陈志远", role: "TEACHER", teacherNo: "T2004008" });
  const t5User = await createUser({ email: "sun@courseeval.com", password: hash, name: "孙晓芳", role: "TEACHER", teacherNo: "T2005012" });
  const s1 = await createUser({ email: "xuhe@courseeval.com", password: hash, name: "徐鹤", role: "STUDENT", studentNo: "20232132046" });
  const s2 = await createUser({ email: "liyang@courseeval.com", password: hash, name: "李阳", role: "STUDENT", studentNo: "20232132027" });
  const s3 = await createUser({ email: "zhanghe@courseeval.com", password: hash, name: "张贺", role: "STUDENT", studentNo: "20232132024" });
  const s4 = await createUser({ email: "zhaoyun@courseeval.com", password: hash, name: "赵云鹏", role: "STUDENT", studentNo: "20232132050" });
  console.log("✅ 11 users");

  const t1 = await prisma.teacher.create({ data: { userId: t1User.id, title: "教授", college: "计算机科学与技术学院" } });
  const t2 = await prisma.teacher.create({ data: { userId: t2User.id, title: "副教授", college: "计算机科学与技术学院" } });
  const t3 = await prisma.teacher.create({ data: { userId: t3User.id, title: "讲师", college: "数学与统计学院" } });
  const t4 = await prisma.teacher.create({ data: { userId: t4User.id, title: "教授", college: "计算机科学与技术学院" } });
  const t5 = await prisma.teacher.create({ data: { userId: t5User.id, title: "副教授", college: "外国语学院" } });

  // ─── 24 Courses ──────────────────────────────────
  const courseDefs = [
    { code: "CS301", name: "Web前端开发技术", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", desc: "学习HTML、CSS、JavaScript及现代前端框架，掌握构建交互式Web应用的核心技能。", color: "#3B82F6", t: [t1] },
    { code: "CS302", name: "数据库系统原理", credits: 4, college: "计算机科学与技术学院", semester: "2024-2025-2", desc: "涵盖关系数据库理论、SQL语言、数据库设计与优化、事务管理等核心技术。", color: "#10B981", t: [t2] },
    { code: "CS303", name: "操作系统", credits: 4, college: "计算机科学与技术学院", semester: "2024-2025-1", desc: "学习进程管理、内存管理、文件系统和设备管理等操作系统核心概念与实现原理。", color: "#F59E0B", t: [t2] },
    { code: "CS304", name: "计算机网络", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-1", desc: "系统学习TCP/IP协议栈、网络层路由、传输层协议及网络安全基础。", color: "#EF4444", t: [t2] },
    { code: "CS305", name: "软件工程", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", desc: "学习软件开发全生命周期管理，包括需求分析、系统设计、编码实现、测试与维护。", color: "#8B5CF6", t: [t1] },
    { code: "MATH201", name: "高等数学（下）", credits: 5, college: "数学与统计学院", semester: "2024-2025-2", desc: "学习多元微积分、无穷级数、常微分方程等高等数学核心内容。", color: "#EC4899", t: [t3] },
    { code: "CS306", name: "人工智能导论", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", desc: "介绍人工智能的基本概念、搜索算法、机器学习基础与神经网络入门。", color: "#06B6D4", t: [t1, t4] },
    { code: "MATH202", name: "线性代数", credits: 3, college: "数学与统计学院", semester: "2024-2025-1", desc: "学习向量空间、矩阵理论、线性变换、特征值与特征向量等基础知识。", color: "#84CC16", t: [t3] },
    { code: "CS307", name: "数据结构与算法", credits: 4, college: "计算机科学与技术学院", semester: "2024-2025-1", desc: "学习常用数据结构和经典算法，包括树、图、排序、查找、动态规划等。", color: "#64748B", t: [t4] },
    { code: "CS308", name: "编译原理", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", desc: "学习词法分析、语法分析、语义分析与代码生成等编译技术核心原理。", color: "#1E40AF", t: [t4] },
    { code: "CS309", name: "计算机组成原理", credits: 4, college: "计算机科学与技术学院", semester: "2024-2025-1", desc: "学习计算机硬件系统的组成结构，包括CPU、存储器、总线与I/O系统。", color: "#DC2626", t: [t1] },
    { code: "CS310", name: "Java程序设计", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-1", desc: "学习Java语言基础、面向对象编程、集合框架、多线程与网络编程。", color: "#EA580C", t: [t4] },
    { code: "CS311", name: "Python数据分析", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", desc: "使用Python进行数据清洗、统计分析、可视化，涵盖Pandas、Matplotlib等核心库。", color: "#2563EB", t: [t1] },
    { code: "MATH301", name: "概率论与数理统计", credits: 4, college: "数学与统计学院", semester: "2024-2025-2", desc: "学习概率基础、随机变量、抽样分布、参数估计与假设检验等。", color: "#7C3AED", t: [t3] },
    { code: "MATH302", name: "离散数学", credits: 3, college: "数学与统计学院", semester: "2024-2025-1", desc: "学习集合论、图论、组合数学、数理逻辑及其在计算机科学中的应用。", color: "#0891B2", t: [t3] },
    { code: "ENG201", name: "大学英语（三）", credits: 2, college: "外国语学院", semester: "2024-2025-1", desc: "提高英语听、说、读、写综合能力，通过四级题型训练和学术英语入门。", color: "#059669", t: [t5] },
    { code: "ENG202", name: "大学英语（四）", credits: 2, college: "外国语学院", semester: "2024-2025-2", desc: "强化学术英语阅读与写作能力，准备六级考试，提升口语表达能力。", color: "#0D9488", t: [t5] },
    { code: "CS312", name: "Linux系统管理", credits: 2, college: "计算机科学与技术学院", semester: "2024-2025-2", desc: "学习Linux操作系统的基本使用、Shell编程、系统管理与网络配置。", color: "#F97316", t: [t4] },
    { code: "CS313", name: "移动应用开发", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", desc: "学习Android/iOS应用开发基础，涵盖UI设计、数据存储与网络通信。", color: "#22D3EE", t: [t1] },
    { code: "MATH303", name: "数值分析", credits: 3, college: "数学与统计学院", semester: "2024-2025-1", desc: "学习数值逼近、数值积分、常微分方程数值解法等计算方法。", color: "#F43F5E", t: [t3] },
    { code: "ENG203", name: "商务英语", credits: 2, college: "外国语学院", semester: "2024-2025-2", desc: "学习商务场景英语应用，包括商务写作、商务谈判与跨文化交际。", color: "#6366F1", t: [t5] },
    { code: "CS314", name: "信息安全概论", credits: 3, college: "计算机科学与技术学院", semester: "2024-2025-2", desc: "学习密码学基础、网络安全、系统安全、应用安全等信息安全核心领域。", color: "#4F46E5", t: [t2] },
    { code: "PE101", name: "大学体育", credits: 1, college: "体育教学部", semester: "2024-2025-1", desc: "增强体质，培养运动习惯，可选篮球、足球、羽毛球等项目。", color: "#A3E635", t: [t2] },
    { code: "PE102", name: "大学体育", credits: 1, college: "体育教学部", semester: "2024-2025-2", desc: "继续深化运动技能，组织校内体育比赛与体能测试训练。", color: "#BEF264", t: [t2] },
  ];

  const courses = await Promise.all(
    courseDefs.map(d =>
      prisma.course.create({
        data: { code: d.code, name: d.name, credits: d.credits, college: d.college, semester: d.semester, description: d.desc, coverColor: d.color },
      })
    )
  );

  // Course-teacher links
  for (const cd of courseDefs) {
    const course = courses.find(c => c.code === cd.code)!;
    for (const teacher of cd.t) {
      await prisma.courseTeacher.create({ data: { courseId: course.id, teacherId: teacher.id } });
    }
  }

  // ─── Enrollments (each student enrolled in ~12-16 courses) ───
  // 徐鹤: enrolled in 14 courses (no evaluation for 3)
  const s1Enrolled = [0,1,2,3,4,5,6,7,8,9,10,11,12,13]; // indices
  // 李阳: enrolled in 14 courses (no evaluation for 3)
  const s2Enrolled = [0,1,2,3,4,6,7,8,9,12,13,14,15,16];
  // 张贺: enrolled in 12 courses (no evaluation for 3)
  const s3Enrolled = [0,2,3,4,5,6,8,10,11,14,15,17];
  // 赵云鹏: enrolled in 12 courses (no evaluation for 4)
  const s4Enrolled = [1,2,3,5,7,8,9,13,16,18,19,20];

  for (const idx of s1Enrolled) await prisma.enrollment.create({ data: { studentId: s1.id, courseId: courses[idx].id } });
  for (const idx of s2Enrolled) await prisma.enrollment.create({ data: { studentId: s2.id, courseId: courses[idx].id } });
  for (const idx of s3Enrolled) await prisma.enrollment.create({ data: { studentId: s3.id, courseId: courses[idx].id } });
  for (const idx of s4Enrolled) await prisma.enrollment.create({ data: { studentId: s4.id, courseId: courses[idx].id } });

  // ─── Evaluations ─────────────────────────────────
  const evalEntries: { sid: typeof s1; ci: number; ss: number[]; cm: string }[] = [
    // 徐鹤: evaluates 11 of 14 courses (leaves 3 unevaluated: indices 8, 10, 12)
    { sid: s1, ci: 0, ss: [5,5,4,4,5], cm: "王老师的课讲得非常生动，项目实践丰富，学到了很多实用的前端技术，强烈推荐！" },
    { sid: s1, ci: 1, ss: [4,4,3,5,4], cm: "张老师讲解清晰，数据库实验设计合理。期末难度较大但考察了理解深度。" },
    { sid: s1, ci: 2, ss: [4,4,4,3,4], cm: "课程内容扎实，实验环境配置略麻烦。张老师批改作业很认真。" },
    { sid: s1, ci: 3, ss: [5,5,4,5,5], cm: "张老师的计算机网络课是全年级口碑最好的课程之一！内容紧跟前沿，课堂互动多。" },
    { sid: s1, ci: 4, ss: [4,5,5,4,5], cm: "王老师的软件工程课注重团队协作和实际项目，对就业帮助很大。" },
    { sid: s1, ci: 5, ss: [3,4,3,3,3], cm: "高数难度较高，刘老师上课节奏偏快，有时跟不上。但答疑很耐心。" },
    { sid: s1, ci: 6, ss: [4,4,4,3,4], cm: "AI导论让我对人工智能产生了浓厚兴趣。课程内容丰富但需要较多数学基础。" },
    { sid: s1, ci: 7, ss: [4,3,4,4,4], cm: "线代课程难度适中，对后续课程帮助很大。刘老师讲得比较清楚。" },
    { sid: s1, ci: 9, ss: [3,4,3,3,3], cm: "编译原理较难，陈老师的课件做得很好。希望多一些上机实验。" },
    { sid: s1, ci: 11, ss: [5,4,4,4,5], cm: "Java课非常实用，陈老师讲面向对象概念深入浅出。项目作业设计得很好。" },
    { sid: s1, ci: 13, ss: [3,4,4,3,4], cm: "概率统计课公式多，刘老师很耐心。希望多一些例题讲解。" },

    // 李阳: evaluates 11 of 14 (leaves 3 unevaluated: 8, 10, 14)
    { sid: s2, ci: 0, ss: [5,5,5,4,5], cm: "Web前端课让我从零基础到能独立搭建网站，王老师教学方式太好了。" },
    { sid: s2, ci: 1, ss: [5,5,4,5,5], cm: "数据库课程让我对SQL和数据建模有了深刻理解，实验课设计非常用心。" },
    { sid: s2, ci: 2, ss: [3,3,3,4,3], cm: "操作系统理论较深，希望多一些实践环节。张老师授课态度好但内容较枯燥。" },
    { sid: s2, ci: 3, ss: [5,4,4,4,4], cm: "计算机网络课程内容丰富，抓包实验很有趣。张老师总能解答疑问。" },
    { sid: s2, ci: 4, ss: [4,5,4,4,4], cm: "软件工程课团队项目收获很大，但项目文档要求偏多。" },
    { sid: s2, ci: 6, ss: [4,4,4,3,4], cm: "AI导论很前沿，王老师和陈老师联合授课各有特色。" },
    { sid: s2, ci: 7, ss: [4,3,3,4,3], cm: "线代课刘老师讲得还算清楚，但有些抽象概念理解起来困难。" },
    { sid: s2, ci: 9, ss: [4,3,4,3,4], cm: "编译原理需要较强理论基础。陈老师很有耐心地解答问题。" },
    { sid: s2, ci: 12, ss: [4,4,4,4,4], cm: "Python数据分析课非常实用，学完直接能用在其他课程的项目里。" },
    { sid: s2, ci: 13, ss: [5,4,3,4,4], cm: "概率课公式推导很细致，考试难度适中，刘老师给分公正。" },
    { sid: s2, ci: 16, ss: [4,4,4,4,4], cm: "Linux课虽然只有两个学分但内容很实在，学会了很多命令行技巧。" },

    // 张贺: evaluates 9 of 12 (leaves 3 unevaluated: 8, 14, 17)
    { sid: s3, ci: 0, ss: [4,4,4,3,4], cm: "前端课程实践性强，学到了很多。希望框架部分可以多讲一些。" },
    { sid: s3, ci: 2, ss: [3,4,3,3,3], cm: "操作系统课程理论偏多，实验课时间不太够用。" },
    { sid: s3, ci: 3, ss: [4,5,4,4,4], cm: "计算机网络课很有意思，老师讲解通俗易懂，抓包实验印象深刻。" },
    { sid: s3, ci: 4, ss: [5,5,5,4,5], cm: "软件工程课让我明白了团队协作的重要性，项目开发全流程实践非常宝贵。" },
    { sid: s3, ci: 5, ss: [3,4,3,2,3], cm: "高数考试比较难，希望能多一些习题课和辅导。" },
    { sid: s3, ci: 6, ss: [4,4,4,3,4], cm: "AI导论课程非常前沿，两位老师配合得很好。" },
    { sid: s3, ci: 10, ss: [4,4,3,3,4], cm: "计组课陈老师讲得很细，实验用Verilog挺有意思。" },
    { sid: s3, ci: 11, ss: [4,5,5,5,5], cm: "Java是这学期最喜欢的课！项目作业做了一个图书管理系统，很有成就感。" },
    { sid: s3, ci: 15, ss: [3,3,4,3,3], cm: "英语课孙老师很认真，但对我来说四级已过，课程内容偏简单了。" },

    // 赵云鹏: evaluates 8 of 12 (leaves 4 unevaluated: 2, 8, 13, 19)
    { sid: s4, ci: 1, ss: [5,4,5,5,5], cm: "数据库课程质量很高，张老师的SQL讲解让人茅塞顿开！" },
    { sid: s4, ci: 3, ss: [4,4,3,3,3], cm: "计算机网络课内容很多，需要课后大量时间消化。实验课能再多一些就好了。" },
    { sid: s4, ci: 5, ss: [2,3,3,2,2], cm: "高数真的太难了，刘老师讲得再好我也跟不上。希望能增加基础补习。" },
    { sid: s4, ci: 7, ss: [3,4,3,3,3], cm: "线代课中等难度，考试比较友好。但行列式那部分讲得略快。" },
    { sid: s4, ci: 9, ss: [3,3,2,3,3], cm: "编译原理很难理解，希望多从工程应用角度来讲授。" },
    { sid: s4, ci: 16, ss: [5,5,4,5,5], cm: "Linux课学的东西都是实际工作中一定用得上的，强烈推荐！" },
    { sid: s4, ci: 18, ss: [4,4,5,4,5], cm: "移动开发课非常有趣，做了一个天气App，很有成就感。" },
    { sid: s4, ci: 20, ss: [4,5,4,4,5], cm: "商务英语孙老师口语特别好，课堂轻松有趣，收获很大。" },
  ];

  for (const e of evalEntries) {
    const avg = e.ss.reduce((a, b) => a + b, 0) / 5;
    await prisma.evaluation.create({
      data: {
        studentId: e.sid.id, courseId: courses[e.ci].id,
        scoreContent: e.ss[0], scoreAttitude: e.ss[1], scoreMethod: e.ss[2],
        scoreExam: e.ss[3], scoreOverall: e.ss[4],
        avgScore: Math.round(avg * 100) / 100, comment: e.cm,
      },
    });
  }

  // ─── StatsReports ────────────────────────────────
  const evalData = evalEntries;
  const courseEvalMap = new Map<number, { avgs: number[]; comments: string[] }>();
  for (const e of evalData) {
    if (!courseEvalMap.has(e.ci)) courseEvalMap.set(e.ci, { avgs: [], comments: [] });
    courseEvalMap.get(e.ci)!.avgs.push(e.ss.reduce((a, b) => a + b, 0) / 5);
    courseEvalMap.get(e.ci)!.comments.push(e.cm);
  }

  const meaningfulWords = [
    "老师", "课程", "实验", "项目", "考试", "作业", "教学", "设计", "数据库", "前端", "内容",
    "技术", "实践", "框架", "系统", "学习", "编程", "讲解", "态度", "耐心", "经验", "方法",
    "丰富", "实用", "清晰", "深刻", "兴趣", "团队", "就业", "网络", "协议", "算法",
    "机器学习", "智能", "开发", "测试", "维护", "管理", "安全", "架构", "互动", "答疑",
    "协作", "项目式", "板书", "感染力", "期末", "综合", "技能", "课堂", "进度", "辅导",
    "命令行", "App", "PPT", "课件", "板书", "例题", "难度", "基础", "复习", "习题",
    "软件工程", "数据结构", "SQL", "Java", "Python", "Linux", "编译", "计组", "英语",
  ];

  const dims = ["overall", "content", "attitude", "method", "exam"];
  for (const [ci, data] of courseEvalMap) {
    const avgs = data.avgs;
    const n = avgs.length;
    const mean = avgs.reduce((a, b) => a + b, 0) / n;
    const sorted = [...avgs].sort((a, b) => a - b);
    const med = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const vari = avgs.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const e of evalData.filter(e => e.ci === ci)) {
      for (const s of e.ss) dist[s] = (dist[s] || 0) + 1;
    }

    const text = data.comments.join("");
    const cw = meaningfulWords.map(w => ({ word: w, weight: (text.match(new RegExp(w, "g")) || []).length })).filter(w => w.weight > 0).sort((a, b) => b.weight - a.weight).slice(0, 50);

    for (const dim of dims) {
      await prisma.statsReport.create({
        data: {
          courseId: courses[ci].id, dimension: dim,
          avgScore: Math.round(mean * 100) / 100, median: Math.round(med * 100) / 100,
          stdDev: Math.round(Math.sqrt(vari) * 100) / 100,
          maxScore: Math.max(...avgs), minScore: Math.min(...avgs),
          evalCount: n, scoreDist: JSON.stringify(dist), wordCloud: JSON.stringify(cw),
        },
      });
    }
  }

  console.log("🎉 Seed done! 24 courses, 11 users, 39 evaluations");
  console.log("📋 Preset accounts (password: 123456):");
  console.log("   admin@courseeval.com | xuhe@courseeval.com | wang@courseeval.com");
}

async function createUser(d: any) { return prisma.user.create({ data: d }); }

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
