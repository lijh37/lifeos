-- 002: 体重记录表
--
-- UNIQUE(person, date) 即覆盖索引，无需额外索引。

CREATE TABLE IF NOT EXISTS weight_logs (
  id TEXT PRIMARY KEY,
  person TEXT NOT NULL,
  date TEXT NOT NULL,
  weight REAL NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (person, date)
);
