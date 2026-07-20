import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BatchActionsBar } from '@/components/batch-actions-bar'

describe('BatchActionsBar', () => {
  const selectedIds = new Set<string>(['id-1', 'id-2', 'id-3'])
  const onDelete = vi.fn()
  const onTag = vi.fn()
  const onClearSelection = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows zero count when no items selected', () => {
    render(
      <BatchActionsBar
        selectedIds={new Set<string>()}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    expect(screen.getByText('已选 0 项')).toBeInTheDocument()
  })

  it('renders selected count when items selected', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    expect(screen.getByText('已选 3 项')).toBeInTheDocument()
  })

  it('opens delete confirmation dialog when delete button clicked', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    fireEvent.click(screen.getByText('删除'))
    expect(
      screen.getByText('确定删除选中的 3 条笔记？'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('删除后无法恢复，请谨慎操作。'),
    ).toBeInTheDocument()
  })

  it('opens tag dialog when tag button clicked', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    fireEvent.click(screen.getByText('改标签'))
    expect(screen.getByText('添加标签')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('输入标签名称…'),
    ).toBeInTheDocument()
  })

  it('calls onClearSelection when cancel button clicked', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    fireEvent.click(screen.getByText('取消'))
    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })
})
