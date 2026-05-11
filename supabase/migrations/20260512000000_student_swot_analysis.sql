-- ============================================
-- STUDENT SWOT ANALYSIS
-- Migration: 20260512000000
-- Description: RPC to compute SWOT analysis for a student
--   Strength  = topics where student accuracy >= own overall average
--   Weakness  = topics where student accuracy <  own overall average
--   Opportunity = strengths where student outperforms peers
--   Threat      = weaknesses where peers outperform student
-- ============================================

CREATE OR REPLACE FUNCTION get_student_swot(
    p_parent_id UUID,
    p_student_id UUID,
    p_days INT DEFAULT 90,
    p_subject_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_owner BOOLEAN;
    v_result JSONB;
    v_min_attempts INT := 5;
BEGIN
    -- Ownership check
    SELECT EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = p_student_id AND s.parent_id = p_parent_id
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        RAISE EXCEPTION 'Student does not belong to parent'
            USING ERRCODE = 'P0001';
    END IF;

    WITH
    -- ── Student's filtered tests ──────────────────────────
    student_tests AS (
        SELECT t.id, t.answers, t.subject_id, t.percentage
        FROM tests t
        WHERE t.student_id = p_student_id
          AND t.status IN ('submitted', 'ended_early')
          AND (p_subject_id IS NULL OR t.subject_id = p_subject_id)
          AND (p_days IS NULL OR t.ended_at >= NOW() - make_interval(days => p_days))
    ),

    -- ── Student answer rows ──────────────────────────────
    student_answers AS (
        SELECT
            (a.value->>'question_id')::UUID AS question_id,
            COALESCE((a.value->>'is_correct')::BOOLEAN, FALSE) AS is_correct
        FROM student_tests st
        CROSS JOIN LATERAL jsonb_array_elements(st.answers) a(value)
        WHERE st.answers IS NOT NULL
    ),

    -- ── Student answers enriched with topic info ─────────
    student_topic_answers AS (
        SELECT
            COALESCE(NULLIF(TRIM(q.topic), ''), 'Unspecified') AS topic,
            COALESCE(NULLIF(TRIM(q.subtopic), ''), 'Unspecified') AS subtopic,
            sa.is_correct
        FROM student_answers sa
        JOIN questions q ON q.id = sa.question_id
    ),

    -- ── Per-topic accuracy for the student (min attempts filter) ──
    student_topic_acc AS (
        SELECT
            sta.topic,
            sta.subtopic,
            COUNT(*)::INT AS attempts,
            COUNT(*) FILTER (WHERE sta.is_correct)::INT AS correct,
            COALESCE(
                ROUND(
                    (COUNT(*) FILTER (WHERE sta.is_correct)::NUMERIC
                     / NULLIF(COUNT(*), 0)) * 100, 2
                ), 0
            ) AS accuracy
        FROM student_topic_answers sta
        GROUP BY sta.topic, sta.subtopic
        HAVING COUNT(*) >= v_min_attempts
    ),

    -- ── Student overall accuracy across ALL answered questions ──
    student_overall AS (
        SELECT COALESCE(
            ROUND(
                (COUNT(*) FILTER (WHERE sta.is_correct)::NUMERIC
                 / NULLIF(COUNT(*), 0)) * 100, 2
            ), 0
        ) AS overall_accuracy
        FROM student_topic_answers sta
    ),

    -- ── Peer tests (all other students, same filters) ────
    peer_answers AS (
        SELECT
            (a.value->>'question_id')::UUID AS question_id,
            COALESCE((a.value->>'is_correct')::BOOLEAN, FALSE) AS is_correct
        FROM tests t
        CROSS JOIN LATERAL jsonb_array_elements(t.answers) a(value)
        WHERE t.student_id != p_student_id
          AND t.status IN ('submitted', 'ended_early')
          AND t.answers IS NOT NULL
          AND (p_subject_id IS NULL OR t.subject_id = p_subject_id)
          AND (p_days IS NULL OR t.ended_at >= NOW() - make_interval(days => p_days))
    ),

    -- ── Peer per-topic accuracy ──────────────────────────
    peer_topic_acc AS (
        SELECT
            COALESCE(NULLIF(TRIM(q.topic), ''), 'Unspecified') AS topic,
            COALESCE(NULLIF(TRIM(q.subtopic), ''), 'Unspecified') AS subtopic,
            COALESCE(
                ROUND(
                    (COUNT(*) FILTER (WHERE pa.is_correct)::NUMERIC
                     / NULLIF(COUNT(*), 0)) * 100, 2
                ), 0
            ) AS accuracy
        FROM peer_answers pa
        JOIN questions q ON q.id = pa.question_id
        GROUP BY 1, 2
    ),

    -- ── Peer overall accuracy ────────────────────────────
    peer_overall AS (
        SELECT COALESCE(
            ROUND(
                (COUNT(*) FILTER (WHERE pa.is_correct)::NUMERIC
                 / NULLIF(COUNT(*), 0)) * 100, 2
            ), 0
        ) AS overall_accuracy
        FROM peer_answers pa
    ),

    -- ── Classify each topic into SWOT quadrants ──────────
    topic_classified AS (
        SELECT
            sta.topic,
            sta.subtopic,
            sta.attempts,
            sta.correct,
            sta.accuracy AS student_accuracy,
            COALESCE(pta.accuracy, 0) AS peer_accuracy,
            ROUND(sta.accuracy - COALESCE(pta.accuracy, 0), 2) AS delta,
            CASE
                WHEN sta.accuracy >= so.overall_accuracy THEN 'strength'
                ELSE 'weakness'
            END AS base_class
        FROM student_topic_acc sta
        CROSS JOIN student_overall so
        LEFT JOIN peer_topic_acc pta
            ON pta.topic = sta.topic AND pta.subtopic = sta.subtopic
    ),

    -- ── Subject-level: student per-subject avg ───────────
    student_subject_perf AS (
        SELECT
            st.subject_id,
            s.name AS subject_name,
            COALESCE(ROUND(AVG(COALESCE(st.percentage, 0)::NUMERIC), 2), 0) AS student_avg
        FROM student_tests st
        JOIN subjects s ON s.id = st.subject_id
        GROUP BY st.subject_id, s.name
    ),

    -- ── Subject-level: peer per-subject avg ──────────────
    peer_subject_perf AS (
        SELECT
            t.subject_id,
            COALESCE(ROUND(AVG(COALESCE(t.percentage, 0)::NUMERIC), 2), 0) AS peer_avg
        FROM tests t
        WHERE t.student_id != p_student_id
          AND t.status IN ('submitted', 'ended_early')
          AND (p_subject_id IS NULL OR t.subject_id = p_subject_id)
          AND (p_days IS NULL OR t.ended_at >= NOW() - make_interval(days => p_days))
        GROUP BY t.subject_id
    ),

    -- ── Student overall subject average ──────────────────
    student_subject_overall AS (
        SELECT COALESCE(AVG(ssp.student_avg), 0) AS overall_avg
        FROM student_subject_perf ssp
    ),

    -- ── Subject SWOT classification ──────────────────────
    subject_classified AS (
        SELECT
            ssp.subject_id,
            ssp.subject_name,
            ssp.student_avg,
            COALESCE(psp.peer_avg, 0) AS peer_avg,
            ROUND(ssp.student_avg - COALESCE(psp.peer_avg, 0), 2) AS delta,
            CASE
                WHEN ssp.student_avg >= sso.overall_avg
                     AND ssp.student_avg > COALESCE(psp.peer_avg, 0)
                    THEN 'opportunity'
                WHEN ssp.student_avg >= sso.overall_avg
                    THEN 'strength'
                WHEN ssp.student_avg < sso.overall_avg
                     AND COALESCE(psp.peer_avg, 0) > ssp.student_avg
                    THEN 'threat'
                ELSE 'weakness'
            END AS quadrant
        FROM student_subject_perf ssp
        CROSS JOIN student_subject_overall sso
        LEFT JOIN peer_subject_perf psp ON psp.subject_id = ssp.subject_id
    )

    -- ── Assemble final JSON ──────────────────────────────
    SELECT jsonb_build_object(
        'strengths', COALESCE((
            SELECT jsonb_agg(r ORDER BY r->>'student_accuracy' DESC)
            FROM (
                SELECT jsonb_build_object(
                    'topic', tc.topic,
                    'subtopic', tc.subtopic,
                    'student_accuracy', tc.student_accuracy,
                    'attempts', tc.attempts,
                    'peer_accuracy', tc.peer_accuracy,
                    'delta', tc.delta
                ) AS r
                FROM topic_classified tc
                WHERE tc.base_class = 'strength'
            ) sub
        ), '[]'::JSONB),

        'weaknesses', COALESCE((
            SELECT jsonb_agg(r ORDER BY r->>'student_accuracy' ASC)
            FROM (
                SELECT jsonb_build_object(
                    'topic', tc.topic,
                    'subtopic', tc.subtopic,
                    'student_accuracy', tc.student_accuracy,
                    'attempts', tc.attempts,
                    'peer_accuracy', tc.peer_accuracy,
                    'delta', tc.delta
                ) AS r
                FROM topic_classified tc
                WHERE tc.base_class = 'weakness'
            ) sub
        ), '[]'::JSONB),

        'opportunities', COALESCE((
            SELECT jsonb_agg(r ORDER BY r->>'delta' DESC)
            FROM (
                SELECT jsonb_build_object(
                    'topic', tc.topic,
                    'subtopic', tc.subtopic,
                    'student_accuracy', tc.student_accuracy,
                    'attempts', tc.attempts,
                    'peer_accuracy', tc.peer_accuracy,
                    'delta', tc.delta
                ) AS r
                FROM topic_classified tc
                WHERE tc.base_class = 'strength'
                  AND tc.student_accuracy > tc.peer_accuracy
            ) sub
        ), '[]'::JSONB),

        'threats', COALESCE((
            SELECT jsonb_agg(r ORDER BY r->>'delta' ASC)
            FROM (
                SELECT jsonb_build_object(
                    'topic', tc.topic,
                    'subtopic', tc.subtopic,
                    'student_accuracy', tc.student_accuracy,
                    'attempts', tc.attempts,
                    'peer_accuracy', tc.peer_accuracy,
                    'delta', tc.delta
                ) AS r
                FROM topic_classified tc
                WHERE tc.base_class = 'weakness'
                  AND tc.peer_accuracy > tc.student_accuracy
            ) sub
        ), '[]'::JSONB),

        'subject_swot', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'subject_id', sc.subject_id,
                    'subject_name', sc.subject_name,
                    'student_avg', sc.student_avg,
                    'peer_avg', sc.peer_avg,
                    'delta', sc.delta,
                    'quadrant', sc.quadrant
                )
                ORDER BY sc.subject_name
            )
            FROM subject_classified sc
        ), '[]'::JSONB),

        'meta', jsonb_build_object(
            'student_overall_accuracy',
                COALESCE((SELECT so.overall_accuracy FROM student_overall so), 0),
            'peer_overall_accuracy',
                COALESCE((SELECT po.overall_accuracy FROM peer_overall po), 0),
            'total_topics_analysed',
                COALESCE((SELECT COUNT(*)::INT FROM student_topic_acc), 0),
            'days_analysed', COALESCE(p_days, 0)
        )
    )
    INTO v_result;

    RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_swot(UUID, UUID, INT, UUID) TO authenticated;
