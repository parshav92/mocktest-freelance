-- Migration: Add code_prefix column to subjects table
-- This allows admin to add new subjects without code changes

-- Add code_prefix column
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(5) UNIQUE;

-- Update existing subjects with their code prefixes
UPDATE subjects SET code_prefix = 'RD' WHERE slug = 'reading';
UPDATE subjects SET code_prefix = 'WR' WHERE slug = 'writing';
UPDATE subjects SET code_prefix = 'MR' WHERE slug = 'mathematical-reasoning';
UPDATE subjects SET code_prefix = 'TS' WHERE slug = 'thinking-skills';

-- Make code_prefix NOT NULL after setting initial values
-- ALTER TABLE subjects ALTER COLUMN code_prefix SET NOT NULL;
-- Note: Keeping nullable for now to allow gradual migration
