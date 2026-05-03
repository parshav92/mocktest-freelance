-- ============================================
-- MIGRATION: Rollback Type-Quotas Template System
-- Date: 20260503
-- Description:
--   Reverts question selection to legacy difficulty-only behavior.
--   Removes helper functions introduced for template type quotas.
--   Safely disables template quota data if the column exists.
-- ============================================

-- 1) Remove helper functions introduced by type-quotas migration
DROP FUNCTION IF EXISTS get_test_questions_by_type(UUID, UUID, question_type, INT, INT, INT);
DROP FUNCTION IF EXISTS get_passage_questions_for_test(UUID, UUID, question_type, INT);
DROP FUNCTION IF EXISTS get_passage_questions_for_test(UUID, UUID, INT);

-- 2) Disable template quota payloads (non-destructive)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subject_templates'
          AND column_name = 'type_quotas'
    ) THEN
        UPDATE subject_templates
        SET type_quotas = NULL
        WHERE type_quotas IS NOT NULL;
    END IF;
END;
$$;

-- 3) Restore legacy difficulty-only selector
CREATE OR REPLACE FUNCTION get_test_questions(
    p_student_id UUID,
    p_subject_id UUID,
    p_easy_count INT DEFAULT 25,
    p_medium_count INT DEFAULT 10,
    p_hard_count INT DEFAULT 5
)
RETURNS TABLE (question_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tests_taken INT;
BEGIN
    -- Keep this read for backward compatibility with existing function shape.
    SELECT COALESCE(tests_taken, 0) INTO v_tests_taken
    FROM student_subject_stats
    WHERE student_id = p_student_id AND subject_id = p_subject_id;

    RETURN QUERY
    WITH ranked_questions AS (
        SELECT
            q.id,
            q.difficulty,
            CASE
                WHEN sqh.id IS NULL THEN 1
                WHEN sqh.was_correct = FALSE THEN 2
                ELSE 3
            END AS priority,
            sqh.last_shown_at
        FROM questions q
        LEFT JOIN student_question_history sqh
            ON q.id = sqh.question_id AND sqh.student_id = p_student_id
        WHERE q.subject_id = p_subject_id
          AND q.is_active = TRUE
          AND (sqh.was_correct IS NULL OR sqh.was_correct = FALSE)
        ORDER BY priority, sqh.last_shown_at NULLS FIRST, RANDOM()
    )
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'easy' LIMIT p_easy_count)
    UNION ALL
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'medium' LIMIT p_medium_count)
    UNION ALL
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'hard' LIMIT p_hard_count);
END;
$$;

GRANT EXECUTE ON FUNCTION get_test_questions(UUID, UUID, INT, INT, INT) TO authenticated;
