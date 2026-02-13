-- Migration: Add secure function for fetching questions with subscription check
-- Students use custom JWT auth (not Supabase Auth), so we use SECURITY DEFINER functions
-- instead of RLS policies for question access control

-- ============================================
-- FUNCTION: Get questions for a student with subscription validation
-- Only returns questions if student has active or grace_period subscription
-- Returns empty array if subscription expired
-- ============================================
CREATE TYPE passage_type AS ENUM ('extract', 'poem', 'article');
CREATE OR REPLACE FUNCTION get_questions_for_student(
    p_student_id UUID,
    p_question_ids UUID[],
    p_include_answers BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    code TEXT,
    question_type question_type,
    difficulty difficulty_level,
    content JSONB,
    marks INT,
    correct_answer JSONB,
    solution_text TEXT,
    passage_id UUID,
    passage_code TEXT,
    passage_type passage_type,
    passage_title TEXT,
    passage_content TEXT,
    passage_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription_status subscription_status;
    v_expires_at TIMESTAMPTZ;
    v_grace_period_ends_at TIMESTAMPTZ;
    v_has_valid_subscription BOOLEAN := FALSE;
BEGIN
    -- Get subscription status for the student
    SELECT s.status, s.expires_at, s.grace_period_ends_at
    INTO v_subscription_status, v_expires_at, v_grace_period_ends_at
    FROM subscriptions s
    WHERE s.student_id = p_student_id
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- Check if subscription is valid (active or in grace period)
    IF v_expires_at IS NOT NULL AND v_expires_at > NOW() THEN
        -- Active subscription
        v_has_valid_subscription := TRUE;
    ELSIF v_grace_period_ends_at IS NOT NULL AND v_grace_period_ends_at > NOW() THEN
        -- In grace period (can still review)
        v_has_valid_subscription := TRUE;
    END IF;
    
    -- If no valid subscription, return empty
    IF NOT v_has_valid_subscription THEN
        RETURN;
    END IF;
    
    -- Return questions with optional answers
    IF p_include_answers THEN
        RETURN QUERY
        SELECT 
            q.id,
            q.code,
            q.question_type,
            q.difficulty,
            q.content,
            q.marks,
            q.correct_answer,
            q.solution_text,
            p.id AS passage_id,
            p.code AS passage_code,
            p.passage_type,
            p.title AS passage_title,
            p.content AS passage_content,
            p.image_url AS passage_image_url
        FROM questions q
        LEFT JOIN passages p ON q.passage_id = p.id
        WHERE q.id = ANY(p_question_ids)
          AND q.is_active = TRUE;
    ELSE
        RETURN QUERY
        SELECT 
            q.id,
            q.code,
            q.question_type,
            q.difficulty,
            q.content,
            q.marks,
            NULL::JSONB AS correct_answer,
            NULL::TEXT AS solution_text,
            p.id AS passage_id,
            p.code AS passage_code,
            p.passage_type,
            p.title AS passage_title,
            p.content AS passage_content,
            p.image_url AS passage_image_url
        FROM questions q
        LEFT JOIN passages p ON q.passage_id = p.id
        WHERE q.id = ANY(p_question_ids)
          AND q.is_active = TRUE;
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_questions_for_student(UUID, UUID[], BOOLEAN) TO authenticated;

-- ============================================
-- FUNCTION: Calculate total marks for a set of questions
-- This is a simple helper that doesn't expose question content
-- ============================================

CREATE OR REPLACE FUNCTION calculate_total_marks(p_question_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_marks INT;
BEGIN
    SELECT COALESCE(SUM(marks), 0)
    INTO v_total_marks
    FROM questions
    WHERE id = ANY(p_question_ids)
      AND is_active = TRUE;
    
    RETURN v_total_marks;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_total_marks(UUID[]) TO authenticated;

-- Note: We don't need RLS on questions table for students because
-- all student access goes through these SECURITY DEFINER functions.
-- The admin-only policy remains for admin operations.
