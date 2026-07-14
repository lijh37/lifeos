/**
 * Strip Markdown formatting for plain-text preview in card lists.
 * Pure string function — no React/react-markdown dependency.
 */
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
