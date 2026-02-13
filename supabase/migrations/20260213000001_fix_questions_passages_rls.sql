-- ============================================
-- FIX: Add RLS policies for questions and passages
-- Migration: 20260213000001
-- Description: Allow API (anon role) to read questions and passages
-- Security: Answer validation happens in SECURITY DEFINER functions,
--           not at RLS level. Students access via custom JWT through API.
-- ============================================

-- ============================================
-- QUESTIONS TABLE: Allow reading for API
-- ============================================

-- Drop existing restrictive policies if needed
DROP POLICY IF EXISTS "API can read active questions" ON questions;

-- Create policy allowing anon/authenticated to read questions
-- Security note: correct_answer is visible but grading happens server-side
-- Students see answers only after submission via gradeAnswers() function
CREATE POLICY "API can read active questions"
    ON questions FOR SELECT
    USING (is_active = TRUE);

-- Keep admin policy for full management
-- (Already exists from previous migration)

-- ============================================
-- PASSAGES TABLE: Allow reading for API
-- ============================================

-- Drop existing restrictive policies if needed
DROP POLICY IF EXISTS "API can read passages" ON passages;

-- Create policy allowing anon/authenticated to read passages
-- Note: passages table doesn't have is_active column
CREATE POLICY "API can read passages"
    ON passages FOR SELECT
    USING (TRUE);

-- Keep admin policy for full management
-- (Already exists from previous migration)

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Ensure anon and authenticated roles can read from these tables
-- (This is redundant with RLS policies but explicit is good)
GRANT SELECT ON questions TO anon, authenticated;
GRANT SELECT ON passages TO anon, authenticated;

-- Note: INSERT/UPDATE/DELETE remain admin-only via existing policies
