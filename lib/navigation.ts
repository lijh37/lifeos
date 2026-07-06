import {
  Bot,
  Notebook,
  PiggyBank,
  Trophy,
  Tags,
  BarChart3,
  Settings,
  Sun,
  type LucideIcon,
} from 'lucide-react'

/** 导航项类型定义 */
export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

/** 快捷操作类型定义 */
export interface QuickAction {
  id: string
  label: string
  icon: LucideIcon
  kind: 'navigate' | 'theme'
  href?: string
}

/** 完整导航列表（桌面侧栏 + ⌘K 命令面板共用） */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'AI 查询', icon: Bot },
  { href: '/notes', label: '笔记', icon: Notebook },
  { href: '/expenses', label: '预算', icon: PiggyBank },
  { href: '/habits', label: '习惯', icon: Trophy },
  { href: '/tags', label: '标签', icon: Tags },
  { href: '/stats', label: '统计', icon: BarChart3 },
  { href: '/settings', label: '设置', icon: Settings },
]

/** 手机底部栏主导航（前 5 项，包含 AI 对话入口） */
export const PRIMARY_MOBILE_NAV: NavItem[] = NAV_ITEMS.slice(0, 5)

/** 手机底部栏「更多」面板（剩余项） */
export const MORE_MOBILE_NAV: NavItem[] = NAV_ITEMS.slice(5)

/** ⌘K 命令面板快捷操作 */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-note', label: '新建笔记', icon: Notebook, kind: 'navigate', href: '/' },
  { id: 'new-habit', label: '新建习惯', icon: Trophy, kind: 'navigate', href: '/habits' },
  { id: 'toggle-theme', label: '切换主题', icon: Sun, kind: 'theme' },
]
