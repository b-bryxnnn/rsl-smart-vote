-- RSL Smart Vote - Database Schema (PostgreSQL 17)
-- Version 2.0 - With Security & User Management

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- Users table (Admin & Committee members)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'committee')),
  display_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Sessions table (for token-based auth)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- =====================================================
-- ACTIVITY LOGGING
-- =====================================================

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT,
  user_id INTEGER,
  user_username TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SYSTEM SETTINGS
-- =====================================================

-- System Settings (election status, etc.)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate Limits (for brute force protection)
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CORE TABLES (Updated)
-- =====================================================

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  level TEXT NOT NULL,
  room TEXT,
  vote_status TEXT CHECK (vote_status IN ('voted', 'absent') OR vote_status IS NULL),
  voted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parties table
CREATE TABLE IF NOT EXISTS parties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  number INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokens table
-- status: 'inactive' | 'activated' | 'voting' | 'used' | 'expired'
CREATE TABLE IF NOT EXISTS tokens (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('inactive', 'activated', 'voting', 'used', 'expired')),
  station_level TEXT,
  print_batch_id TEXT,
  student_id TEXT,
  activated_by INTEGER,
  activated_at TIMESTAMP,
  voting_started_at TIMESTAMP,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id SERIAL PRIMARY KEY,
  party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  station_level TEXT NOT NULL,
  token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
  is_abstain INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(token_id)
);

-- Print Logs table
CREATE TABLE IF NOT EXISTS print_logs (
  id SERIAL PRIMARY KEY,
  batch_id TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  station_level TEXT,
  printed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
