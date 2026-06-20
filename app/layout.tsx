import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Sidebar, MobileNav } from "@/components/sidebar"
import { PwaHandler } from "@/components/pwa-handler"
import { PageAnimation } from "@/components/page-animation"
import { NotificationManager } from "@/components/notification-manager"
import { FabButton } from "@/components/fab-button"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "LifeOS - AI 生活助手",
  description: "你的个人 AI 生活助手，记录笔记、管理任务、追踪生活",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "LifeOS" },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-512.svg" />
        <meta name="theme-color" content="#ffffff" id="theme-color" />
      </head>
      <body className="h-full">
        <ThemeProvider>
          <PwaHandler />
          <NotificationManager />
          <FabButton />
          <div className="flex h-full">
            <Sidebar />
            <PageAnimation>
              <main className="flex-1 pb-16 md:pb-0">{children}</main>
            </PageAnimation>
            <MobileNav />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
