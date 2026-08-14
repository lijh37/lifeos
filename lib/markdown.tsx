import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="mt-2 mb-3 scroll-m-20 text-2xl font-bold tracking-tight" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="mt-6 mb-2 scroll-m-18 text-xl font-semibold tracking-tight" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mt-4 mb-1.5 scroll-m-16 text-lg font-semibold tracking-tight" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="break-words leading-7 [&:not(:first-child)]:mt-3" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-3 ml-5 list-disc space-y-1 [&>li]:pl-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-3 ml-5 list-decimal space-y-1 [&>li]:pl-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li {...props}>{children}</li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-3 rounded-r-lg border-l-4 border-primary/40 bg-muted/40 py-1 pr-2 pl-3 italic text-muted-foreground" {...props}>
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }) => {
    const isInline = !className
    if (isInline) {
    return (
      <code className="break-words rounded bg-muted px-1.5 py-0.5 text-sm font-mono" {...props}>
          {children}
        </code>
      )
    }
    return (
      <pre className="my-3 overflow-x-auto break-words rounded-xl bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap ring-1 ring-foreground/5">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    )
  },
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
      {...props}
    >
      {children}
    </a>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold" {...props}>{children}</strong>
  ),
  hr: (props) => <hr className="my-4 border-t" {...props} />,
  // GFM 表格：移动端横向滚动 + 轻量斑马分隔
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-lg ring-1 ring-foreground/10">
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted/60" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th className="border-b px-3 py-2 text-left font-medium" {...props}>{children}</th>
  ),
  td: ({ children, ...props }) => (
    <td className="border-b border-border/60 px-3 py-2 align-top" {...props}>{children}</td>
  ),
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`break-words min-w-0 ${className || ''}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks, remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

