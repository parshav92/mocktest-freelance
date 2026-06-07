import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/students/[id]/report
 *
 * Comprehensive student report endpoint returning:
 *  - speed: per-difficulty avg time (student vs peer)
 *  - discipline: full test list with date/time/score + peer avg
 *  - swot: strengths, weaknesses, opportunities, threats
 *  - comparative_grade: A–F rating based on percentile
 *
 * Accessible by the student's parent (ownership check) or admin.
 *
 * Query params:
 *   days   – lookback window (default 90, "all" = no limit)
 *   subjectId – filter by subject UUID (default: all subjects)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: studentId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate UUID
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentId)) {
        return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    }

    // Determine role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role === "parent") {
        // Verify ownership
        const { data: owned } = await supabase
            .from("students")
            .select("id")
            .eq("id", studentId)
            .eq("parent_id", user.id)
            .single();
        if (!owned) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
    } else if (profile.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const rawDays = request.nextUrl.searchParams.get("days");
    let daysClause: string | null = null;
    if (rawDays && rawDays !== "all") {
        const parsed = Number.parseInt(rawDays, 10);
        if (Number.isFinite(parsed) && parsed >= 7 && parsed <= 3650) {
            daysClause = `ended_at.gte.${new Date(Date.now() - parsed * 86400000).toISOString()}`;
        }
    }

    const rawSubjectId = request.nextUrl.searchParams.get("subjectId");
    const subjectId =
        rawSubjectId && rawSubjectId !== "all" && uuidRegex.test(rawSubjectId)
            ? rawSubjectId
            : null;

    // ── 1. Fetch completed tests for this student ────────────────────────────
    let testsQuery = supabase
        .from("tests")
        .select(
            `id, subject_id, status, started_at, ended_at, duration_mins,
             time_spent_secs, total_marks, marks_obtained, percentage,
             score_breakdown, answers, created_at,
             subject:subjects(id, name, slug)`,
        )
        .eq("student_id", studentId)
        .in("status", ["submitted", "ended_early"])
        .order("ended_at", { ascending: false });

    if (subjectId) {
        testsQuery = testsQuery.eq("subject_id", subjectId);
    }

    if (rawDays && rawDays !== "all") {
        const cutoff = new Date(
            Date.now() - Number.parseInt(rawDays, 10) * 86400000,
        ).toISOString();
        testsQuery = testsQuery.gte("ended_at", cutoff);
    }

    const { data: tests, error: testsError } = await testsQuery;

    if (testsError) {
        return NextResponse.json({ error: testsError.message }, { status: 500 });
    }

    const testList = tests ?? [];

    // ── 2. Speed report: per-difficulty avg time (student) ──────────────────
    const difficultyTimeMap: Record<string, { total: number; count: number }> =
        { easy: { total: 0, count: 0 }, medium: { total: 0, count: 0 }, hard: { total: 0, count: 0 } };

    // We need question difficulties. Collect all question IDs from answers.
    const questionIds = new Set<string>();
    for (const test of testList) {
        const answers = (test.answers ?? []) as Array<{
            question_id: string;
            time_spent_secs: number | null;
            is_correct: boolean | null;
        }>;
        for (const a of answers) {
            if (a.question_id) questionIds.add(a.question_id);
        }
    }

    let questionDifficultyMap: Record<string, string> = {};
    let questionTopicMap: Record<string, { topic: string; subtopic: string }> = {};

    if (questionIds.size > 0) {
        const { data: questions } = await supabase
            .from("questions")
            .select("id, difficulty, topic, subtopic")
            .in("id", Array.from(questionIds));

        if (questions) {
            for (const q of questions) {
                questionDifficultyMap[q.id] = q.difficulty;
                questionTopicMap[q.id] = { topic: q.topic ?? "", subtopic: q.subtopic ?? "" };
            }
        }
    }

    // Build per-difficulty time stats for the student
    for (const test of testList) {
        const answers = (test.answers ?? []) as Array<{
            question_id: string;
            time_spent_secs: number | null;
            is_correct: boolean | null;
        }>;
        for (const a of answers) {
            const diff = questionDifficultyMap[a.question_id];
            const t = a.time_spent_secs ?? 0;
            if (diff && difficultyTimeMap[diff]) {
                difficultyTimeMap[diff].total += t;
                difficultyTimeMap[diff].count += 1;
            }
        }
    }

    // ── 3. Peer avg time per difficulty (all students, same question pool) ──
    // Fetch from score_breakdown (aggregate) rather than per-question for scalability
    const { data: peerTests } = await supabase
        .from("tests")
        .select("score_breakdown, time_spent_secs, answers")
        .in("status", ["submitted", "ended_early"])
        .neq("student_id", studentId)
        .limit(200); // cap for performance

    const peerDiffTime: Record<string, { total: number; count: number }> = {
        easy: { total: 0, count: 0 },
        medium: { total: 0, count: 0 },
        hard: { total: 0, count: 0 },
    };

    for (const pt of peerTests ?? []) {
        const pAnswers = (pt.answers ?? []) as Array<{
            question_id: string;
            time_spent_secs: number | null;
        }>;
        for (const a of pAnswers) {
            const diff = questionDifficultyMap[a.question_id];
            const t = a.time_spent_secs ?? 0;
            if (diff && peerDiffTime[diff]) {
                peerDiffTime[diff].total += t;
                peerDiffTime[diff].count += 1;
            }
        }
    }

    const speedReport = (["easy", "medium", "hard"] as const).map((d) => ({
        difficulty: d,
        student_avg_secs:
            difficultyTimeMap[d].count > 0
                ? Math.round(difficultyTimeMap[d].total / difficultyTimeMap[d].count)
                : 0,
        peer_avg_secs:
            peerDiffTime[d].count > 0
                ? Math.round(peerDiffTime[d].total / peerDiffTime[d].count)
                : 0,
        questions_attempted: difficultyTimeMap[d].count,
    }));

    // ── 4. Discipline report: per-test list ─────────────────────────────────
    const disciplineList = testList.map((t) => {
        const subject = Array.isArray(t.subject) ? t.subject[0] : t.subject;
        return {
            id: t.id,
            subject_name: subject?.name ?? "Unknown",
            subject_slug: subject?.slug ?? "",
            started_at: t.started_at,
            ended_at: t.ended_at,
            duration_mins: t.duration_mins,
            time_spent_secs: t.time_spent_secs ?? 0,
            total_marks: t.total_marks ?? 0,
            marks_obtained: t.marks_obtained ?? 0,
            percentage: t.percentage ?? 0,
            status: t.status,
        };
    });

    // Peer average tests per week
    const { count: peerTestCount } = await supabase
        .from("tests")
        .select("id", { count: "exact", head: true })
        .in("status", ["submitted", "ended_early"])
        .neq("student_id", studentId);

    const { count: peerStudentCount } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

    const avgTestsPerStudent =
        peerStudentCount && peerStudentCount > 1 && peerTestCount
            ? Math.round((peerTestCount / (peerStudentCount - 1)) * 10) / 10
            : 0;

    // ── 5. SWOT analysis ────────────────────────────────────────────────────
    // Build topic accuracy from student answers
    const topicAccuracy: Record<
        string,
        { correct: number; total: number; subject: string }
    > = {};

    for (const test of testList) {
        const subject = Array.isArray(test.subject) ? test.subject[0] : test.subject;
        const subjectName = subject?.name ?? "Unknown";
        const answers = (test.answers ?? []) as Array<{
            question_id: string;
            is_correct: boolean | null;
            time_spent_secs: number | null;
        }>;

        for (const a of answers) {
            const tm = questionTopicMap[a.question_id];
            if (!tm || !tm.topic) continue;
            const key = `${tm.topic}||${subjectName}`;
            if (!topicAccuracy[key]) {
                topicAccuracy[key] = { correct: 0, total: 0, subject: subjectName };
            }
            topicAccuracy[key].total += 1;
            if (a.is_correct) topicAccuracy[key].correct += 1;
        }
    }

    // Peer topic accuracy
    const peerTopicAccuracy: Record<string, { correct: number; total: number }> = {};
    for (const pt of peerTests ?? []) {
        const pAnswers = (pt.answers ?? []) as Array<{
            question_id: string;
            is_correct: boolean | null;
        }>;
        for (const a of pAnswers) {
            const tm = questionTopicMap[a.question_id];
            if (!tm || !tm.topic) continue;
            const key = tm.topic;
            if (!peerTopicAccuracy[key]) {
                peerTopicAccuracy[key] = { correct: 0, total: 0 };
            }
            peerTopicAccuracy[key].total += 1;
            if (a.is_correct) peerTopicAccuracy[key].correct += 1;
        }
    }

    const strengths: Array<{ topic: string; subject: string; accuracy: number }> = [];
    const weaknesses: Array<{ topic: string; subject: string; accuracy: number }> = [];
    const opportunities: Array<{ topic: string; subject: string; student_accuracy: number; peer_accuracy: number; advantage: number }> = [];
    const threats: Array<{ topic: string; subject: string; student_accuracy: number; peer_accuracy: number; gap: number }> = [];

    for (const [key, data] of Object.entries(topicAccuracy)) {
        if (data.total < 3) continue; // skip low sample
        const [topic] = key.split("||");
        const acc = Math.round((data.correct / data.total) * 100);
        const peerData = peerTopicAccuracy[topic];
        const peerAcc = peerData && peerData.total >= 3
            ? Math.round((peerData.correct / peerData.total) * 100)
            : null;

        if (acc >= 70) {
            strengths.push({ topic, subject: data.subject, accuracy: acc });
        } else if (acc < 50) {
            weaknesses.push({ topic, subject: data.subject, accuracy: acc });
        }

        if (peerAcc !== null) {
            const diff = acc - peerAcc;
            if (diff > 5) {
                opportunities.push({
                    topic,
                    subject: data.subject,
                    student_accuracy: acc,
                    peer_accuracy: peerAcc,
                    advantage: diff,
                });
            } else if (diff < -5) {
                threats.push({
                    topic,
                    subject: data.subject,
                    student_accuracy: acc,
                    peer_accuracy: peerAcc,
                    gap: Math.abs(diff),
                });
            }
        }
    }

    strengths.sort((a, b) => b.accuracy - a.accuracy);
    weaknesses.sort((a, b) => a.accuracy - b.accuracy);
    opportunities.sort((a, b) => b.advantage - a.advantage);
    threats.sort((a, b) => b.gap - a.gap);

    // ── 6. Comparative grade ────────────────────────────────────────────────
    // Get peer percentile from existing analytics data
    const studentAvg =
        testList.length > 0
            ? testList.reduce((sum, t) => sum + (t.percentage ?? 0), 0) /
              testList.length
            : 0;

    const { data: peerScores } = await supabase
        .from("tests")
        .select("percentage, student_id")
        .in("status", ["submitted", "ended_early"])
        .not("percentage", "is", null)
        .limit(1000);

    // Compute per-student averages for percentile
    const peerStudentAvgs: Record<string, { total: number; count: number }> = {};
    for (const ps of peerScores ?? []) {
        if (ps.student_id === studentId) continue;
        if (!peerStudentAvgs[ps.student_id]) {
            peerStudentAvgs[ps.student_id] = { total: 0, count: 0 };
        }
        peerStudentAvgs[ps.student_id].total += ps.percentage ?? 0;
        peerStudentAvgs[ps.student_id].count += 1;
    }

    const peerAvgList = Object.values(peerStudentAvgs)
        .filter((v) => v.count >= 1)
        .map((v) => v.total / v.count);

    const belowCount = peerAvgList.filter((a) => a < studentAvg).length;
    const percentile =
        peerAvgList.length > 0
            ? Math.round((belowCount / peerAvgList.length) * 100)
            : 50;

    const overallPeerAvg =
        peerAvgList.length > 0
            ? Math.round(
                  peerAvgList.reduce((s, v) => s + v, 0) / peerAvgList.length,
              )
            : 0;

    // A–F grading based on percentile rank
    function gradeFromPercentile(p: number): string {
        if (p >= 85) return "A";
        if (p >= 70) return "B";
        if (p >= 55) return "C";
        if (p >= 40) return "D";
        if (p >= 25) return "E";
        return "F";
    }

    const comparativeGrade = {
        student_avg: Math.round(studentAvg),
        peer_avg: overallPeerAvg,
        percentile_rank: percentile,
        grade: gradeFromPercentile(percentile),
        peer_count: peerAvgList.length,
        delta: Math.round(studentAvg - overallPeerAvg),
    };

    // ── 7. Topic analysis (right / wrong / skipped) per subject ─────────────
    const topicAnalysis: Record<
        string,
        Record<
            string,
            { right: number; wrong: number; total_answered: number; subject: string }
        >
    > = {};

    for (const test of testList) {
        const subject = Array.isArray(test.subject) ? test.subject[0] : test.subject;
        const subjectName = subject?.name ?? "Unknown";
        const answers = (test.answers ?? []) as Array<{
            question_id: string;
            is_correct: boolean | null;
        }>;

        for (const a of answers) {
            const tm = questionTopicMap[a.question_id];
            if (!tm) continue;
            const topic = tm.topic || "General";

            if (!topicAnalysis[subjectName]) topicAnalysis[subjectName] = {};
            if (!topicAnalysis[subjectName][topic]) {
                topicAnalysis[subjectName][topic] = {
                    right: 0,
                    wrong: 0,
                    total_answered: 0,
                    subject: subjectName,
                };
            }
            topicAnalysis[subjectName][topic].total_answered += 1;
            if (a.is_correct === true) {
                topicAnalysis[subjectName][topic].right += 1;
            } else if (a.is_correct === false) {
                topicAnalysis[subjectName][topic].wrong += 1;
            }
        }
    }

    // Flatten topic analysis into a list
    const topicRows: Array<{
        subject: string;
        topic: string;
        right: number;
        wrong: number;
        skipped: number;
        total_answered: number;
        accuracy: number;
    }> = [];

    for (const [subName, topics] of Object.entries(topicAnalysis)) {
        for (const [topicName, data] of Object.entries(topics)) {
            const skipped = 0; // skipped = not in answers array; hard to compute without knowing total q count per topic
            topicRows.push({
                subject: subName,
                topic: topicName,
                right: data.right,
                wrong: data.wrong,
                skipped,
                total_answered: data.total_answered,
                accuracy:
                    data.total_answered > 0
                        ? Math.round((data.right / data.total_answered) * 100)
                        : 0,
            });
        }
    }

    topicRows.sort((a, b) => b.total_answered - a.total_answered);

    return NextResponse.json({
        speed_report: speedReport,
        discipline: {
            tests: disciplineList,
            total_tests: disciplineList.length,
            avg_tests_per_student: avgTestsPerStudent,
        },
        swot: {
            strengths: strengths.slice(0, 10),
            weaknesses: weaknesses.slice(0, 10),
            opportunities: opportunities.slice(0, 10),
            threats: threats.slice(0, 10),
        },
        comparative: comparativeGrade,
        topic_analysis: topicRows,
    });
}
