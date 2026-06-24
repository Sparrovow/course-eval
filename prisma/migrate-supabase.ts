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
  if (code.startsWith("CS")) return "Computer Science";
  if (code.startsWith("MATH")) return "Mathematics & Statistics";
  if (code.startsWith("ENG")) return "Foreign Languages & Literature";
  if (code.startsWith("BUS")) return "Business & Economics";
  if (code.startsWith("EE")) return "Electronic Engineering";
  if (code.startsWith("HUM")) return "Humanities & Social Sciences";
  return "Computer Science";
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

  // Virtual students (20, no login accounts)
  const virtualStudentNames = [
    "王磊", "陈静", "赵鑫", "黄思雨", "周涛",
    "吴芳", "郑浩然", "冯雪", "褚明哲", "蒋雨桐",
    "胡兵", "林黛", "何平", "郭瑞", "蔡琴",
    "潘岳", "董浩", "卢芳", "钱进", "汤唯",
  ];
  const VIRTUAL_COUNT = 20;
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

    // Computer Science (15 courses)
  const csCourses = [
    ["CS101","Introduction to Programming",4,"Programming fundamentals in Python",0],
    ["CS102","Data Structures",4,"Arrays, trees, graphs, hash tables",1],
    ["CS103","Algorithms",4,"Sorting, searching, dynamic programming",1],
    ["CS104","Computer Architecture",3,"CPU, memory hierarchy, I/O systems",0],
    ["CS105","Operating Systems",4,"Process management, memory, file systems",1],
    ["CS106","Computer Networks",3,"TCP/IP, routing, transport protocols",0],
    ["CS107","Database Systems",4,"Relational model, SQL, normalization",3],
    ["CS108","Software Engineering",3,"SDLC, agile, testing, design patterns",0],
    ["CS109","Web Development",3,"HTML, CSS, JavaScript, React",0],
    ["CS110","Artificial Intelligence",3,"Search, knowledge, machine learning",3],
    ["CS111","Machine Learning",3,"Supervised, unsupervised, neural nets",1],
    ["CS112","Computer Graphics",3,"Lighting, rendering, shaders",0],
    ["CS113","Cybersecurity",3,"Encryption, network security, threats",3],
    ["CS114","Distributed Systems",3,"Consensus, replication, consistency",1],
    ["CS115","Mobile Development",3,"Android, iOS, React Native",0],
  ];

const allCourseDefs = [...csCourses];
  const colors = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#64748B","#1E40AF","#DC2626","#EA580C","#2563EB","#7C3AED","#0891B2","#059669","#0D9488","#F97316","#22D3EE","#F43F5E","#6366F1","#4F46E5","#A3E635","#BEF264","#E11D48","#9333EA","#0284C7","#4F46E5","#C026D3","#65A30D","#0EA5E9","#78716C","#D946EF","#14B8A6","#F97316","#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#06B6D4","#84CC16","#64748B","#DC2626","#EA580C","#2563EB","#7C3AED","#0891B2","#059669","#0D9488","#F97316","#22D3EE","#F43F5E","#6366F1","#4F46E5","#A3E635","#BEF264","#E11D48","#9333EA","#0284C7","#4F46E5","#C026D3","#65A30D","#0EA5E9","#78716C","#D946EF","#14B8A6","#F97316","#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#64748B","#1E40AF"];

  for (let i = 0; i < allCourseDefs.length; i++) {
    const d = allCourseDefs[i];
    courseData.push({
      code: d[0] as string, name: d[1] as string, credits: d[2] as number, semester: d[3] as string, desc: d[3] as string,
      college: getCollege(d[0] as string), color: colors[i % colors.length], teacherIdx: d[5] as number,
    });
  }

  const courses = [];
  for (const cd of courseData) {
    courses.push(await prisma.course.create({
      data: { code: cd.code, name: cd.name, credits: cd.credits, college: cd.college, semester: "2024-2025-1", description: cd.desc || "", coverColor: cd.color },
    }));
  }
  console.log(`✅ ${courses.length} courses`);

  // ─── Course-Teacher links with virtual teachers ──────────────────
  const virtualTeacherNames = [
    "马超", "胡光", "林海", "何秀英", "郭峰",
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
    const range = semDates[sem];
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
      const range = semDates[sem];
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
