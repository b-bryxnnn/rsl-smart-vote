-- RSL Smart Vote - Database Schema (SQLite / Cloudflare D1 Compatible)

-- Students table (สำหรับตรวจสอบตัวตน)
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  level TEXT NOT NULL,
  room TEXT,
  has_voted INTEGER DEFAULT 0,
  voted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Parties table (พรรค - ไม่มีรูปภาพ)
CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  number INTEGER NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tokens table (บัตรเลือกตั้ง)
-- status: 'inactive' | 'activated' | 'used'
CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'inactive',
  station_level TEXT,
  print_batch_id TEXT,
  activated_at TEXT,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Votes table (คะแนนเสียง)
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id INTEGER REFERENCES parties(id),
  station_level TEXT NOT NULL,
  token_id INTEGER REFERENCES tokens(id) UNIQUE,
  is_abstain INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Print Logs table (บันทึกการพิมพ์)
CREATE TABLE IF NOT EXISTS print_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  station_level TEXT,
  printed_at TEXT DEFAULT (datetime('now')),
  printed_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_has_voted ON students(has_voted);
CREATE INDEX IF NOT EXISTS idx_tokens_code ON tokens(code);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_votes_party_id ON votes(party_id);
