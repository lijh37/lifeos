-- 001: 创建核心表与索引
--
-- 本迁移定义应用当前正在使用的表结构，不含已废弃的遗留表/字段。
--
-- 生产 Turso 库中遗留的废弃表（不会影响功能，不会被删除）：
--   - chat_messages    — AI 对话消息（已废弃功能）
--   - conversations    — AI 对话会话（已废弃功能）
--   - expenses         — 独立支出记录（已废弃功能）
--
-- 生产 Turso 库中遗留的废弃字段（不会影响功能，不会被删除）：
--   - notes.tags TEXT DEFAULT '[]'    — 旧版内联 JSON 标签（已迁移到 note_tags）
--   - notes.sort_order INTEGER DEFAULT 0 — 未使用的排序字段
--   - note_tags / tags 缺少 FK 约束   — 生产以 ALTER TABLE 追加，旧表从未启用外键
--
-- 外键约束：本地 SQLite 需手动启用 PRAGMA foreign_keys = ON
--          Turso/libSQL 云端原生支持外键

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
);

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
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT 'daily',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 查询索引
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_due_date ON notes(due_date);
CREATE INDEX IF NOT EXISTS idx_notes_search ON notes(content, title);
CREATE INDEX IF NOT EXISTS idx_notes_pinned_created ON notes(pinned, created_at);
CREATE INDEX IF NOT EXISTS idx_notes_type_due ON notes(type, due_date);
CREATE INDEX IF NOT EXISTS idx_notes_done ON notes(type, done);
CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit ON habit_completions(habit_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_completions_unique ON habit_completions(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
