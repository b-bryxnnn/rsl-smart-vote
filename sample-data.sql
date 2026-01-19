-- Sample data for testing RSL Smart Vote
-- Run this after schema.sql to have test data

-- Insert sample parties
INSERT INTO parties (name, number) VALUES
  ('พรรคพัฒนา', 1),
  ('พรรคก้าวหน้า', 2),
  ('พรรครวมใจ', 3);

-- Insert sample students
INSERT INTO students (student_id, prefix, first_name, last_name, level, room) VALUES
  ('12345', 'นาย', 'สมชาย', 'ใจดี', 'ม.4', '1'),
  ('12346', 'นางสาว', 'สมหญิง', 'รักเรียน', 'ม.4', '1'),
  ('12347', 'นาย', 'วิชัย', 'เก่งกล้า', 'ม.5', '2'),
  ('12348', 'นางสาว', 'วิภา', 'สดใส', 'ม.5', '2'),
  ('12349', 'นาย', 'ประเสริฐ', 'มานะ', 'ม.6', '3'),
  ('12350', 'นางสาว', 'ประภา', 'อดทน', 'ม.6', '3');
