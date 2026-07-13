import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AttachmentSection } from '@/components/attachment-section'
import type { Attachment } from '@/lib/types'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

function createAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: crypto.randomUUID(),
    noteId: 'note-1',
    filename: 'test.pdf',
    url: 'https://example.com/test.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function waitForMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('AttachmentSection', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Default: return empty attachments list
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attachments: [] }),
    })
  })

  it('should accept noteId prop and fetch attachments on mount', async () => {
    const { container } = render(<AttachmentSection noteId="note-1" />)

    // Initially loading - returns null
    expect(container.innerHTML).toBe('')

    // Wait for fetch to resolve
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/notes/note-1/attachments')
    })
  })

  it('should show loading state as null initially', () => {
    // Don't resolve the fetch so loading stays true
    mockFetch.mockImplementationOnce(() => new Promise(() => {}))
    const { container } = render(<AttachmentSection noteId="note-1" />)
    expect(container.innerHTML).toBe('')
  })

  it('should show expanded/collapsed toggle after loading', async () => {
    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })
  })

  it('should show "暂无附件" when no attachments and expanded', async () => {
    render(<AttachmentSection noteId="note-1" />)

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    // Click to expand
    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      expect(screen.getByText('暂无附件')).toBeInTheDocument()
    })
  })

  it('should show caption "拖拽或点击上传" when collapsed and no attachments', async () => {
    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('拖拽或点击上传')).toBeInTheDocument()
    })
  })

  it('should show attachment count and items when attachments exist', async () => {
    const attachments = [
      createAttachment({ id: 'att-1', filename: 'document.pdf', mimeType: 'application/pdf', fileSize: 2048 }),
      createAttachment({ id: 'att-2', filename: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 5242880 }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attachments }),
    })

    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    // Should show count
    expect(screen.getByText('(2)')).toBeInTheDocument()

    // Click to expand
    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
      expect(screen.getByText('photo.jpg')).toBeInTheDocument()
    })

    // Check file sizes
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
    expect(screen.getByText('5.0 MB')).toBeInTheDocument()
  })

  it('should show image thumbnail for image mime types', async () => {
    const attachments = [
      createAttachment({ id: 'att-1', filename: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 1024, url: 'https://example.com/photo.jpg' }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attachments }),
    })

    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      const img = document.querySelector('img[src="https://example.com/photo.jpg"]')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('alt', 'photo.jpg')
    })
  })

  it('should not show image thumbnail for non-image mime types', async () => {
    const attachments = [
      createAttachment({ id: 'att-1', filename: 'doc.pdf', mimeType: 'application/pdf', fileSize: 1024 }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attachments }),
    })

    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      expect(screen.getByText('doc.pdf')).toBeInTheDocument()
    })

    // No image tag should appear for non-image attachments
    expect(document.querySelector('img')).toBeNull()
  })

  it('should show file size in various formats', async () => {
    const attachments = [
      createAttachment({ id: 'att-1', filename: 'tiny.txt', mimeType: 'text/plain', fileSize: 500 }),
      createAttachment({ id: 'att-2', filename: 'medium.pdf', mimeType: 'application/pdf', fileSize: 1500 }),
      createAttachment({ id: 'att-3', filename: 'large.zip', mimeType: 'application/zip', fileSize: 3145728 }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attachments }),
    })

    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      expect(screen.getByText('500 B')).toBeInTheDocument()
      expect(screen.getByText('1.5 KB')).toBeInTheDocument()
      expect(screen.getByText('3.0 MB')).toBeInTheDocument()
    })
  })

  it('should call DELETE API and do optimistic removal when delete is clicked', async () => {
    const attachment = createAttachment({ id: 'att-1', filename: 'doc.pdf', fileSize: 1024 })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attachments: [attachment] }),
    })

    // Setup delete mock response
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/api/notes/note-1/attachments') {
        if (!options || options.method !== 'DELETE') {
          return { ok: true, json: async () => ({ attachments: [attachment] }) }
        }
        // DELETE returns ok
        return { ok: true, json: async () => ({}) }
      }
      return { ok: true, json: async () => ({}) }
    })

    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      expect(screen.getByText('doc.pdf')).toBeInTheDocument()
    })

    // Click the delete button
    const deleteBtn = document.querySelector('button[title="删除"]')
    expect(deleteBtn).toBeInTheDocument()
    fireEvent.click(deleteBtn!)

    // Optimistic removal: attachment should disappear immediately
    await waitFor(() => {
      expect(screen.queryByText('doc.pdf')).not.toBeInTheDocument()
    })

    // Verify DELETE API was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/notes/note-1/attachments?attachmentId=att-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('should restore attachment on delete failure', async () => {
    const attachment = createAttachment({ id: 'att-1', filename: 'doc.pdf', fileSize: 1024 })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attachments: [attachment] }),
    })

    // Override the delete call to fail
    mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes('attachmentId=')) {
        return { ok: false, json: async () => ({ error: '删除失败' }) }
      }
      return { ok: true, json: async () => ({ attachments: [attachment] }) }
    })

    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      expect(screen.getByText('doc.pdf')).toBeInTheDocument()
    })

    // Click the delete button
    const deleteBtn = document.querySelector('button[title="删除"]')
    fireEvent.click(deleteBtn!)

    // After fetch fails, attachment should be restored
    await waitFor(() => {
      expect(screen.getByText('doc.pdf')).toBeInTheDocument()
    })
  })

  it('should upload a file via file input', async () => {
    const attachment = createAttachment({ id: 'att-new', filename: 'uploaded.pdf', mimeType: 'application/pdf', fileSize: 2048 })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ attachments: [] }),
    })

    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      expect(screen.getByText('暂无附件')).toBeInTheDocument()
    })

    // Setup upload mock
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ attachment }),
    })

    // Simulate file selection
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    const file = new File(['test content'], 'uploaded.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('uploaded.pdf')).toBeInTheDocument()
    })
  })

  it('should show caption "展开" when collapsed and has attachments', async () => {
    const attachments = [
      createAttachment({ id: 'att-1', filename: 'doc.pdf', fileSize: 1024 }),
    ]
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attachments }),
    })

    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('展开')).toBeInTheDocument()
    })
  })

  it('should show caption "收起" when expanded', async () => {
    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      expect(screen.getByText('收起')).toBeInTheDocument()
    })
  })

  it('should show upload area when expanded', async () => {
    render(<AttachmentSection noteId="note-1" />)

    await waitFor(() => {
      expect(screen.getByText('附件')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('附件'))

    await waitFor(() => {
      expect(screen.getByText('点击或拖拽文件到此处上传')).toBeInTheDocument()
    })
  })
})
