-- Quota-driven test selection.
--
-- type_quotas is the source of truth for test length. Passage questions are
-- selected without a difficulty target, while standalone question candidates
-- include their difficulty so the application can apply the student's
-- adaptive distribution.

CREATE OR REPLACE FUNCTION public.get_fresh_passages_with_capacity(
    p_student_id UUID,
    p_subject_id UUID,
    p_passage_type TEXT,
    p_question_type public.question_type,
    p_min_questions INT,
    p_count INT
)
RETURNS TABLE (passage_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.id
    FROM public.passages p
    WHERE p.subject_id = p_subject_id
      AND lower(p.passage_type) = lower(p_passage_type)
      AND (
          SELECT count(*)
          FROM public.questions q
          WHERE q.is_active = TRUE
            AND q.subject_id = p_subject_id
            AND q.question_type = p_question_type
            AND q.passage_ids @> jsonb_build_array(p.id::text)
      ) >= greatest(p_min_questions, 0)
    ORDER BY
        CASE WHEN EXISTS (
            SELECT 1
            FROM public.student_question_history sqh
            JOIN public.questions q ON q.id = sqh.question_id
            WHERE sqh.student_id = p_student_id
              AND q.passage_ids @> jsonb_build_array(p.id::text)
        ) THEN 1 ELSE 0 END,
        (
            SELECT max(sqh.last_shown_at)
            FROM public.student_question_history sqh
            JOIN public.questions q ON q.id = sqh.question_id
            WHERE sqh.student_id = p_student_id
              AND q.passage_ids @> jsonb_build_array(p.id::text)
        ) ASC NULLS FIRST,
        random()
    LIMIT greatest(p_count, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_questions_for_passage_quota(
    p_student_id UUID,
    p_passage_id UUID,
    p_question_type public.question_type,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (question_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT q.id
    FROM public.questions q
    LEFT JOIN public.student_question_history sqh
      ON q.id = sqh.question_id
     AND sqh.student_id = p_student_id
    WHERE q.is_active = TRUE
      AND q.question_type = p_question_type
      AND q.subject_id = (
          SELECT p.subject_id
          FROM public.passages p
          WHERE p.id = p_passage_id
      )
      AND q.passage_ids @> jsonb_build_array(p_passage_id::text)
    ORDER BY
        CASE
            WHEN sqh.id IS NULL THEN 1
            WHEN sqh.was_correct = FALSE THEN 2
            ELSE 3
        END,
        sqh.last_shown_at ASC NULLS FIRST,
        random()
    LIMIT greatest(p_limit, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_test_question_candidates_by_type(
    p_student_id UUID,
    p_subject_id UUID,
    p_question_type public.question_type
)
RETURNS TABLE (
    question_id UUID,
    question_difficulty TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT q.id, q.difficulty::text
    FROM public.questions q
    LEFT JOIN public.student_question_history sqh
      ON q.id = sqh.question_id
     AND sqh.student_id = p_student_id
    WHERE q.subject_id = p_subject_id
      AND q.is_active = TRUE
      AND q.question_type = p_question_type
      AND coalesce(q.passage_ids, '[]'::jsonb) = '[]'::jsonb
    ORDER BY
        CASE
            WHEN sqh.id IS NULL THEN 1
            WHEN sqh.was_correct = FALSE THEN 2
            ELSE 3
        END,
        sqh.last_shown_at ASC NULLS FIRST,
        random();
$$;

REVOKE ALL ON FUNCTION public.get_fresh_passages_with_capacity(
    UUID, UUID, TEXT, public.question_type, INT, INT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_questions_for_passage_quota(
    UUID, UUID, public.question_type, INT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_test_question_candidates_by_type(
    UUID, UUID, public.question_type
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_fresh_passages_with_capacity(
    UUID, UUID, TEXT, public.question_type, INT, INT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_questions_for_passage_quota(
    UUID, UUID, public.question_type, INT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_test_question_candidates_by_type(
    UUID, UUID, public.question_type
) TO service_role;
