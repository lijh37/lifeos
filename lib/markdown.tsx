import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'

const markdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1 className="scroll-m-20 text-2xl font-bold tracking-tight" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="scroll-m-18 text-xl font-semibold tracking-tight" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="scroll-m-16 text-lg font-semibold tracking-tight" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="break-words leading-7 [&:not(:first-child)]:mt-3" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-3 ml-6 list-disc [&>li]:mt-1.5" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-3 ml-6 list-decimal [&>li]:mt-1.5" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li {...props}>{children}</li>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-3 border-l-4 border-primary/30 pl-4 italic text-muted-foreground" {...props}>
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
      <pre className="my-3 overflow-x-auto break-words rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
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
}

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`break-words ${className || ''}`.trim()}>
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

/** Strip markdown formatting for plain-text preview in card lists */
export function stripMarkdown(md: string, maxLength = 200): string {
  return md
    .replace(/^#+\s+/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/[*_~]{1,2}/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^>\s/gm, '')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, maxLength)
}
