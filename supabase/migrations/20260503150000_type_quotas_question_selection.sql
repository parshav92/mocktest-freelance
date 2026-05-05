-- ============================================
-- MIGRATION: Type-Quotas Template System (App-Layer)
-- Date: 20260503150000
-- Description:
--   Adds type_quotas JSONB column to subject_templates.
--   Adds three helper functions called by buildTypedTestQuestions():
--     1. get_fresh_passages_for_test    — novelty-ordered passage selection
--     2. get_questions_for_passage_typed — adaptive questions for a passage + type
--     3. get_test_questions_by_type     — adaptive standalone questions for a type
-- ============================================

-- ============================================
-- 1. type_quotas COLUMN
-- ============================================

ALTER TABLE subject_templates
    ADD COLUMN IF NOT EXISTS type_quotas JSONB DEFAULT NULL;

COMMENT ON COLUMN subject_templates.type_quotas IS
'Flat JSON map. When non-NULL: test uses typed-quota selection.
When NULL: falls back to legacy difficulty-only adaptive algorithm.

Reserved passage-control keys:
  "passage"      → number of extract passages to select
  "passage_mcq"  → questions taken from each extract passage
  "passage_poem" → number of poem passages to select
  "poem_mcq"     → questions taken from each poem passage

Every other key is treated as a question_type → standalone count.
Adding new question types requires only updating this JSON.

Examples:
  { "mcq": 40 }
  { "passage": 3, "passage_mcq": 5, "passage_poem": 2, "poem_mcq": 5,
    "fill_blank_dropdown": 8, "fill_missing_sentence": 7 }';

-- ============================================
-- 2. get_fresh_passages_for_test
--    Returns passage IDs for a subject + passage_type ordered so that
--    passages the student has NEVER seen come first, then least-recently
--    seen, then random.  "Seen" is derived from student_question_history
--    joined via questions.passage_ids (no separate table needed).
-- ============================================

CREATE OR REPLACE FUNCTION get_fresh_passages_for_test(
    p_student_id    UUID,
    p_subject_id    UUID,
    p_passage_type  TEXT,
    p_count         INT DEFAULT 3
)
RETURNS TABLE (passage_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id
    FROM passages p
    WHERE p.subject_id = p_subject_id
      AND lower(p.passage_type) = lower(p_passage_type)
      -- Only passages that have at least one eligible active question
      AND EXISTS (
          SELECT 1
          FROM questions q
          WHERE q.is_active = TRUE
            AND q.subject_id = p_subject_id
            AND q.passage_ids @> jsonb_build_array(p.id::text)
      )
    ORDER BY
        -- 0 = never seen (highest priority), 1 = seen at least once
        CASE WHEN EXISTS (
            SELECT 1
            FROM student_question_history sqh
            JOIN questions q ON q.id = sqh.question_id
            WHERE sqh.student_id = p_student_id
              AND q.passage_ids @> jsonb_build_array(p.id::text)
        ) THEN 1 ELSE 0 END ASC,
        -- Among seen passages: least-recently-seen first
        (
            SELECT MAX(sqh.last_shown_at)
            FROM student_question_history sqh
            JOIN questions q ON q.id = sqh.question_id
            WHERE sqh.student_id = p_student_id
              AND q.passage_ids @> jsonb_build_array(p.id::text)
        ) ASC NULLS FIRST,
        RANDOM()
    LIMIT p_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_fresh_passages_for_test(UUID, UUID, TEXT, INT) TO authenticated;

-- ============================================
-- 3. get_questions_for_passage_typed
--    Returns question IDs for a specific passage + question_type,
--    ordered by adaptive priority (unseen > prev-wrong), excluding
--    previously-correct questions.
-- ============================================

CREATE OR REPLACE FUNCTION get_questions_for_passage_typed(
    p_student_id    UUID,
    p_passage_id    UUID,
    p_question_type question_type,
    p_limit         INT DEFAULT 5
)
RETURNS TABLE (question_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT q.id
    FROM questions q
    LEFT JOIN student_question_history sqh
        ON q.id = sqh.question_id AND sqh.student_id = p_student_id
    WHERE q.is_active = TRUE
      AND q.question_type = p_question_type
      AND q.subject_id = (SELECT p.subject_id FROM passages p WHERE p.id = p_passage_id)
      AND q.passage_ids @> jsonb_build_array(p_passage_id::text)
      AND (sqh.was_correct IS NULL OR sqh.was_correct = FALSE)
    ORDER BY
        CASE
            WHEN sqh.id IS NULL         THEN 1   -- never seen
            WHEN sqh.was_correct = FALSE THEN 2  -- previously wrong
            ELSE 3
        END,
        sqh.last_shown_at NULLS FIRST,
        RANDOM()
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_questions_for_passage_typed(UUID, UUID, question_type, INT) TO authenticated;

-- ============================================
-- 4. get_test_questions_by_type
--    Adaptive selector for standalone question types (fill_blank_dropdown,
--    fill_missing_sentence, mcq, …).  Same priority logic as
--    get_test_questions but scoped to one question_type.
-- ============================================

CREATE OR REPLACE FUNCTION get_test_questions_by_type(
    p_student_id    UUID,
    p_subject_id    UUID,
    p_question_type question_type,
    p_easy_count    INT DEFAULT 10,
    p_medium_count  INT DEFAULT 5,
    p_hard_count    INT DEFAULT 2
)
RETURNS TABLE (question_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH ranked_questions AS (
        SELECT
            q.id,
            q.difficulty,
            CASE
                WHEN sqh.id IS NULL          THEN 1
                WHEN sqh.was_correct = FALSE THEN 2
                ELSE 3
            END AS priority,
            sqh.last_shown_at
        FROM questions q
        LEFT JOIN student_question_history sqh
            ON q.id = sqh.question_id AND sqh.student_id = p_student_id
        WHERE q.subject_id    = p_subject_id
          AND q.is_active     = TRUE
          AND q.question_type = p_question_type
          AND (sqh.was_correct IS NULL OR sqh.was_correct = FALSE)
        ORDER BY priority, sqh.last_shown_at NULLS FIRST, RANDOM()
    )
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'easy'   LIMIT p_easy_count)
    UNION ALL
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'medium' LIMIT p_medium_count)
    UNION ALL
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'hard'   LIMIT p_hard_count);
END;
$$;

GRANT EXECUTE ON FUNCTION get_test_questions_by_type(UUID, UUID, question_type, INT, INT, INT) TO authenticated;
