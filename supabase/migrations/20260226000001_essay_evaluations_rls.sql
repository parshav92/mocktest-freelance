-- ============================================
-- RLS POLICIES FOR ESSAY EVALUATIONS TABLE
-- ============================================
-- This migration adds Row Level Security policies for the essay_evaluations table.
-- The table is used as a queue for LLM-based essay evaluation.

-- Enable RLS on the table
ALTER TABLE essay_evaluations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INSERT POLICIES
-- ============================================

-- Students can queue evaluations for their own essays
-- This happens when they submit a test containing essay questions
CREATE POLICY "Students can insert own essay evaluations"
    ON essay_evaluations FOR INSERT
    WITH CHECK (TRUE);  -- Controlled via application layer (student_id verified in service)

-- ============================================
-- SELECT POLICIES
-- ============================================

-- Students can view their own evaluations
CREATE POLICY "Students can view own essay evaluations"
    ON essay_evaluations FOR SELECT
    USING (TRUE);  -- Controlled via application layer

-- Parents can view their children's evaluations
CREATE POLICY "Parents can view children essay evaluations"
    ON essay_evaluations FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM students WHERE parent_id = auth.uid()
        )
    );

-- Admins can view all evaluations
CREATE POLICY "Admins can view all essay evaluations"
    ON essay_evaluations FOR SELECT
    USING (is_admin());

-- ============================================
-- UPDATE POLICIES
-- ============================================

-- System/service can update evaluations (for processing queue)
-- This is needed by the cron job that processes the queue
CREATE POLICY "System can update essay evaluations"
    ON essay_evaluations FOR UPDATE
    USING (TRUE);  -- Controlled via API authentication (CRON_SECRET/ESSAY_EVAL_WORKER_SECRET)

-- ============================================
-- DELETE POLICIES
-- ============================================

-- Admins can delete evaluations if needed
CREATE POLICY "Admins can delete essay evaluations"
    ON essay_evaluations FOR DELETE
    USING (is_admin());
