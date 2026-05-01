-- ============================================
-- FIX PARENT STUDENT ANALYTICS FUNCTION
-- Migration: 20260501140500
-- Description: Recreate analytics RPC with latest signature and numeric cast fix
-- ============================================

CREATE OR REPLACE FUNCTION get_parent_student_analytics(
    p_parent_id UUID,
    p_student_id UUID,
    p_days INT DEFAULT 90,
    p_subject_id UUID DEFAULT NULL,
    p_topic_page INT DEFAULT 1,
    p_topic_page_size INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_owner BOOLEAN;
    v_result JSONB;
    v_topic_page INT;
    v_topic_page_size INT;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM students s
        WHERE s.id = p_student_id
          AND s.parent_id = p_parent_id
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
        RAISE EXCEPTION 'Student does not belong to parent'
            USING ERRCODE = 'P0001';
    END IF;

    v_topic_page := GREATEST(COALESCE(p_topic_page, 1), 1);
    v_topic_page_size := LEAST(GREATEST(COALESCE(p_topic_page_size, 10), 1), 50);

    WITH filtered_tests AS (
        SELECT
            t.id,
            t.student_id,
            t.subject_id,
            t.status,
            t.duration_mins,
            COALESCE(t.time_spent_secs, 0) AS time_spent_secs,
            COALESCE(t.percentage, 0)::NUMERIC AS percentage,
            t.answers,
            t.ended_at,
            t.created_at
        FROM tests t
        WHERE t.student_id = p_student_id
          AND t.status IN ('submitted', 'ended_early')
          AND (
              p_subject_id IS NULL
              OR t.subject_id = p_subject_id
          )
          AND (
              p_days IS NULL
              OR t.ended_at >= NOW() - make_interval(days => p_days)
          )
    ),
    total_summary AS (
        SELECT
            COUNT(*)::INT AS total_tests,
            COALESCE(ROUND(AVG(ft.percentage), 2), 0) AS avg_percentage,
            COALESCE(MAX(ft.percentage), 0) AS best_percentage,
            COALESCE(SUM(ft.time_spent_secs), 0)::BIGINT AS total_time_spent_secs,
            COALESCE(SUM(ft.duration_mins * 60), 0)::BIGINT AS total_allotted_secs
        FROM filtered_tests ft
    ),
    pacing AS (
        SELECT
            COALESCE(
                ROUND(
                    (
                        SUM(ft.time_spent_secs)::NUMERIC
                        / NULLIF(SUM(ft.duration_mins * 60), 0)
                    ) * 100,
                    2
                ),
                0
            ) AS pace_vs_allotted_pct,
            COALESCE(
                ROUND(
                    (COUNT(*) FILTER (WHERE ft.status = 'ended_early')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
                    2
                ),
                0
            ) AS ended_early_rate_pct
        FROM filtered_tests ft
    ),
    weekly_counts AS (
        SELECT
            date_trunc('week', ft.ended_at)::DATE AS week_start,
            COUNT(*)::INT AS tests_count
        FROM filtered_tests ft
        WHERE ft.ended_at IS NOT NULL
        GROUP BY 1
    ),
    engagement AS (
        SELECT
            COALESCE(ROUND(AVG(wc.tests_count), 2), 0) AS avg_tests_per_week,
            (
                SELECT
                    COALESCE(MAX(gap_days), 0)::INT
                FROM (
                    SELECT
                        (
                            current_date - LAG(d) OVER (ORDER BY d)
                        )::INT AS gap_days
                    FROM (
                        SELECT DISTINCT ft.ended_at::DATE AS d
                        FROM filtered_tests ft
                        WHERE ft.ended_at IS NOT NULL
                    ) x
                ) g
            ) AS longest_gap_days
        FROM weekly_counts wc
    ),
    daily_trajectory AS (
        SELECT
            ft.ended_at::DATE AS day,
            COUNT(*)::INT AS tests_count,
            ROUND(AVG(ft.percentage), 2) AS avg_percentage
        FROM filtered_tests ft
        WHERE ft.ended_at IS NOT NULL
        GROUP BY 1
        ORDER BY day DESC
        LIMIT 30
    ),
    weekly_trajectory AS (
        SELECT
            date_trunc('week', ft.ended_at)::DATE AS week_start,
            COUNT(*)::INT AS tests_count,
            ROUND(AVG(ft.percentage), 2) AS avg_percentage
        FROM filtered_tests ft
        WHERE ft.ended_at IS NOT NULL
        GROUP BY 1
        ORDER BY week_start DESC
        LIMIT 20
    ),
    subject_student AS (
        SELECT
            ft.subject_id,
            ROUND(AVG(ft.percentage), 2) AS student_avg_percentage,
            COUNT(*)::INT AS tests_taken
        FROM filtered_tests ft
        GROUP BY ft.subject_id
    ),
    peer_tests_filtered AS (
        SELECT
            t.student_id,
            t.subject_id,
            COALESCE(t.percentage, 0)::NUMERIC AS percentage
        FROM tests t
        WHERE t.status IN ('submitted', 'ended_early')
          AND (
              p_subject_id IS NULL
              OR t.subject_id = p_subject_id
          )
          AND (
              p_days IS NULL
              OR t.ended_at >= NOW() - make_interval(days => p_days)
          )
    ),
    subject_peers AS (
        SELECT
            ptf.subject_id,
            ROUND(AVG(ptf.percentage), 2) AS peer_avg_percentage,
            COUNT(*)::INT AS peer_tests_count
        FROM peer_tests_filtered ptf
        GROUP BY ptf.subject_id
    ),
    subject_comparison AS (
        SELECT
            ss.subject_id,
            s.name AS subject_name,
            s.slug AS subject_slug,
            ss.student_avg_percentage,
            COALESCE(sp.peer_avg_percentage, 0) AS peer_avg_percentage,
            ss.tests_taken,
            COALESCE(sp.peer_tests_count, 0) AS peer_tests_count,
            ROUND(ss.student_avg_percentage - COALESCE(sp.peer_avg_percentage, 0), 2) AS delta_percentage
        FROM subject_student ss
        JOIN subjects s ON s.id = ss.subject_id
        LEFT JOIN subject_peers sp ON sp.subject_id = ss.subject_id
    ),
    peer_student_averages AS (
        SELECT
            ptf.student_id,
            ROUND(AVG(ptf.percentage), 2) AS avg_percentage
        FROM peer_tests_filtered ptf
        GROUP BY ptf.student_id
    ),
    peer_overall AS (
        SELECT
            COALESCE(
                (SELECT ROUND(AVG(ft.percentage), 2) FROM filtered_tests ft),
                0
            ) AS student_avg_percentage,
            COALESCE(
                (SELECT ROUND(AVG(psa.avg_percentage), 2) FROM peer_student_averages psa),
                0
            ) AS peer_avg_percentage,
            COALESCE(
                (
                    SELECT ROUND((cd.rank_pct * 100)::NUMERIC, 2)
                    FROM (
                        SELECT
                            psa.student_id,
                            cume_dist() OVER (ORDER BY psa.avg_percentage) AS rank_pct
                        FROM peer_student_averages psa
                    ) cd
                    WHERE cd.student_id = p_student_id
                ),
                0
            ) AS percentile_rank,
            COALESCE((SELECT COUNT(*)::INT FROM peer_student_averages), 0) AS peer_student_count
    ),
    answer_rows AS (
        SELECT
            (a.value->>'question_id')::UUID AS question_id,
            COALESCE((a.value->>'is_correct')::BOOLEAN, FALSE) AS is_correct,
            COALESCE((a.value->>'time_spent_secs')::INT, 0) AS time_spent_secs
        FROM filtered_tests ft
        CROSS JOIN LATERAL jsonb_array_elements(ft.answers) a(value)
        WHERE ft.answers IS NOT NULL
    ),
    enriched_answers AS (
        SELECT
            ar.question_id,
            ar.is_correct,
            ar.time_spent_secs,
            q.difficulty,
            q.question_type,
            COALESCE(NULLIF(TRIM(q.topic), ''), 'Unspecified') AS topic,
            COALESCE(NULLIF(TRIM(q.subtopic), ''), 'Unspecified') AS subtopic
        FROM answer_rows ar
        JOIN questions q ON q.id = ar.question_id
    ),
    error_by_difficulty AS (
        SELECT
            ea.difficulty,
            COUNT(*)::INT AS attempts,
            COUNT(*) FILTER (WHERE ea.is_correct = FALSE)::INT AS wrong_attempts,
            COALESCE(
                ROUND(
                    (COUNT(*) FILTER (WHERE ea.is_correct = FALSE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
                    2
                ),
                0
            ) AS wrong_percentage
        FROM enriched_answers ea
        GROUP BY ea.difficulty
    ),
    error_by_question_type AS (
        SELECT
            ea.question_type,
            COUNT(*)::INT AS attempts,
            COUNT(*) FILTER (WHERE ea.is_correct = FALSE)::INT AS wrong_attempts,
            COALESCE(
                ROUND(
                    (COUNT(*) FILTER (WHERE ea.is_correct = FALSE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
                    2
                ),
                0
            ) AS wrong_percentage
        FROM enriched_answers ea
        GROUP BY ea.question_type
    ),
    topic_breakdown AS (
        SELECT
            ea.topic,
            ea.subtopic,
            COUNT(*)::INT AS attempts,
            COUNT(*) FILTER (WHERE ea.is_correct)::INT AS correct_attempts,
            COALESCE(
                ROUND(
                    (COUNT(*) FILTER (WHERE ea.is_correct)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
                    2
                ),
                0
            ) AS accuracy_percentage,
            COALESCE(ROUND(AVG(ea.time_spent_secs), 2), 0) AS avg_time_spent_secs
        FROM enriched_answers ea
        GROUP BY ea.topic, ea.subtopic
        ORDER BY attempts DESC, accuracy_percentage ASC
    ),
    topic_count AS (
        SELECT COUNT(*)::INT AS total_rows
        FROM topic_breakdown
    ),
    topic_breakdown_page AS (
        SELECT *
        FROM topic_breakdown
        OFFSET (v_topic_page - 1) * v_topic_page_size
        LIMIT v_topic_page_size
    )
    SELECT jsonb_build_object(
        'summary', jsonb_build_object(
            'total_tests', ts.total_tests,
            'avg_percentage', ts.avg_percentage,
            'best_percentage', ts.best_percentage,
            'total_time_spent_secs', ts.total_time_spent_secs
        ),
        'peer_overall', jsonb_build_object(
            'student_avg_percentage', po.student_avg_percentage,
            'peer_avg_percentage', po.peer_avg_percentage,
            'delta_percentage', ROUND(po.student_avg_percentage - po.peer_avg_percentage, 2),
            'percentile_rank', po.percentile_rank,
            'peer_student_count', po.peer_student_count
        ),
        'pacing', jsonb_build_object(
            'pace_vs_allotted_pct', p.pace_vs_allotted_pct,
            'ended_early_rate_pct', p.ended_early_rate_pct
        ),
        'engagement', jsonb_build_object(
            'avg_tests_per_week', e.avg_tests_per_week,
            'longest_gap_days', e.longest_gap_days
        ),
        'subject_comparison', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'subject_id', sc.subject_id,
                        'subject_name', sc.subject_name,
                        'subject_slug', sc.subject_slug,
                        'student_avg_percentage', sc.student_avg_percentage,
                        'peer_avg_percentage', sc.peer_avg_percentage,
                        'delta_percentage', sc.delta_percentage,
                        'tests_taken', sc.tests_taken,
                        'peer_tests_count', sc.peer_tests_count
                    )
                    ORDER BY sc.subject_name
                )
                FROM subject_comparison sc
            ),
            '[]'::JSONB
        ),
        'error_patterns', jsonb_build_object(
            'by_difficulty', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'difficulty', ebd.difficulty,
                            'attempts', ebd.attempts,
                            'wrong_attempts', ebd.wrong_attempts,
                            'wrong_percentage', ebd.wrong_percentage
                        )
                        ORDER BY ebd.difficulty
                    )
                    FROM error_by_difficulty ebd
                ),
                '[]'::JSONB
            ),
            'by_question_type', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'question_type', ebq.question_type,
                            'attempts', ebq.attempts,
                            'wrong_attempts', ebq.wrong_attempts,
                            'wrong_percentage', ebq.wrong_percentage
                        )
                        ORDER BY ebq.question_type
                    )
                    FROM error_by_question_type ebq
                ),
                '[]'::JSONB
            )
        ),
        'topic_breakdown', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'topic', tb.topic,
                        'subtopic', tb.subtopic,
                        'attempts', tb.attempts,
                        'correct_attempts', tb.correct_attempts,
                        'accuracy_percentage', tb.accuracy_percentage,
                        'avg_time_spent_secs', tb.avg_time_spent_secs
                    )
                )
                FROM topic_breakdown_page tb
            ),
            '[]'::JSONB
        ),
        'topic_pagination', jsonb_build_object(
            'page', v_topic_page,
            'page_size', v_topic_page_size,
            'total_rows', COALESCE((SELECT tc.total_rows FROM topic_count tc), 0),
            'total_pages', COALESCE(
                CEIL(
                    COALESCE((SELECT tc.total_rows FROM topic_count tc), 0)::NUMERIC
                    / NULLIF(v_topic_page_size, 0)
                )::INT,
                0
            )
        ),
        'trajectories', jsonb_build_object(
            'daily', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'date', dt.day,
                            'tests_count', dt.tests_count,
                            'avg_percentage', dt.avg_percentage
                        )
                        ORDER BY dt.day
                    )
                    FROM daily_trajectory dt
                ),
                '[]'::JSONB
            ),
            'weekly', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'week_start', wt.week_start,
                            'tests_count', wt.tests_count,
                            'avg_percentage', wt.avg_percentage
                        )
                        ORDER BY wt.week_start
                    )
                    FROM weekly_trajectory wt
                ),
                '[]'::JSONB
            )
        )
    )
    INTO v_result
    FROM total_summary ts
    CROSS JOIN pacing p
    CROSS JOIN engagement e
    CROSS JOIN peer_overall po;

    RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION get_parent_student_analytics(UUID, UUID, INT, UUID, INT, INT) TO authenticated;
