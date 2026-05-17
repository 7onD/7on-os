-- Run this in Supabase SQL Editor
-- 1. Clear all sample data
DELETE FROM tasks;
DELETE FROM contacts;
DELETE FROM deals;
DELETE FROM fin_income;
DELETE FROM fin_expenses;
DELETE FROM goals;
DELETE FROM events;
DELETE FROM monthly;

-- 2. Add description columns for tasks and events
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
