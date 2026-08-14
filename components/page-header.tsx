import type { ReactNode } from "react"

/**
 * 统一页面头部（手机优先，UI 美化 docs/ui-mobile-plan.md）
 * - sticky + 毛玻璃：滚动时头部悬浮，内容透过模糊背景
 * - 标题统一 text-lg font-semibold + 图标 size-5 text-primary
 * - actions 放右侧（新建/导出/月份切换/记录人切换等）
 */
export function PageHeader({
  icon,
  title,
  actions,
}: {
  icon?: ReactNode
  title: string
  actions?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/80 px-4 py-3 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2">
        {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
        <h1 className="truncate text-lg font-semibold">{title}</h1>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
