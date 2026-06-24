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
  if (code.startsWith("BUS")) return "经济管理学院";
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
    "胡兵", "林黛", "何平", "郭瑞", "蔡琴",
    "潘岳", "董浩", "卢芳", "钱进", "汤唯",
    "范伟", "彭博", "鲁豫", "韦小宝", "苗苗",
    "花荣", "任光", "姜华", "姚明", "孟飞",
    "秦岚", "尹航", "余欢", "邹市", "许晴",
    "赵云", "李白", "王昭君", "韩信", "甄姬",
    "诸葛亮", "妲己", "关羽", "张飞", "芈月",
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

        // Computer Science (80 courses)
  const csCourses = [
    ["CS101","程序设计基础",4,"Python编程入门与算法思维训练",0],
    ["CS102","数据结构",4,"线性表、树、图等经典数据结构与算法分析",1],
    ["CS103","算法设计与分析",4,"分治、贪心、动态规划与NP完全理论",1],
    ["CS104","计算机组成原理",3,"CPU微架构、存储器层次与总线系统",0],
    ["CS105","操作系统",4,"进程调度、内存管理、文件系统与并发编程",1],
    ["CS106","计算机网络",3,"TCP/IP协议栈、路由算法与网络安全基础",0],
    ["CS107","数据库系统概论",4,"关系模型、SQL查询优化与事务管理",3],
    ["CS108","软件工程",3,"敏捷开发、设计模式与项目管理实践",0],
    ["CS109","Web前端开发",3,"HTML5、CSS3、JavaScript与Vue.js框架",0],
    ["CS110","人工智能导论",3,"搜索策略、知识表示与机器学习入门",3],
    ["CS111","机器学习",3,"监督学习、无监督学习与深度神经网络",1],
    ["CS112","计算机图形学",3,"光照模型、渲染管线与GPU编程",0],
    ["CS113","信息安全基础",3,"密码学原理、网络攻防与安全协议",3],
    ["CS114","分布式系统",3,"CAP理论、一致性协议与微服务架构",1],
    ["CS115","移动应用开发",3,"Android Studio、iOS Swift与跨平台技术",0],
    ["CS116","编译原理",3,"词法分析、语法分析与中间代码生成",3],
    ["CS117","数字图像处理",3,"图像增强、分割与特征提取算法",1],
    ["CS118","自然语言处理",3,"文本分类、序列标注与大语言模型",0],
    ["CS119","云计算技术",3,"虚拟化、容器编排与微服务部署",3],
    ["CS120","区块链原理",3,"分布式共识、智能合约与数字货币",1],
    ["CS121","数据挖掘",3,"关联规则、聚类分析与推荐系统",0],
    ["CS122","嵌入式系统",3,"ARM架构、RTOS与传感器接口设计",3],
    ["CS123","软件测试",2,"测试方法论、自动化框架与CI/CD",1],
    ["CS124","虚拟现实技术",2,"3D渲染、人机交互与沉浸式体验设计",0],
    ["CS125","并行计算",3,"多线程编程、GPU加速与高性能计算",3],
    ["CS126","物联网技术",3,"传感器网络、边缘计算与智能家居",1],
    ["CS127","计算机网络管理",2,"网管协议、故障诊断与性能优化",0],
    ["CS128","软件项目管理",2,"敏捷管理、需求工程与团队协作",3],
    ["CS129","模式识别",3,"特征工程、分类器设计与目标检测",1],
    ["CS130","深度学习",3,"CNN、RNN、Transformer架构与应用",0],
    ["CS131","高等数学（上）",5,"极限、导数与一元函数微积分",2],
    ["CS132","高等数学（下）",5,"多元微积分、无穷级数与常微分方程",2],
    ["CS133","线性代数",3,"矩阵理论、向量空间与线性变换",2],
    ["CS134","概率论与数理统计",4,"随机变量、抽样分布与假设检验",2],
    ["CS135","离散数学",3,"集合论、图论与数理逻辑基础",2],
    ["CS136","数值分析",3,"数值逼近、数值积分与微分方程数值解",2],
    ["CS137","数学建模",3,"优化算法、微分方程建模与MATLAB应用",2],
    ["CS138","复变函数",3,"复积分、留数定理与共形映射",2],
    ["CS139","常微分方程",3,"初值问题、稳定性理论与动力系统",2],
    ["CS140","运筹学",3,"线性规划、网络优化与博弈论",2],
    ["CS141","抽象代数",3,"群论、环论与域论基础",2],
    ["CS142","实变函数",3,"测度论、勒贝格积分与泛函分析入门",2],
    ["CS143","拓扑学",3,"点集拓扑、连续性理论与基本群",2],
    ["CS144","时间序列分析",3,"ARIMA模型、GARCH与金融预测",2],
    ["CS145","多元统计分析",3,"主成分分析、因子分析与聚类方法",2],
    ["CS146","大学英语I",2,"综合英语听、说、读、写基础训练",4],
    ["CS147","大学英语II",2,"学术英语阅读与四级考试专项训练",4],
    ["CS148","大学英语III",2,"学术英语写作与六级考试备考",4],
    ["CS149","大学英语IV",2,"高级英语口语表达与辩论技巧",4],
    ["CS150","商务英语",2,"商务信函写作、谈判技巧与跨文化交际",4],
    ["CS151","英美文学选读",3,"英美经典小说、诗歌与文学批评入门",4],
    ["CS152","翻译理论与实践",2,"英汉互译技巧与CAT工具应用",4],
    ["CS153","英语演讲与辩论",2,"演讲策略、辩论技巧与即兴表达训练",4],
    ["CS154","管理学原理",3,"管理理论、组织行为与战略决策",5],
    ["CS155","微观经济学",3,"供需理论、市场结构与消费者行为",5],
    ["CS156","宏观经济学",3,"国民收入、货币政策与经济周期",5],
    ["CS157","会计学基础",3,"财务报表分析、借贷记账与成本核算",5],
    ["CS158","市场营销学",3,"市场定位、品牌管理与数字营销策略",5],
    ["CS159","人力资源管理",2,"招聘甄选、绩效管理与薪酬设计",5],
    ["CS160","财务管理",3,"资本预算、融资决策与股利政策",5],
    ["CS161","电子商务",3,"电商模式、电子支付与网络营销实务",5],
    ["CS162","供应链管理",2,"采购优化、库存控制与物流规划",5],
    ["CS163","创业管理",2,"商业计划书撰写、融资策略与创新管理",5],
    ["CS164","电路分析基础",3,"电路定律、交流电路与暂态分析",6],
    ["CS165","数字电路与逻辑设计",3,"组合逻辑、时序电路与VHDL设计",6],
    ["CS166","通信原理",4,"模拟调制、数字调制与信道编码理论",6],
    ["CS167","信号与系统",3,"连续与离散信号、傅里叶变换与系统分析",6],
    ["CS168","电磁场与电磁波",3,"矢量分析、麦克斯韦方程与天线原理",6],
    ["CS169","嵌入式系统设计",3,"ARM Cortex架构、RTOS与设备驱动开发",6],
    ["CS170","数字信号处理",3,"DFT/FFT算法、FIR/IIR滤波器设计",6],
    ["CS171","光纤通信",2,"光纤传输原理、光器件与WDM系统",6],
    ["CS172","中国近现代史纲要",2,"近代中国历史变迁与社会转型",7],
    ["CS173","马克思主义基本原理",3,"辩证唯物主义与历史唯物主义",7],
    ["CS174","大学语文",2,"经典文学作品赏析与应用文写作",7],
    ["CS175","心理学导论",2,"认知、情绪、人格与社会心理学",7],
    ["CS176","思想道德与法治",2,"社会主义核心价值观与法律基础",7],
    ["CS177","体育I",1,"增强体质，培养运动习惯",0],
    ["CS178","体育II",1,"深化运动技能，校内比赛与体能测试",0],
    ["CS179","军事理论",2,"国防教育与军事基础知识",0],
    ["CS180","形势与政策",1,"国内外形势分析与政策解读",0],
  ];
const allCourseDefs = [...csCourses];

  const colors = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#64748B","#1E40AF","#DC2626","#EA580C","#2563EB","#7C3AED","#0891B2","#059669","#0D9488","#F97316","#22D3EE","#F43F5E","#6366F1","#4F46E5","#A3E635","#BEF264","#E11D48","#9333EA","#0284C7","#4F46E5","#C026D3","#65A30D","#0EA5E9","#78716C","#D946EF","#14B8A6","#F97316","#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#06B6D4","#84CC16","#64748B","#DC2626","#EA580C","#2563EB","#7C3AED","#0891B2","#059669","#0D9488","#F97316","#22D3EE","#F43F5E","#6366F1","#4F46E5","#A3E635","#BEF264","#E11D48","#9333EA","#0284C7","#4F46E5","#C026D3","#65A30D","#0EA5E9","#78716C","#D946EF","#14B8A6","#F97316","#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#64748B","#1E40AF"];

  for (let i = 0; i < allCourseDefs.length; i++) {
    const d = allCourseDefs[i];
    courseData.push({
      code: d[0] as string, name: d[1] as string, credits: d[2] as number, semester: d[1] as string, desc: d[3] as string,
      college: getCollege(d[0] as string), color: colors[i % colors.length], teacherIdx: d[5] as number,
    });
  }

  const courses = [];
  for (const cd of courseData) {
    courses.push(await prisma.course.create({
      data: { code: cd.code, name: cd.name, credits: cd.credits, college: getCollege(cd.code), semester: parseInt(cd.code.slice(2))%2===0?"2024-2025-2":"2024-2025-1", description: cd.desc || "", coverColor: cd.color },
    }));
  }
  console.log(`✅ ${courses.length} courses`);

  // ─── Course-Teacher links with virtual teachers ──────────────────
  const virtualTeacherNames = [
    "张志强", "李晓明", "王芳", "赵建国", "陈伟",
    "刘洋", "黄丽", "周杰", "吴敏", "郑刚",
    "钱学军", "孙涛", "朱红", "马超", "胡光",
    "林海", "何秀英", "郭峰", "蔡明", "潘龙",
  ];
  // Create virtual teacher User+Teacher records (no login account)
  const virtualTeachers = [];
  for (let vi = 0; vi < virtualTeacherNames.length; vi++) {
    const name = virtualTeacherNames[vi];
    const u = await prisma.user.create({
      data: { email: `virtual_t${vi + 1}@courseeval.com`, password: hash, name, role: "TEACHER", teacherNo: `V${2000 + vi}` },
    });
    virtualTeachers.push(await prisma.teacher.create({
      data: { userId: u.id, title: "讲师", college: "计算机科学与技术学院" },
    }));
  }

  // Assign teachers to courses: preset teachers get 3-5 each, rest to virtual
  const allTeachers = [...teachers, ...virtualTeachers];
  const remainingCourses = [...courses];
  // First, assign preset teachers 3-5 courses each
  for (let ti = 0; ti < teachers.length; ti++) {
    const num = randInt(3, 5);
    for (let k = 0; k < num && remainingCourses.length > 0; k++) {
      const idx = randInt(0, remainingCourses.length - 1);
      const course = remainingCourses.splice(idx, 1)[0];
      await prisma.courseTeacher.create({
        data: { courseId: course.id, teacherId: teachers[ti].id },
      });
    }
  }
  // Assign remaining courses to virtual teachers
  for (const course of remainingCourses) {
    const vteacher = virtualTeachers[randInt(0, virtualTeachers.length - 1)];
    await prisma.courseTeacher.create({
      data: { courseId: course.id, teacherId: vteacher.id },
    });
  }
  console.log(`✅ ${virtualTeachers.length} virtual teachers created`);

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
    const range = semDates[sem] || semDates["2024-2025-1"];
    const msRange = range.end.getTime() - range.start.getTime();
    for (let j = 0; j < n; j++) {
      const d = new Date(range.start.getTime() + Math.random() * msRange);
      evalDates.push(d.toISOString());
    }
  }
  evalDates.sort(() => Math.random() - 0.5);

  // Also generate 3 preset evals for each test student
  for (const student of testStudentObjs) {
    for (let k = 0; k < 3; k++) {
      const courseIdx = randInt(0, courses.length - 1);
      const baseScore = randInt(3, 5);
      const scores = [Math.min(5,Math.max(1,baseScore+randInt(-1,1))),Math.min(5,Math.max(1,baseScore+randInt(-1,1))),Math.min(5,Math.max(1,baseScore+randInt(-1,1))),Math.min(5,Math.max(1,baseScore+randInt(-1,1))),Math.min(5,Math.max(1,baseScore+randInt(-1,1)))];
      const avg = scores.reduce((a:number,b:number)=>a+b,0)/5;
      const sem = courseData[courseIdx].semester;
      const range = semDates[sem] || semDates["2024-2025-1"];
      const ms = range.end.getTime()-range.start.getTime();
      const d = new Date(range.start.getTime()+Math.random()*ms);
      const pool = avg>=4?positiveComments:avg>=3?neutralComments:negativeComments;
      const comment = Math.random()<0.7?pick(pool):"";
      await prisma.evaluation.create({data:{studentId:student.id,courseId:courses[courseIdx].id,scoreContent:scores[0],scoreAttitude:scores[1],scoreMethod:scores[2],scoreExam:scores[3],scoreOverall:scores[4],avgScore:Math.round(avg*100)/100,comment:comment||null,createdAt:d}}).catch(()=>{});
    }
  }

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
