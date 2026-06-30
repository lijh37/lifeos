import { initDB, getClient } from '../lib/db'
import TurndownService from 'turndown'

/**
 * One-time migration script: converts existing notes from HTML content to Markdown.
 *
 * Usage:
 *   npx tsx scripts/convert-html-to-md.ts
 */
async function convertHtmlToMd() {
  await initDB()
  const db = getClient()

  const turndownService = new TurndownService({
    headingStyle: 'atx',      // Use # style headings
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
  })

  const result = await db.execute('SELECT id, content, title FROM notes')
  const notes = result.rows
  let convertedCount = 0

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]
    const content = note.content as string
    const id = note.id as string

    if (!content || !isHtml(content)) {
      continue
    }

    const markdown = turndownService.turndown(content)

    await db.execute({
      sql: 'UPDATE notes SET content = ?, updated_at = ? WHERE id = ?',
      args: [markdown, new Date().toISOString(), id],
    })

    convertedCount++
    console.log(
      `Converting note ${i + 1}/${notes.length}: ${id}${note.title ? ` ("${note.title}")` : ''}`
    )
  }

  console.log(
    `\nDone! Converted ${convertedCount} out of ${notes.length} notes to Markdown.`
  )
}

/**
 * Detect if content contains HTML markup.
 * Checks for common HTML patterns rather than just '<' to avoid
 * false positives on mathematical expressions (e.g. "x < 5") or comparisons.
 */
function isHtml(content: string): boolean {
  const htmlPatterns = [
    /<[a-z][\s\S]*?>/i,  // Any HTML tag (e.g. <p>, <div>, <strong>, <br/>)
    /&[a-z]+;|&#\d+;/i,  // HTML entities (e.g. &amp;, &#160;)
  ]
  return htmlPatterns.some((p) => p.test(content))
}

convertHtmlToMd().catch((err) => {
  console.error('Conversion failed:', err)
  process.exit(1)
})
