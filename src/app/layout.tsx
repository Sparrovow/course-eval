import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "在线课程评价系统",
  description: "高校在线课程评价平台 - 课程评分、数据分析与可视化",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-gray-50 font-sans">{children}</body>
    </html>
  )
}
