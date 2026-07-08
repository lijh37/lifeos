import { createClient } from '@libsql/client'

let client: ReturnType<typeof createClient> | null = null
let dbInitialized = false
export let fts5Available: boolean | undefined

/**
 * 获取数据库客户端实例（单例），优先使用 Turso 远程数据库，否则回退到本地 SQLite 文件。
 */
export function getClient() {
  if (client) return client
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const url = tursoUrl || process.env.DATABASE_URL || 'file:./data/life.db'
  const authToken = process.env.TURSO_AUTH_TOKEN
  client = tursoUrl
    ? createClient({ url: tursoUrl, authToken })
    : createClient({ url })
  return client
}

/**
 * 初始化数据库：创建所有必要的表和索引，包括 notes、chat_messages、conversations、budgets、
 * attachments、habits、habit_completions，以及 FTS5 全文索引和规范化标签表。
 * 首次调用后自动跳过重复初始化。
 */
export async function initDB() {
  if (dbInitialized) return
  const db = getClient()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      title TEXT,
      type TEXT NOT NULL DEFAULT 'note',
      tags TEXT DEFAULT '[]',
      due_date TEXT,
      done INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      related_note_id TEXT,
      conversation_id TEXT,
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_due_date ON notes(due_date)
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL UNIQUE,
      fixed_budget REAL NOT NULL DEFAULT 0,
      variable_budget REAL NOT NULL DEFAULT 0,
      fixed_actual REAL DEFAULT NULL,
      variable_actual REAL DEFAULT NULL,
      notes TEXT DEFAULT '',
      is_completed INTEGER DEFAULT 0,
      savings_completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT '',
      file_size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id)
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      frequency TEXT NOT NULL DEFAULT 'daily',
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS habit_completions (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id)
  `)
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_unique ON habit_completions(habit_id, date)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_search ON notes(content, title)
  `)
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_type_due ON notes(type, due_date)`)
  } catch { /* index may already exist */ }
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_done ON notes(type, done)`)
  } catch { /* index may already exist */ }
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at)`)
  } catch { /* index may already exist */ }

  try {
    await db.execute(`ALTER TABLE chat_messages ADD COLUMN conversation_id TEXT`)
  } catch { /* column may already exist */ }
  try {
    await db.execute(`ALTER TABLE notes ADD COLUMN pinned INTEGER DEFAULT 0`)
  } catch { /* column may already exist */ }

  // Composite index supporting cursor pagination (pinned DESC, created_at DESC)
  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_pinned_created ON notes(pinned, created_at)`)
  } catch { /* index may already exist */ }

  // FTS5 full-text search (graceful fallback if not available)
  try {
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        content, title, content=notes, content_rowid=rowid
      )
    `)
    await db.execute(`
      INSERT OR IGNORE INTO notes_fts(rowid, content, title)
      SELECT rowid, content, title FROM notes
    `)
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, content, title) VALUES (new.rowid, new.content, new.title);
      END
    `)
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, content, title) VALUES('delete', old.rowid, old.content, old.title);
      END
    `)
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        INSERT INTO notes_fts(notes_fts, rowid, content, title) VALUES('delete', old.rowid, old.content, old.title);
        INSERT INTO notes_fts(rowid, content, title) VALUES (new.rowid, new.content, new.title);
      END
    `)
    fts5Available = true
  } catch { console.warn('[fts5] 全文索引不可用，回退到 LIKE 搜索'); fts5Available = false }

  // Normalized tags tables
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (note_id, tag_id)
      )
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id)
    `)
  } catch { /* tables may already exist */ }

  // Migrate existing JSON tags to normalized tables
  try {
    const migrationCheck = await db.execute('SELECT COUNT(*) as count FROM tags')
    if ((migrationCheck.rows[0]?.count as number) === 0) {
      const { syncNoteTags } = await import('./tags')
      const existingNotes = await db.execute('SELECT id, tags FROM notes')
      for (const row of existingNotes.rows) {
        const noteTags = JSON.parse(row.tags as string) as string[]
        await syncNoteTags(row.id as string, noteTags)
      }
    }
  } catch { /* migration not needed */ }

  dbInitialized = true
}
