import { createClient } from '@libsql/client'

let client: ReturnType<typeof createClient> | null = null
let dbInitialized = false
export let fts5Available: boolean | undefined

/**
 * 获取数据库客户端实例（单例）：
 * - 生产/开发：TURSO_DATABASE_URL → Turso 远程数据库
 * - 测试：DATABASE_URL=:memory: → 内存 SQLite
 * 首次调用时自动触发一次 DB 初始化，后续跳过。
 * 未配置环境变量时抛出明确错误。
 */
export function getClient() {
  if (client) return client

  const tursoUrl = process.env.TURSO_DATABASE_URL
  const fallbackUrl = process.env.DATABASE_URL
  const url = tursoUrl || fallbackUrl
  if (!url) {
    throw new Error(
      'Database not configured. Set TURSO_DATABASE_URL (Turso remote) or DATABASE_URL (local/CI).'
    )
  }
  const authToken = process.env.TURSO_AUTH_TOKEN
  client = tursoUrl
    ? createClient({ url: tursoUrl, authToken })
    : createClient({ url })
  // 启用外键约束（SQLite 默认关闭）
  try { client.execute('PRAGMA foreign_keys = ON') } catch { /* 某些托管环境可能不支持 */ }
  initDB()
  return client
}

/**
 * 初始化数据库（仅首次调用生效）：
 * - Turso 模式：表结构已在云端存在，标记 FTS5 可用后跳过 DDL
 * - 本地 / :memory: 模式：自动建表、索引、FTS5、标签表
 */
export async function initDB() {
  if (dbInitialized) return
  dbInitialized = true

  if (process.env.TURSO_DATABASE_URL) {
    // 探测 FTS5 在 Turso 中是否可用（表结构已存在于云端）
    client!.execute("SELECT count(*) FROM notes_fts")
      .then(() => { fts5Available = true })
      .catch(() => {
        console.warn('[fts5] Turso 中 FTS5 不可用（notes_fts 表不存在），回退到 LIKE 搜索')
        fts5Available = false
      })
    return
  }

  const db = getClient()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      title TEXT,
      type TEXT NOT NULL DEFAULT 'note',
      due_date TEXT,
      done INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
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
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)

  // Indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_due_date ON notes(due_date)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_search ON notes(content, title)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_pinned_created ON notes(pinned, created_at)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_type_due ON notes(type, due_date)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_done ON notes(type, done)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id)`)
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_unique ON habit_completions(habit_id, date)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id)`)

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
}
