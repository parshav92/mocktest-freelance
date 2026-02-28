-- Migration: Multi-passage support for questions
-- Changes passage_id (single FK) to passage_ids (JSONB array of UUIDs)
-- Supports questions referencing 1 or more passages

-- ============================================
-- 1. ADD NEW COLUMN
-- ============================================
ALTER TABLE questions ADD COLUMN passage_ids JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- 2. MIGRATE EXISTING DATA
-- ============================================
-- Convert existing passage_id references to passage_ids arrays
UPDATE questions
SET passage_ids = jsonb_build_array(passage_id::text)
WHERE passage_id IS NOT NULL;

UPDATE questions
SET passage_ids = '[]'::jsonb
WHERE passage_id IS NULL;

-- ============================================
-- 3. DROP OLD COLUMN & FK
-- ============================================
ALTER TABLE questions DROP COLUMN passage_id;

-- ============================================
-- 4. ADD INDEX FOR JSONB QUERIES
-- ============================================
CREATE INDEX idx_questions_passage_ids ON questions USING GIN (passage_ids);

-- ============================================
-- 5. UPDATE get_questions_for_student FUNCTION
-- Now returns passages as JSONB array instead of flat columns
-- ============================================
DROP FUNCTION IF EXISTS get_questions_for_student(UUID, UUID[], BOOLEAN);

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
    passage_ids JSONB,
    passages JSONB
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
        v_has_valid_subscription := TRUE;
    ELSIF v_grace_period_ends_at IS NOT NULL AND v_grace_period_ends_at > NOW() THEN
        v_has_valid_subscription := TRUE;
    END IF;

    IF NOT v_has_valid_subscription THEN
        RETURN;
    END IF;

    -- Return questions with passages as JSONB array
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
            q.passage_ids,
            (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'code', p.code,
                        'passage_type', p.passage_type,
                        'title', p.title,
                        'content', p.content,
                        'image_url', p.image_url
                    )
                ), '[]'::jsonb)
                FROM passages p
                WHERE p.id::text IN (
                    SELECT jsonb_array_elements_text(q.passage_ids)
                )
            ) AS passages
        FROM questions q
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
            q.passage_ids,
            (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'code', p.code,
                        'passage_type', p.passage_type,
                        'title', p.title,
                        'content', p.content,
                        'image_url', p.image_url
                    )
                ), '[]'::jsonb)
                FROM passages p
                WHERE p.id::text IN (
                    SELECT jsonb_array_elements_text(q.passage_ids)
                )
            ) AS passages
        FROM questions q
        WHERE q.id = ANY(p_question_ids)
          AND q.is_active = TRUE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_questions_for_student(UUID, UUID[], BOOLEAN) TO authenticated;
