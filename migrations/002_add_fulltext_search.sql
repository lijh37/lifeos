-- 002: 全文搜索（FTS5）
-- 创建 FTS5 虚拟表及自动同步触发器
-- FTS5 在部分托管环境（如 Turso 旧版本）可能不可用，
-- 此时本迁移会执行失败，须由运行时 checkFts5() 优雅降级。

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  content, title, content=notes, content_rowid=rowid
);

INSERT OR IGNORE INTO notes_fts(rowid, content, title)
SELECT rowid, content, title FROM notes;

CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, content, title) VALUES (new.rowid, new.content, new.title);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, content, title) VALUES('delete', old.rowid, old.content, old.title);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, content, title) VALUES('delete', old.rowid, old.content, old.title);
  INSERT INTO notes_fts(rowid, content, title) VALUES (new.rowid, new.content, new.title);
END;
