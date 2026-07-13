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

  it('renders selected count', () => {
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

  it('renders all action buttons', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    expect(screen.getByText('改标签')).toBeInTheDocument()
    expect(screen.getByText('删除')).toBeInTheDocument()
    expect(screen.getByText('取消')).toBeInTheDocument()
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

  it('calls onDelete when delete confirmed in dialog', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    fireEvent.click(screen.getByText('删除'))

    // Two "删除" texts: main bar button and dialog confirm button
    const deleteButtons = screen.getAllByText('删除')
    expect(deleteButtons).toHaveLength(2)
    fireEvent.click(deleteButtons[1])

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('closes delete confirmation dialog when cancel clicked', () => {
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

    // Two "取消" texts: main bar cancel and dialog cancel
    const cancelButtons = screen.getAllByText('取消')
    fireEvent.click(cancelButtons[1])

    expect(
      screen.queryByText('确定删除选中的 3 条笔记？'),
    ).not.toBeInTheDocument()
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
    // Description text is split by React interpolation, use a function matcher
    expect(
      screen.getByText((content) =>
        content.includes('输入标签名称') &&
        content.includes('3') &&
        content.includes('条笔记'),
      ),
    ).toBeInTheDocument()
  })

  it('calls onTag with tag name when tag confirmed', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    fireEvent.click(screen.getByText('改标签'))

    const input = screen.getByPlaceholderText('输入标签名称…')
    fireEvent.change(input, { target: { value: '重要' } })

    fireEvent.click(screen.getByText('添加'))
    expect(onTag).toHaveBeenCalledWith('重要')
  })

  it('calls onTag when Enter key pressed in tag input', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    fireEvent.click(screen.getByText('改标签'))

    const input = screen.getByPlaceholderText('输入标签名称…')
    fireEvent.change(input, { target: { value: '工作' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onTag).toHaveBeenCalledWith('工作')
  })

  it('closes tag dialog and resets input when cancel clicked', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    // Open tag dialog and type a tag name
    fireEvent.click(screen.getByText('改标签'))
    const input = screen.getByPlaceholderText('输入标签名称…')
    fireEvent.change(input, { target: { value: '临时' } })
    expect(input).toHaveValue('临时')

    // Click cancel in dialog (second "取消")
    const cancelButtons = screen.getAllByText('取消')
    fireEvent.click(cancelButtons[1])

    // Dialog should close
    expect(screen.queryByText('添加标签')).not.toBeInTheDocument()

    // Reopen and verify input is reset to empty
    fireEvent.click(screen.getByText('改标签'))
    expect(screen.getByPlaceholderText('输入标签名称…')).toHaveValue('')
  })

  it('does not call onTag when tag name is empty', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    fireEvent.click(screen.getByText('改标签'))
    fireEvent.click(screen.getByText('添加'))
    expect(onTag).not.toHaveBeenCalled()
  })

  it('does not call onTag when tag name is only whitespace', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    fireEvent.click(screen.getByText('改标签'))
    const input = screen.getByPlaceholderText('输入标签名称…')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onTag).not.toHaveBeenCalled()
  })

  it('shows correct count with different selection sizes', () => {
    const single = new Set<string>(['a'])
    const { rerender } = render(
      <BatchActionsBar
        selectedIds={single}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    expect(screen.getByText('已选 1 项')).toBeInTheDocument()

    const many = new Set<string>(Array.from({ length: 10 }, (_, i) => String(i)))
    rerender(
      <BatchActionsBar
        selectedIds={many}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    expect(screen.getByText('已选 10 项')).toBeInTheDocument()
  })

  it('trims whitespace from tag name before calling onTag', () => {
    render(
      <BatchActionsBar
        selectedIds={selectedIds}
        onDelete={onDelete}
        onTag={onTag}
        onClearSelection={onClearSelection}
      />,
    )
    fireEvent.click(screen.getByText('改标签'))
    const input = screen.getByPlaceholderText('输入标签名称…')
    fireEvent.change(input, { target: { value: '  重要  ' } })
    fireEvent.click(screen.getByText('添加'))
    expect(onTag).toHaveBeenCalledWith('重要')
  })
})
