# 在线课程评价系统

高校在线课程评价平台，支持学生对课程进行多维度打分与留言评价，教师查看数据可视化看板。

## 技术栈
- Next.js 16 + React
- Prisma + PostgreSQL (Supabase)
- ECharts 数据可视化
- Tailwind CSS

## 预设账号
密码统一为 123456

| 账号 | 角色 |
|------|------|
| admin@courseeval.com | 管理员 |
| xuhe@courseeval.com | 学生·徐鹤 |
| wang@courseeval.com | 教师·王建国 |

## 本地运行
```bash
npm install
npx prisma generate
npm run dev
```

