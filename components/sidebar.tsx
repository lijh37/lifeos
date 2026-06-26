'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot, Notebook, CheckSquare, Plus, PiggyBank, Trophy, CalendarDays, Search, Settings, Tags, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'AI 对话', icon: Bot },
  { href: '/notes', label: '笔记', icon: Notebook },
  { href: '/tasks', label: '任务', icon: CheckSquare },

  { href: '/expenses', label: '预算', icon: PiggyBank },
  { href: '/habits', label: '习惯', icon: Trophy },
  { href: '/search', label: '搜索', icon: Search },
  { href: '/tags', label: '标签', icon: Tags },
  { href: '/calendar', label: '日历', icon: CalendarDays },
  { href: '/stats', label: '统计', icon: BarChart3 },
  { href: '/settings', label: '设置', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 border-r bg-card p-4 md:flex md:flex-col">
      <div className="mb-6 flex items-center gap-2">
        <Bot className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">LifeOS</span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} prefetch={['/', '/notes', '/tasks', '/habits'].includes(item.href)}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start gap-3', isActive && 'font-medium')}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-1">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <Plus className="h-4 w-4" />
            新建记录
          </Button>
        </Link>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground">主题</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-background md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        )
      })}
      <div className="flex flex-col items-center gap-0 py-1">
        <ThemeToggle />
        <span className="text-[10px] text-muted-foreground">主题</span>
      </div>
    </nav>
  )
}
