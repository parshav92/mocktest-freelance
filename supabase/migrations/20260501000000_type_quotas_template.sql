-- ============================================
-- MIGRATION: Type-Quotas Template System
-- Date: 20260501
-- Description: Extends subject_templates with per-question-type quotas.
--   Adds DB functions for type-filtered and passage-filtered question selection.
--   Seeds Reading template with type_quotas.
-- ============================================

-- ============================================
-- 1. ADD type_quotas COLUMN TO subject_templates
-- ============================================

ALTER TABLE subject_templates ADD COLUMN IF NOT EXISTS type_quotas JSONB DEFAULT NULL;

COMMENT ON COLUMN subject_templates.type_quotas IS
'When non-NULL, the test uses template-based question selection (per question_type quotas).
When NULL, the test uses the legacy difficulty-only adaptive algo (easy_count/medium_count/hard_count).
Structure:
{
  "passage_groups": [
    { "passage_type": "extract", "question_type": "passage_mcq", "passage_count": 2, "total_questions": 10 },
    { "passage_type": "poem",    "question_type": "poem_mcq",    "passage_count": 1, "total_questions": 5 }
  ],
  "standalone_types": [
    { "question_type": "fill_blank_dropdown",   "count": 17 },
    { "question_type": "fill_missing_sentence", "count": 8 }
  ],
  "fallback_type": "fill_blank_dropdown"
}';

-- ============================================
-- 2. FUNCTION: get_test_questions_by_type
--    Same as get_test_questions but with a question_type filter.
-- ============================================

CREATE OR REPLACE FUNCTION get_test_questions_by_type(
    p_student_id UUID,
    p_subject_id UUID,
    p_question_type question_type,
    p_easy_count INT DEFAULT 10,
    p_medium_count INT DEFAULT 5,
    p_hard_count INT DEFAULT 2
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
                WHEN sqh.id IS NULL THEN 1              -- Never seen (highest priority)
                WHEN sqh.was_correct = FALSE THEN 2     -- Previously wrong
                ELSE 3                                   -- Previously correct (lowest)
            END as priority,
            sqh.last_shown_at
        FROM questions q
        LEFT JOIN student_question_history sqh
            ON q.id = sqh.question_id AND sqh.student_id = p_student_id
        WHERE q.subject_id = p_subject_id
          AND q.is_active = TRUE
          AND q.question_type = p_question_type
          AND (sqh.was_correct IS NULL OR sqh.was_correct = FALSE)
        ORDER BY priority, sqh.last_shown_at NULLS FIRST, RANDOM()
    )
    -- Get easy questions
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'easy' LIMIT p_easy_count)
    UNION ALL
    -- Get medium questions
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'medium' LIMIT p_medium_count)
    UNION ALL
    -- Get hard questions
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'hard' LIMIT p_hard_count);
END;
$$;

-- ============================================
-- 3. FUNCTION: get_passage_questions_for_test
--    Returns eligible questions linked to a specific passage,
--    ordered by adaptive priority (unseen > prev-wrong).
-- ============================================

CREATE OR REPLACE FUNCTION get_passage_questions_for_test(
    p_student_id UUID,
    p_passage_id UUID,
    p_max_questions INT DEFAULT 100
)
RETURNS TABLE (question_id UUID, difficulty difficulty_level)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT q.id, q.difficulty
    FROM questions q
    LEFT JOIN student_question_history sqh
        ON q.id = sqh.question_id AND sqh.student_id = p_student_id
    WHERE q.is_active = TRUE
      AND q.passage_ids @> jsonb_build_array(p_passage_id::text)
      AND (sqh.was_correct IS NULL OR sqh.was_correct = FALSE)
    ORDER BY
        CASE
            WHEN sqh.id IS NULL THEN 1
            WHEN sqh.was_correct = FALSE THEN 2
            ELSE 3
        END,
        sqh.last_shown_at NULLS FIRST,
        RANDOM()
    LIMIT p_max_questions;
END;
$$;

-- ============================================
-- 4. SEED DATA: Reading template type_quotas
--    (placeholder values — update with real numbers)
-- ============================================

UPDATE subject_templates
SET type_quotas = '{
  "passage_groups": [
    {"passage_type": "extract", "question_type": "passage_mcq", "passage_count": 2, "total_questions": 10},
    {"passage_type": "poem", "question_type": "poem_mcq", "passage_count": 1, "total_questions": 5}
  ],
  "standalone_types": [
    {"question_type": "fill_blank_dropdown", "count": 17},
    {"question_type": "fill_missing_sentence", "count": 8}
  ],
  "fallback_type": "fill_blank_dropdown"
}'::JSONB
WHERE subject_id = (SELECT id FROM subjects WHERE slug = 'reading')
  AND is_default = TRUE;

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_test_questions_by_type(UUID, UUID, question_type, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_passage_questions_for_test(UUID, UUID, INT) TO authenticated;
