import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/custom-tests/[slug]/submit
 *
 * Grade answers for a custom test. Server-side grading prevents cheating.
 *
 * Body:
 *   - answers: Record<string, string | number[] | Record<string, number>>
 *     Maps question_id → selected answer
 *
 * Returns graded results with correct answers for review.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params;

    const supabase = await createClient();

    // Verify authenticated user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 },
        );
    }

    // Parse body
    let body: { answers: Record<string, string | number[] | Record<string, number>> };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { answers } = body;
    if (!answers || typeof answers !== "object") {
        return NextResponse.json(
            { error: "answers object is required" },
            { status: 400 },
        );
    }

    // Fetch custom test
    const { data: test, error: testError } = await supabase
        .from("custom_tests")
        .select("id, name, slug, visibility, duration_mins")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

    if (testError || !test) {
        return NextResponse.json(
            { error: "Test not found" },
            { status: 404 },
        );
    }

    // Fetch questions WITH correct answers for grading
    const { data: assignments, error: assignError } = await supabase
        .from("custom_test_questions")
        .select(
            `
            question_id,
            sort_order,
            questions (
                id,
                code,
                question_type,
                difficulty,
                content,
                correct_answer,
                solution_text,
                marks,
                passage_ids
            )
            `,
        )
        .eq("custom_test_id", test.id)
        .order("sort_order", { ascending: true });

    if (assignError) {
        return NextResponse.json(
            { error: "Failed to load test questions" },
            { status: 500 },
        );
    }

    // Safely parse passage_ids from JSONB (may come as string or array)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsePassageIds = (raw: any): string[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === "string") {
            try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
        }
        return [];
    };

    // Fetch passages for review
    const allPassageIds = new Set<string>();
    const questionsRaw = (assignments || []).map((a) => {
        const q = a.questions as unknown as {
            id: string;
            code: string;
            question_type: string;
            difficulty: string;
            content: Record<string, unknown>;
            correct_answer: Record<string, unknown> | null;
            solution_text: string | null;
            marks: number;
            passage_ids: unknown;
        };
        const pids = parsePassageIds(q.passage_ids);
        for (const pid of pids) allPassageIds.add(pid);
        return { ...q, passage_ids: pids };
    });

    let passagesMap: Record<string, unknown> = {};
    if (allPassageIds.size > 0) {
        const { data: passages } = await supabase
            .from("passages")
            .select("id, code, passage_type, title, content, image_url")
            .in("id", Array.from(allPassageIds));
        if (passages) {
            for (const p of passages) {
                passagesMap[p.id] = p;
            }
        }
    }

    // Grade each question
    interface GradedQuestion {
        question_id: string;
        code: string;
        question_type: string;
        difficulty: string;
        content: Record<string, unknown>;
        correct_answer: Record<string, unknown> | null;
        solution_text: string | null;
        marks: number;
        passages: unknown[];
        selected: string | number[] | Record<string, number> | null;
        is_correct: boolean;
        marks_earned: number;
    }

    let totalMarks = 0;
    let marksObtained = 0;
    let correctCount = 0;

    const gradedQuestions: GradedQuestion[] = questionsRaw.map((q) => {
        const selected = answers[q.id] ?? null;
        const { isCorrect, marksEarned } = gradeAnswer(
            q.question_type,
            q.marks,
            selected,
            q.correct_answer,
        );

        totalMarks += q.marks;
        marksObtained += marksEarned;
        if (isCorrect) correctCount++;

        return {
            question_id: q.id,
            code: q.code,
            question_type: q.question_type,
            difficulty: q.difficulty,
            content: q.content,
            correct_answer: q.correct_answer,
            solution_text: q.solution_text,
            marks: q.marks,
            passages: q.passage_ids
                .map((pid: string) => passagesMap[pid])
                .filter(Boolean),
            selected,
            is_correct: isCorrect,
            marks_earned: marksEarned,
        };
    });

    const percentage =
        totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;

    // Difficulty breakdown
    const breakdown: Record<
        string,
        { total: number; correct: number; percentage: number }
    > = {};
    for (const level of ["easy", "medium", "hard"]) {
        const levelQs = gradedQuestions.filter(
            (gq) => gq.difficulty === level,
        );
        const levelCorrect = levelQs.filter((gq) => gq.is_correct).length;
        breakdown[level] = {
            total: levelQs.length,
            correct: levelCorrect,
            percentage:
                levelQs.length > 0
                    ? Math.round((levelCorrect / levelQs.length) * 100)
                    : 0,
        };
    }

    return NextResponse.json({
        test_name: test.name,
        total_questions: gradedQuestions.length,
        answered: Object.keys(answers).length,
        correct: correctCount,
        marks_obtained: marksObtained,
        total_marks: totalMarks,
        percentage,
        score_breakdown: breakdown,
        questions: gradedQuestions,
    });
}

// ── Grading helper (mirrors test.service logic) ─────────────

function gradeAnswer(
    questionType: string,
    marks: number,
    selected: string | number[] | Record<string, number> | null,
    correctAnswer: Record<string, unknown> | null,
): { isCorrect: boolean; marksEarned: number } {
    if (selected === null || selected === undefined || !correctAnswer) {
        return { isCorrect: false, marksEarned: 0 };
    }

    switch (questionType) {
        case "mcq":
        case "passage_mcq":
        case "poem_mcq": {
            const isCorrect =
                String(selected).trim().toUpperCase() ===
                String(correctAnswer.label).trim().toUpperCase();
            return { isCorrect, marksEarned: isCorrect ? marks : 0 };
        }
        case "fill_blank_dropdown": {
            const correctArr = correctAnswer.answers as number[];
            const selectedArr = selected as number[];
            if (!Array.isArray(selectedArr))
                return { isCorrect: false, marksEarned: 0 };
            const isCorrect =
                selectedArr.length === correctArr.length &&
                selectedArr.every((v, i) => v === correctArr[i]);
            const perBlank = marks / correctArr.length;
            const correctCount = selectedArr.filter(
                (v, i) => v === correctArr[i],
            ).length;
            return {
                isCorrect,
                marksEarned:
                    Math.round(correctCount * perBlank * 100) / 100,
            };
        }
        case "fill_missing_sentence": {
            const correctMap = correctAnswer.mapping as Record<string, number>;
            const selectedMap = selected as Record<string, number>;
            if (typeof selectedMap !== "object")
                return { isCorrect: false, marksEarned: 0 };
            const isCorrect = Object.entries(correctMap).every(
                ([k, v]) => selectedMap[k] === v,
            );
            return { isCorrect, marksEarned: isCorrect ? marks : 0 };
        }
        case "essay":
            // Essays can't be graded automatically in custom tests
            return { isCorrect: false, marksEarned: 0 };
        default:
            return { isCorrect: false, marksEarned: 0 };
    }
}
