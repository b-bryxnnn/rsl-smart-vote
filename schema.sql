-- RSL Smart Vote - Database Schema (SQLite / Cloudflare D1 Compatible)
-- Version 2.0 - With Security & User Management

-- =====================================================
-- USERS & AUTHENTICATION
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

-- =====================================================
-- ACTIVITY LOGGING
-- =====================================================

-- Activity Logs table (บันทึกทุกเหตุการณ์)
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

-- =====================================================
-- SYSTEM SETTINGS
-- =====================================================

-- System Settings (election status, etc.)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Rate Limits (for brute force protection)
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- CORE TABLES (Updated)
-- =====================================================

-- Students table (สำหรับตรวจสอบตัวตน)
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  level TEXT NOT NULL,
  room TEXT,
  vote_status TEXT CHECK (vote_status IN ('voted', 'absent') OR vote_status IS NULL),
  voted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Parties table (พรรค)
CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  number INTEGER NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tokens table (บัตรเลือกตั้ง)
-- status: 'inactive' | 'activated' | 'voting' | 'used' | 'expired'
CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('inactive', 'activated', 'voting', 'used', 'expired')),
  station_level TEXT,
  print_batch_id TEXT,
  student_id TEXT,
  activated_by INTEGER,
  activated_at TEXT,
  voting_started_at TEXT,
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

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_vote_status ON students(vote_status);
CREATE INDEX IF NOT EXISTS idx_tokens_code ON tokens(code);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_activated_at ON tokens(activated_at);
CREATE INDEX IF NOT EXISTS idx_votes_party_id ON votes(party_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, action);
