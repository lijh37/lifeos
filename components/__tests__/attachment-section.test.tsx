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

describe('AttachmentSection', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Default: return empty attachments list
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ attachments: [] }),
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
})
