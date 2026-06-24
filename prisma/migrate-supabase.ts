import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Common Chinese comments for realistic evaluation text
const positiveComments = [
  "老师讲课生动有趣，课堂气氛活跃，学到了很多实用的知识。",
  "课程内容充实，理论与实践结合得很好，收获很大。",
  "老师备课认真，讲解清晰易懂，对学生的提问很有耐心。",
  "这门课让我对这个领域产生了浓厚的兴趣，非常推荐！",
  "课程安排合理，难度适中，考试也比较公平。",
  "老师经验丰富，案例讲解很有启发性。",
  "课程设计很好，实验和作业都能巩固课堂所学。",
  "整体来说是一门高质量的课程，学到了真本事。",
  "老师很负责，课后答疑也很及时。",
  "课件做得好，重点突出，复习起来很方便。",
  "这门课对我未来的职业发展很有帮助。",
  "教学内容紧跟前沿，老师自己的研究也融入课堂。",
  "课堂互动多，不是照本宣科，体验很好。",
  "老师对课程内容的把握很到位，深入浅出。",
  "课程项目设计很有意思，动手实践机会多。",
]
const neutralComments = [
  "课程整体还行，但有些地方讲得偏快，需要课后自己补充。",
  "内容比较抽象，希望能多举一些实际应用的例子。",
  "老师讲得算清楚，但课堂互动偏少，略显枯燥。",
  "教材选得一般，有些章节组织的逻辑不太清晰。",
  "课程难度偏高，考试需要有更多的复习资料。",
  "内容有深度但不够广度，可以补充一些相关领域知识。",
  "整体可以接受，但实验环境有时候不太稳定。",
  "老师态度挺好，但授课方式比较传统。",
]
const negativeComments = [
  "课程内容陈旧，跟不上行业发展，希望能更新。",
  "老师讲得太快，基础差的同学完全跟不上节奏。",
  "考试难度大，平时讲的内容和考试内容差距较大。",
  "课程安排不合理，理论太多实践太少。",
  "课本和课件不一致，复习起来很麻烦。",
]

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]): T { return arr[randInt(0, arr.length - 1)] }

function getCollege(code: string): string {
  if (code.startsWith("CS")) return "计算机科学与技术学院";
  if (code.startsWith("MATH")) return "数学与统计学院";
  if (code.startsWith("ENG")) return "外国语学院";
  if (code.startsWith("MGMT")) return "经济管理学院";
  if (code.startsWith("EE")) return "电子信息工程学院";
  if (code.startsWith("HUM")) return "人文学院";
  return "计算机科学与技术学院";
}


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
  const admin = await prisma.user.create({ data: { email: "admin@courseeval.com", password: hash, name: "管理员", role: "ADMIN" } });

  // Real teachers (8)
  const tUsers = [
    { email: "wang@courseeval.com", name: "王建国", tno: "T2001001", title: "教授", college: "计算机科学与技术学院" },
    { email: "zhang@courseeval.com", name: "张丽华", tno: "T2002003", title: "副教授", college: "计算机科学与技术学院" },
    { email: "liu@courseeval.com", name: "刘明远", tno: "T2003015", title: "讲师", college: "数学与统计学院" },
    { email: "chen@courseeval.com", name: "陈志远", tno: "T2004008", title: "教授", college: "计算机科学与技术学院" },
    { email: "sun@courseeval.com", name: "孙晓芳", tno: "T2005012", title: "副教授", college: "外国语学院" },
    { email: "zhou@courseeval.com", name: "周博文", tno: "T2006019", title: "教授", college: "电子信息工程学院" },
    { email: "wu@courseeval.com", name: "吴雅琴", tno: "T2007022", title: "副教授", college: "经济管理学院" },
    { email: "zhao_t@courseeval.com", name: "赵天宇", tno: "T2008030", title: "讲师", college: "人文学院" },
  ];
  const tUserObjs = [];
  for (const t of tUsers) {
    tUserObjs.push(await prisma.user.create({ data: { email: t.email, password: hash, name: t.name, role: "TEACHER", teacherNo: t.tno } }));
  }
  console.log(`✅ ${tUserObjs.length} teachers`);

  // Test students (4 real user accounts)
  const testStudents = [
    { email: "xuhe@courseeval.com", name: "徐鹤", sno: "20232132046" },
    { email: "liyang@courseeval.com", name: "李阳", sno: "20232132027" },
    { email: "zhanghe@courseeval.com", name: "张贺", sno: "20232132024" },
    { email: "zhaoyun@courseeval.com", name: "赵云鹏", sno: "20232132050" },
  ];
  const testStudentObjs = [];
  for (const s of testStudents) {
    testStudentObjs.push(await prisma.user.create({ data: { email: s.email, password: hash, name: s.name, role: "STUDENT", studentNo: s.sno } }));
  }

  // Virtual students (40, no login accounts)
  const virtualStudentNames = [
    "王磊", "陈静", "赵鑫", "黄思雨", "周涛",
    "吴芳", "郑浩然", "冯雪", "褚明哲", "蒋雨桐",
    "沈逸飞", "韩梅", "杨柳", "朱晓明", "马丽",
    "胡兵", "林黛", "何平", "郭瑞", "蔡琴",
    "潘岳", "董浩", "卢芳", "钱进", "汤唯",
    "范伟", "彭博", "鲁豫", "韦小宝", "苗苗",
    "花荣", "任光", "姜华", "姚明", "孟飞",
    "秦岚", "尹航", "余欢", "邹市", "许晴",
  ];
  const VIRTUAL_COUNT = 40;
  const virtualStudentObjs = [];
  for (let i = 0; i < VIRTUAL_COUNT; i++) {
    const sno = `20232132${String(100 + i)}`;
    virtualStudentObjs.push(await prisma.user.create({
      data: { email: `student${i + 5}@courseeval.com`, password: hash, name: virtualStudentNames[i], role: "STUDENT", studentNo: sno },
    }));
  }
  console.log(`✅ ${testStudentObjs.length} test + ${virtualStudentObjs.length} virtual students`);
  const allStudents = [...testStudentObjs, ...virtualStudentObjs];

  // ─── Teachers ────────────────────────────────────
  const teachers = [];
  for (let i = 0; i < tUsers.length; i++) {
    teachers.push(await prisma.teacher.create({ data: { userId: tUserObjs[i].id, title: tUsers[i].title, college: tUsers[i].college } }));
  }

  // ─── 80 Courses ──────────────────────────────────
  const courseData: { code: string; name: string; credits: number; college: string; semester: string; desc: string; color: string; teacherIdx: number }[] = [];

  // Computer Science (30 courses)
  const csCourses = [
    ["CS301","Web前端开发技术",3,"2024-2025-2","HTML/CSS/JS及现代前端框架",0],
    ["CS302","数据库系统原理",4,"2024-2025-2","关系数据库理论、SQL、设计与优化",1],
    ["CS303","操作系统",4,"2024-2025-1","进程管理、内存管理、文件系统",1],
    ["CS304","计算机网络",3,"2024-2025-1","TCP/IP协议栈、路由、传输层",1],
    ["CS305","软件工程",3,"2024-2025-2","软件开发生命周期管理",0],
    ["CS306","人工智能导论",3,"2024-2025-2","AI基本概念、搜索、机器学习入门",3],
    ["CS307","数据结构与算法",4,"2024-2025-1","常用数据结构和经典算法",3],
    ["CS308","编译原理",3,"2024-2025-2","词法分析、语法分析、代码生成",3],
    ["CS309","计算机组成原理",4,"2024-2025-1","CPU、存储器、总线与I/O系统",0],
    ["CS310","Java程序设计",3,"2024-2025-1","面向对象编程、集合框架、多线程",3],
    ["CS311","Python数据分析",3,"2024-2025-2","Pandas、Matplotlib数据科学",0],
    ["CS312","Linux系统管理",2,"2024-2025-2","Shell编程、系统管理",3],
    ["CS313","移动应用开发",3,"2024-2025-2","Android/iOS应用开发基础",0],
    ["CS314","信息安全概论",3,"2024-2025-2","密码学、网络安全、应用安全",1],
    ["CS315","云计算技术",3,"2024-2025-1","虚拟化、容器化、云服务架构",3],
    ["CS316","数据挖掘",3,"2024-2025-2","聚类、分类、关联规则挖掘",1],
    ["CS317","计算机图形学",3,"2024-2025-1","光照模型、渲染管线、着色器",0],
    ["CS318","分布式系统",3,"2024-2025-2","分布式一致性、分布式存储",3],
    ["CS319","软件测试",2,"2024-2025-1","测试方法论、自动化测试框架",1],
    ["CS320","嵌入式系统",3,"2024-2025-2","单片机、RTOS、传感器接口",0],
    ["CS321","区块链原理",3,"2024-2025-2","共识算法、智能合约、分布式账本",0],
    ["CS322","数字图像处理",3,"2024-2025-1","滤波、变换、特征提取",1],
    ["CS323","模式识别",3,"2024-2025-2","特征工程、分类器设计、聚类",3],
    ["CS324","虚拟现实技术",2,"2024-2025-1","VR/AR原理、3D渲染、交互设计",0],
    ["CS325","自然语言处理",3,"2024-2025-2","词法分析、语义理解、大语言模型",1],
    ["CS326","计算机网络管理",2,"2024-2025-2","网管协议、故障诊断、性能管理",0],
    ["CS327","并行计算",3,"2024-2025-1","OpenMP、MPI、GPU编程",3],
    ["CS328","软件项目管理",2,"2024-2025-2","敏捷开发、项目规划、风险管理",1],
    ["CS329","物联网技术",3,"2024-2025-2","传感器网络、RFID、边缘计算",0],
    ["CS330","深度学习",3,"2024-2025-2","CNN、RNN、Transformer架构",1],
  ];

  // Math & Stats (15 courses)
  const mathCourses = [
    ["MATH201","高等数学（上）",5,"2024-2025-1","极限、导数、一元微积分",2],
    ["MATH202","高等数学（下）",5,"2024-2025-2","多元微积分、无穷级数",2],
    ["MATH203","线性代数",3,"2024-2025-1","向量空间、矩阵理论",2],
    ["MATH204","概率论与数理统计",4,"2024-2025-2","概率基础、抽样分布、假设检验",2],
    ["MATH205","离散数学",3,"2024-2025-1","集合论、图论、数理逻辑",2],
    ["MATH206","数值分析",3,"2024-2025-1","数值逼近、数值积分",2],
    ["MATH207","数学建模",3,"2024-2025-2","模型构建、优化算法、MATLAB",2],
    ["MATH208","复变函数",3,"2024-2025-1","复积分、级数、留数定理",2],
    ["MATH209","常微分方程",3,"2024-2025-2","初值问题、稳定性分析",2],
    ["MATH210","运筹学",3,"2024-2025-2","线性规划、网络优化、决策分析",2],
    ["MATH211","抽象代数",3,"2024-2025-1","群论、环论、域论",2],
    ["MATH212","实变函数",3,"2024-2025-2","测度论、勒贝格积分",2],
    ["MATH213","拓扑学",3,"2024-2025-1","点集拓扑、连续映射",2],
    ["MATH214","时间序列分析",3,"2024-2025-2","ARIMA、GARCH、预测",2],
    ["MATH215","多元统计分析",3,"2024-2025-2","主成分分析、因子分析、聚类",2],
  ];

  // Foreign Languages (12 courses)
  const engCourses = [
    ["ENG201","大学英语（一）",2,"2024-2025-1","英语听、说、读、写综合能力",4],
    ["ENG202","大学英语（二）",2,"2024-2025-2","四级题型训练、学术英语入门",4],
    ["ENG203","大学英语（三）",2,"2024-2025-1","学术英语阅读与写作",4],
    ["ENG204","大学英语（四）",2,"2024-2025-2","六级备考、口语表达提升",4],
    ["ENG205","商务英语",2,"2024-2025-2","商务场景英语、跨文化交际",4],
    ["ENG206","英美文学选读",3,"2024-2025-1","经典作品赏析、文学批评入门",4],
    ["ENG207","翻译理论与实践",2,"2024-2025-2","英汉互译技巧、CAT工具",4],
    ["ENG208","日语（二外）",2,"2024-2025-1","五十音图、基础语法、日常会话",4],
    ["ENG209","法语（二外）",2,"2024-2025-2","发音、基础语法、法国文化",4],
    ["ENG210","英语演讲与辩论",2,"2024-2025-2","演讲技巧、辩论策略、即兴发挥",4],
    ["ENG211","跨文化交际",2,"2024-2025-1","文化差异、非语言交际、适应策略",4],
    ["ENG212","英语写作",2,"2024-2025-2","学术写作、邮件写作、报告撰写",4],
  ];

  // Economics & Management (10 courses)
  const mgmtCourses = [
    ["MGMT301","管理学原理",3,"2024-2025-1","管理理论、组织行为、决策分析",5],
    ["MGMT302","微观经济学",3,"2024-2025-1","供需理论、市场结构、博弈论",5],
    ["MGMT303","宏观经济学",3,"2024-2025-2","GDP、通货膨胀、货币政策",5],
    ["MGMT304","会计学基础",3,"2024-2025-2","财务报表、借贷记账、成本核算",5],
    ["MGMT305","市场营销学",3,"2024-2025-2","营销策略、品牌管理、消费者行为",5],
    ["MGMT306","人力资源管理",2,"2024-2025-1","招聘、绩效管理、薪酬设计",5],
    ["MGMT307","财务管理",3,"2024-2025-2","资本预算、融资决策、股利政策",5],
    ["MGMT308","电子商务",3,"2024-2025-2","电商模式、电子支付、网络营销",5],
    ["MGMT309","供应链管理",2,"2024-2025-1","采购管理、库存控制、物流规划",5],
    ["MGMT310","创业管理",2,"2024-2025-2","商业计划书、融资策略、团队组建",5],
  ];

  // Electronics & Information Engineering (8 courses)
  const eeCourses = [
    ["EE401","电路分析基础",3,"2024-2025-1","电路定理、时域分析、频域分析",6],
    ["EE402","数字电路与逻辑设计",3,"2024-2025-2","组合逻辑、时序逻辑、HDL设计",6],
    ["EE403","通信原理",4,"2024-2025-2","调制解调、信道编码、信息论",6],
    ["EE404","信号与系统",3,"2024-2025-1","连续信号、傅里叶变换、拉氏变换",6],
    ["EE405","电磁场与电磁波",3,"2024-2025-2","麦克斯韦方程、传输线、天线",6],
    ["EE406","嵌入式系统设计",3,"2024-2025-2","ARM架构、RTOS、设备驱动开发",6],
    ["EE407","数字信号处理",3,"2024-2025-1","DFT、FFT、数字滤波器设计",6],
    ["EE408","光纤通信",2,"2024-2025-2","光纤原理、光器件、SDH/WDM",6],
  ];

  // Humanities (5 courses)
  const humCourses = [
    ["HUM501","中国近现代史纲要",2,"2024-2025-1","近代中国历史变迁与经验教训",7],
    ["HUM502","马克思主义基本原理",3,"2024-2025-2","辩证唯物主义、政治经济学",7],
    ["HUM503","思想道德与法治",2,"2024-2025-1","社会主义核心价值观、法律基础",7],
    ["HUM504","大学语文",2,"2024-2025-2","经典文学作品赏析、应用文写作",7],
    ["HUM505","心理学导论",2,"2024-2025-2","认知、情绪、人格、社会心理学",7],
  ];

  const allCourseDefs = [...csCourses, ...mathCourses, ...engCourses, ...mgmtCourses, ...eeCourses, ...humCourses];
  const colors = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#64748B","#1E40AF","#DC2626","#EA580C","#2563EB","#7C3AED","#0891B2","#059669","#0D9488","#F97316","#22D3EE","#F43F5E","#6366F1","#4F46E5","#A3E635","#BEF264","#E11D48","#9333EA","#0284C7","#4F46E5","#C026D3","#65A30D","#0EA5E9","#78716C","#D946EF","#14B8A6","#F97316","#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#06B6D4","#84CC16","#64748B","#DC2626","#EA580C","#2563EB","#7C3AED","#0891B2","#059669","#0D9488","#F97316","#22D3EE","#F43F5E","#6366F1","#4F46E5","#A3E635","#BEF264","#E11D48","#9333EA","#0284C7","#4F46E5","#C026D3","#65A30D","#0EA5E9","#78716C","#D946EF","#14B8A6","#F97316","#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#64748B","#1E40AF"];

  for (let i = 0; i < allCourseDefs.length; i++) {
    const d = allCourseDefs[i];
    courseData.push({
      code: d[0] as string, name: d[1] as string, credits: d[2] as number, semester: d[3] as string, desc: d[4] as string,
      college: getCollege(d[0] as string), color: colors[i % colors.length], teacherIdx: d[5] as number,
    });
  }

  const courses = [];
  for (const cd of courseData) {
    courses.push(await prisma.course.create({
      data: { code: cd.code, name: cd.name, credits: cd.credits, college: cd.college, semester: cd.semester, description: cd.desc || "", coverColor: cd.color },
    }));
  }
  console.log(`✅ ${courses.length} courses`);

  // ─── Course-Teacher links ──────────────────
  for (let i = 0; i < courseData.length; i++) {
    await prisma.courseTeacher.create({
      data: { courseId: courses[i].id, teacherId: teachers[courseData[i].teacherIdx].id },
    });
  }

  // ─── Enrollments: test students enrolled in 8-15 courses, virtual students 6-12 ───
  for (const student of testStudentObjs) {
    const numEnrolled = randInt(8, 15);
    const shuffled = [...courses].sort(() => Math.random() - 0.5);
    for (let j = 0; j < numEnrolled; j++) {
      await prisma.enrollment.create({ data: { studentId: student.id, courseId: shuffled[j].id } });
    }
  }
  for (const student of virtualStudentObjs) {
    const numEnrolled = randInt(6, 12);
    const shuffled = [...courses].sort(() => Math.random() - 0.5);
    for (let j = 0; j < numEnrolled; j++) {
      await prisma.enrollment.create({ data: { studentId: student.id, courseId: shuffled[j].id } });
    }
  }

  // ─── Evaluations: each course gets 8-12 ratings from VIRTUAL STUDENTS ONLY, ~30% have comments ───
  // Test students have NO pre-generated evaluations - they submit their own
  const evalCount = [];
  for (let ci = 0; ci < courses.length; ci++) {
    const n = randInt(8, 12);
    evalCount.push(n);
  }

  let totalEvals = 0;
  const semDates: Record<string, { start: Date; end: Date }> = {
    "2024-2025-1": { start: new Date("2024-09-01"), end: new Date("2024-12-31") },
    "2024-2025-2": { start: new Date("2025-02-15"), end: new Date("2025-06-20") },
  };

  const evalDates: string[] = [];
  for (let ci = 0; ci < courses.length; ci++) {
    const n = evalCount[ci];
    const sem = courseData[ci].semester;
    const range = semDates[sem];
    const msRange = range.end.getTime() - range.start.getTime();
    for (let j = 0; j < n; j++) {
      const d = new Date(range.start.getTime() + Math.random() * msRange);
      evalDates.push(d.toISOString());
    }
  }
  evalDates.sort(() => Math.random() - 0.5);

  let dateIdx = 0;
  for (let ci = 0; ci < courses.length; ci++) {
    const n = evalCount[ci];
    // Use ONLY virtual students for pre-generated evaluations
    const vPool = [...virtualStudentObjs].sort(() => Math.random() - 0.5);
    const participants = vPool.slice(0, Math.min(n, vPool.length));

    for (const student of participants) {
      const baseScore = randInt(2, 5);
      const scores = [
        Math.min(5, Math.max(1, baseScore + randInt(-1, 1))),
        Math.min(5, Math.max(1, baseScore + randInt(-1, 1))),
        Math.min(5, Math.max(1, baseScore + randInt(-1, 1))),
        Math.min(5, Math.max(1, baseScore + randInt(-1, 1))),
        Math.min(5, Math.max(1, baseScore + randInt(-1, 1))),
      ];
      const avg = scores.reduce((a, b) => a + b, 0) / 5;

      // Comments: only ~30% of evals have text (most students just rate)
      let comment = "";
      if (Math.random() < 0.3) {
        const pool = avg >= 4 ? positiveComments : avg >= 3 ? neutralComments : negativeComments;
        comment = pick(pool);
      }

      await prisma.evaluation.create({
        data: {
          studentId: student.id, courseId: courses[ci].id,
          scoreContent: scores[0], scoreAttitude: scores[1], scoreMethod: scores[2],
          scoreExam: scores[3], scoreOverall: scores[4],
          avgScore: Math.round(avg * 100) / 100,
          comment: comment || null,
          createdAt: evalDates[dateIdx++] ? new Date(evalDates[dateIdx - 1]) : undefined,
        },
      }).catch(() => {}); // skip duplicate constraint errors
    }
    totalEvals += n;
  }

  console.log(`✅ ~${totalEvals} evaluations`);
  console.log("🎉 Seed complete!");
  console.log("");
  console.log("📋 Preset accounts (password: 123456):");
  console.log("   管理员: admin@courseeval.com");
  console.log("   学生: xuhe@courseeval.com / liyang@courseeval.com / zhanghe@courseeval.com / zhaoyun@courseeval.com");
  console.log("   教师: wang@courseeval.com (王建国) / zhang@courseeval.com (张丽华) / liu@courseeval.com (刘明远)");
  console.log("   教师: chen@courseeval.com (陈志远) / sun@courseeval.com (孙晓芳)");
  console.log("   教师: zhou@courseeval.com (周博文) / wu@courseeval.com (吴雅琴) / zhao_t@courseeval.com (赵天宇)");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });
