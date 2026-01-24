-- RSL Smart Vote - Migration Script v2.0
-- เพิ่ม columns และ tables ใหม่โดยไม่ลบข้อมูลเดิม

-- =====================================================
-- NEW TABLES
-- =====================================================

-- Users table (Admin & Committee members)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'committee')),
  display_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

-- Sessions table (for token-based auth)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_token TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  details TEXT,
  user_id INTEGER,
  user_username TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Rate Limits
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- ALTER EXISTING TABLES
-- =====================================================

-- Add vote_status to students (if not exists)
-- SQLite doesn't have IF NOT EXISTS for ALTER, so we wrap in try-catch via separate statements
ALTER TABLE students ADD COLUMN vote_status TEXT CHECK (vote_status IN ('voted', 'absent') OR vote_status IS NULL);

-- Migrate has_voted to vote_status
UPDATE students SET vote_status = 'voted' WHERE has_voted = 1 AND vote_status IS NULL;

-- Add new columns to tokens
ALTER TABLE tokens ADD COLUMN student_id TEXT;
ALTER TABLE tokens ADD COLUMN activated_by INTEGER;
ALTER TABLE tokens ADD COLUMN voting_started_at TEXT;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_students_vote_status ON students(vote_status);
CREATE INDEX IF NOT EXISTS idx_tokens_activated_at ON tokens(activated_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);

-- =====================================================
-- DEFAULT SETTINGS
-- =====================================================

INSERT OR IGNORE INTO system_settings (key, value) VALUES ('election_status', 'closed');
