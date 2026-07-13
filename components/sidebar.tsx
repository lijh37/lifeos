'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Notebook, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { NAV_ITEMS, PRIMARY_MOBILE_NAV, MORE_MOBILE_NAV } from '@/lib/navigation'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-56 border-r bg-card p-4 md:flex md:flex-col">
      <div className="mb-6 flex items-center gap-2">
        <Notebook className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">LifeOS</span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} prefetch={['/notes', '/habits'].includes(item.href)}>
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

      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between border-t px-2 pt-2">
          <span className="text-xs text-muted-foreground">主题</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {PRIMARY_MOBILE_NAV.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] leading-tight min-h-[56px]',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn(isActive ? 'font-medium' : '')}>{item.label}</span>
            </Link>
          )
        })}
        {MORE_MOBILE_NAV.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] min-h-[56px] text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>更多</span>
          </button>
        )}
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>所有功能</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 p-4">
            {MORE_MOBILE_NAV.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-lg p-3 min-h-[56px]',
                    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50 text-muted-foreground'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="text-[10px]">{item.label}</span>
                </Link>
              )
            })}
          </div>
          <div className="flex items-center justify-center border-t py-3">
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
