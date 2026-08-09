/**
 * 内联迁移定义（终态 DDL）
 *
 * 铁律③：手机端（Capacitor 静态导出）不能依赖 fs/process.cwd() 扫描
 * migrations/ 目录——静态导出后这些 .sql 文件不在 bundle 中。
 * 因此迁移 SQL 必须内联进本模块，随 bundle 打包。
 *
 * 本模块是表结构的唯一真相：无任何 .sql 副本，web/移动端/CLI/测试
 * 均消费此内联声明。
 *
 * 机制：全部为幂等终态 DDL（CREATE TABLE/INDEX IF NOT EXISTS），每次启动
 * 由 migrate() 重跑（自愈），无版本簿记、无 _migrations 追踪表。
 * 新列一律通过 COLUMN_MIGRATIONS + ensureColumn 守卫式 ALTER 添加——
 * 禁止把新列塞进旧 CREATE TABLE（既有库不会重放建表语句）。
 */

/** 终态 schema 声明：单条完整 SQL 语句（含末尾分号），按依赖顺序执行 */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  title TEXT,
  type TEXT NOT NULL DEFAULT 'note',
  due_date TEXT,
  done INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);`,

  `CREATE TABLE IF NOT EXISTS budgets (
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
);`,

  `CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);`,

  `CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT 'daily',
  created_at TEXT NOT NULL
);`,

  `CREATE TABLE IF NOT EXISTS habit_completions (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);`,

  `CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);`,

  `CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);`,

  `CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_due_date ON notes(due_date);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_search ON notes(content, title);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_pinned_created ON notes(pinned, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_type_due ON notes(type, due_date);`,
  `CREATE INDEX IF NOT EXISTS idx_notes_done ON notes(type, done);`,
  `CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id);`,
  `CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_unique ON habit_completions(habit_id, date);`,
  `CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);`,

  // 体重记录表（原 v2）：UNIQUE(person, date) 即覆盖索引，无需额外索引。
  `CREATE TABLE IF NOT EXISTS weight_logs (
  id TEXT PRIMARY KEY,
  person TEXT NOT NULL,
  date TEXT NOT NULL,
  weight REAL NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (person, date)
);`,
]

/** 守卫式列迁移：列不存在时执行 ADD COLUMN（幂等自愈） */
export interface ColumnMigration {
  table: string
  column: string
  ddl: string
}

/** 列迁移注册表：新列在此追加，migrate() 每次启动守卫式应用 */
export const COLUMN_MIGRATIONS: ColumnMigration[] = []
