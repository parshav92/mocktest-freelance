"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    ArrowRight,
    Flag,
    Clock,
    Eye,
    EyeOff,
    Loader2,
    Send,
    FileText,
    ArrowLeft as BackIcon,
    CheckCircle,
    XCircle,
    Lightbulb,
    BarChart3,
    ListChecks,
    BookOpen,
    PenLine,
} from "lucide-react";
import { TEST_CONFIG } from "@/lib/config/test-rules";
import { InstructionPages } from "@/components/test/instruction-pages";
import { QuestionRenderer } from "@/components/test/question-renderers";
import {
    ProgressSummary,
    PreSubmitSummary,
} from "@/components/test/progress-summary";
import {
    StartConfirmation,
    AntiCheatWarning,
} from "@/components/test/confirmation-modal";
import { useTimer } from "@/hooks/use-timer";
import { useAntiCheat } from "@/hooks/use-anti-cheat";
import type { QuestionForTest, Passage, InstructionPage } from "@/types/test";

// ── Types ──────────────────────────────────────────────

export interface CustomTestData {
    test: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        visibility: string;
        duration_mins: number;
        instructions: { title: string; content: string }[] | null;
    };
    questions: QuestionForTest[];
}

type Phase =
    | "loading"
    | "instructions"
    | "confirmation"
    | "enter-fullscreen"
    | "testing"
    | "pre-submit"
    | "submitting"
    | "result"
    | "review";

interface GradedResult {
    test_name: string;
    total_questions: number;
    answered: number;
    correct: number;
    marks_obtained: number;
    total_marks: number;
    percentage: number;
    score_breakdown: Record<
        string,
        { total: number; correct: number; percentage: number }
    >;
    questions: GradedQuestion[];
}

interface GradedQuestion {
    question_id: string;
    code: string;
    question_type: string;
    difficulty: string;
    content: Record<string, unknown>;
    correct_answer: Record<string, unknown> | null;
    solution_text: string | null;
    marks: number;
    passages: Passage[];
    selected: string | number[] | Record<string, number> | null;
    is_correct: boolean;
    marks_earned: number;
}

interface CustomTestRunnerProps {
    /** The slug used to fetch and submit */
    slug: string;
    /** Where to go after "Back" on result page */
    backUrl: string;
    /** Label for back button */
    backLabel: string;
    /** Optional CTA on result page (e.g. "Get Full Access") */
    resultCta?: { label: string; href: string };
}

// ── Component ──────────────────────────────────────────

export function CustomTestRunner({
    slug,
    backUrl,
    backLabel,
    resultCta,
}: CustomTestRunnerProps) {
    const router = useRouter();

    // ── State ──────────────────────────────────────────
    const [phase, setPhase] = useState<Phase>("loading");
    const [error, setError] = useState<string | null>(null);

    // Test data (fetched from API)
    const [testData, setTestData] = useState<CustomTestData | null>(null);

    // Question state
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<
        Record<string, string | number[] | Record<string, number>>
    >({});
    const [flaggedSet, setFlaggedSet] = useState<Set<string>>(new Set());
    const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());
    const [startedAt, setStartedAt] = useState<string | null>(null);
    const [endedAt, setEndedAt] = useState<string | null>(null);

    // Result
    const [gradedResult, setGradedResult] = useState<GradedResult | null>(null);
    const [reviewIndex, setReviewIndex] = useState(-1);

    // Warning
    const [warningMessage, setWarningMessage] = useState<string | null>(null);

    // ── Derived ────────────────────────────────────────
    const questions: QuestionForTest[] = testData?.questions ?? [];
    const questionsOrder = questions.map((q) => q.id);
    const currentQuestion = questions[currentIndex] ?? null;
    const currentAnswer = currentQuestion
        ? (answers[currentQuestion.id] ?? null)
        : null;
    const answeredSet = useMemo(() => new Set(Object.keys(answers)), [answers]);
    const testName = testData?.test.name ?? "";
    const durationMins = testData?.test.duration_mins ?? 0;

    // ── Timer ──────────────────────────────────────────
    const timer = useTimer({
        durationMins,
        startedAt,
        isRunning: phase === "testing",
        onTimeout: () => handleAutoSubmit(),
    });

    // ── Anti-cheat ─────────────────────────────────────
    const antiCheat = useAntiCheat({
        enabled: phase === "testing",
        onAutoSubmit: () =>
            handleAutoSubmit(),
        onWarning: (message) => setWarningMessage(message),
    });

    // ── Load test data ─────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/custom-tests/${encodeURIComponent(slug)}`);
                const text = await res.text();
                if (!text) {
                    throw new Error("Empty response from server");
                }

                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    throw new Error("Invalid response from server");
                }

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load test");
                }

                setTestData(data);
                setPhase("instructions");
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to load test",
                );
            }
        })();
    }, [slug]);

    // ── Mark visited ───────────────────────────────────
    useEffect(() => {
        if (phase === "testing" && currentQuestion) {
            setVisitedSet((prev) => {
                const next = new Set(prev);
                next.add(currentQuestion.id);
                return next;
            });
        }
    }, [currentIndex, currentQuestion, phase]);

    // ── Handlers ───────────────────────────────────────

    const handleAnswer = useCallback(
        (value: string | number[] | Record<string, number>) => {
            if (!currentQuestion) return;
            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
        },
        [currentQuestion],
    );

    const handleNavigate = useCallback(
        (direction: "prev" | "next") => {
            if (direction === "next") {
                if (currentIndex < questions.length - 1) {
                    setCurrentIndex((i) => i + 1);
                } else if (TEST_CONFIG.submit.showPreSubmitSummary) {
                    setPhase("pre-submit");
                }
            } else {
                if (
                    currentIndex > 0 &&
                    TEST_CONFIG.navigation.allowBackNavigation
                ) {
                    setCurrentIndex((i) => i - 1);
                }
            }
        },
        [currentIndex, questions.length],
    );

    const handleJumpTo = useCallback((index: number) => {
        if (TEST_CONFIG.navigation.allowQuestionJump) {
            setCurrentIndex(index);
        }
    }, []);

    const handleToggleFlag = useCallback(() => {
        if (!currentQuestion || !TEST_CONFIG.flag.enabled) return;
        setFlaggedSet((prev) => {
            const next = new Set(prev);
            if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
            else next.add(currentQuestion.id);
            return next;
        });
    }, [currentQuestion]);

    const handleInstructionsComplete = () => {
        if (TEST_CONFIG.instructions.requireStartConfirmation) {
            setPhase("confirmation");
        } else {
            handleStart();
        }
    };

    const handleStart = async () => {
        // Enter fullscreen if configured
        if (TEST_CONFIG.antiCheat.requireFullscreen) {
            await antiCheat.enterFullscreen();
        }
        setStartedAt(new Date().toISOString());
        setPhase("testing");
    };

    const handleWarningDismiss = async () => {
        setWarningMessage(null);
        if (TEST_CONFIG.antiCheat.requireFullscreen) {
            await antiCheat.enterFullscreen();
        }
    };

    // ── Submit ─────────────────────────────────────────
    const handleSubmit = useCallback(async () => {
        setPhase("submitting");
        setEndedAt(new Date().toISOString());

        try {
            const res = await fetch(
                `/api/custom-tests/${encodeURIComponent(slug)}/submit`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ answers }),
                },
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Submit failed");

            setGradedResult(data);
            antiCheat.exitFullscreen();
            setPhase("result");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to submit",
            );
            setPhase("testing");
        }
    }, [slug, answers, antiCheat]);

    const handleAutoSubmit = useCallback(() => {
        handleSubmit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleSubmit]);

    // ── Passage data ───────────────────────────────────
    const passages = useMemo((): Passage[] => {
        if (!currentQuestion) return [];
        if (
            currentQuestion.question_type === "passage_mcq" ||
            currentQuestion.question_type === "poem_mcq"
        ) {
            return currentQuestion.passages || [];
        }
        return [];
    }, [currentQuestion]);

    const passageGroup = useMemo((): {
        start: number;
        end: number;
    } | null => {
        if (
            passages.length === 0 ||
            !currentQuestion?.passages?.length
        )
            return null;
        const primaryPassageId = currentQuestion.passages[0].id;
        let start = currentIndex;
        let end = currentIndex;
        while (
            start > 0 &&
            questions[start - 1]?.passages?.[0]?.id === primaryPassageId
        )
            start--;
        while (
            end < questions.length - 1 &&
            questions[end + 1]?.passages?.[0]?.id === primaryPassageId
        )
            end++;
        return { start, end };
    }, [passages, currentQuestion?.passages, currentIndex, questions]);

    // ══════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════

    // LOADING / ERROR
    if (phase === "loading") {
        if (error) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#e8eef3]">
                    <div className="bg-white p-8 rounded-xl shadow-sm border max-w-md text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button
                            onClick={() => router.push(backUrl)}
                            className="bg-[#1a2744]"
                        >
                            {backLabel}
                        </Button>
                    </div>
                </div>
            );
        }
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#e8eef3]">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a2744]" />
            </div>
        );
    }

    // INSTRUCTIONS
    if (phase === "instructions" && testData) {
        const instrPages: InstructionPage[] | null =
            testData.test.instructions && testData.test.instructions.length > 0
                ? testData.test.instructions
                : null;

        return (
            <InstructionPages
                subjectName={testName}
                subjectInstructions={instrPages}
                onComplete={handleInstructionsComplete}
            />
        );
    }

    // CONFIRMATION
    if (phase === "confirmation" && testData) {
        const instrPages: InstructionPage[] | null =
            testData.test.instructions && testData.test.instructions.length > 0
                ? testData.test.instructions
                : null;

        return (
            <>
                <InstructionPages
                    subjectName={testName}
                    subjectInstructions={instrPages}
                    onComplete={() => {}}
                />
                <StartConfirmation
                    open={true}
                    onConfirm={handleStart}
                    onCancel={() => setPhase("instructions")}
                    loading={false}
                />
            </>
        );
    }

    // ENTER FULLSCREEN (for resumption — not used here but kept for consistency)
    if (phase === "enter-fullscreen") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a2744]">
                <div className="text-center max-w-sm mx-auto p-8">
                    <h2 className="text-white text-xl font-semibold mb-3">
                        Ready to Begin
                    </h2>
                    <p className="text-white/50 text-sm mb-8">
                        Click below to start your test
                    </p>
                    <Button
                        onClick={handleStart}
                        className="bg-white text-[#1a2744] hover:bg-white/90 font-semibold text-base px-10 py-3 h-auto"
                    >
                        Start Test
                    </Button>
                </div>
            </div>
        );
    }

    // PRE-SUBMIT
    if (phase === "pre-submit") {
        return (
            <PreSubmitSummary
                totalQuestions={questions.length}
                answeredSet={answeredSet}
                flaggedSet={flaggedSet}
                questionsOrder={questionsOrder}
                onGoBack={() => setPhase("testing")}
                onSubmit={handleSubmit}
                isSubmitting={false}
            />
        );
    }

    // SUBMITTING
    if (phase === "submitting") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8eef3] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-[#1a2744]" />
                <p className="text-gray-600 font-medium">
                    Submitting your test...
                </p>
            </div>
        );
    }

    // ── RESULT ─────────────────────────────────────────
    if (phase === "result" && gradedResult) {
        const { percentage, marks_obtained, total_marks, correct, total_questions } =
            gradedResult;
        const timeSpent =
            startedAt && endedAt
                ? Math.round(
                      (new Date(endedAt).getTime() -
                          new Date(startedAt).getTime()) /
                          1000,
                  )
                : 0;
        const mins = Math.floor(timeSpent / 60);
        const secs = timeSpent % 60;

        const getHeadline = (pct: number) => {
            if (pct >= 90) return "Outstanding performance!";
            if (pct >= 75) return "Strong result overall.";
            if (pct >= 60) return "Solid effort, room to grow.";
            if (pct >= 40) return "Keep practising.";
            return "Don't worry — practice makes perfect.";
        };

        return (
            <div className="min-h-screen bg-[#e8eef3] flex items-center justify-center p-6">
                <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-lg w-full text-center">
                    {/* Score ring */}
                    <div className="mb-6">
                        <div className="relative w-28 h-28 mx-auto mb-4">
                            <svg
                                className="w-28 h-28 -rotate-90"
                                viewBox="0 0 36 36"
                            >
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#e2e8f0"
                                    strokeWidth="2.5"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={
                                        percentage >= 70
                                            ? "#10b981"
                                            : percentage >= 50
                                              ? "#f59e0b"
                                              : "#ef4444"
                                    }
                                    strokeWidth="2.5"
                                    strokeDasharray={`${percentage}, 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-3xl font-bold text-[#1a2744]">
                                    {percentage}%
                                </span>
                            </div>
                        </div>
                        <p className="text-slate-600 font-medium">
                            {getHeadline(percentage)}
                        </p>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-px bg-slate-200 rounded-lg overflow-hidden mb-6">
                        <div className="bg-slate-50 p-3">
                            <p className="text-lg font-bold text-[#1a2744] tabular-nums">
                                {marks_obtained}/{total_marks}
                            </p>
                            <p className="text-[11px] text-slate-400">Marks</p>
                        </div>
                        <div className="bg-slate-50 p-3">
                            <p className="text-lg font-bold text-emerald-600 tabular-nums">
                                {correct}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Correct
                            </p>
                        </div>
                        <div className="bg-slate-50 p-3">
                            <p className="text-lg font-bold text-red-500 tabular-nums">
                                {total_questions - correct}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Incorrect
                            </p>
                        </div>
                        <div className="bg-slate-50 p-3">
                            <p className="text-lg font-bold text-[#1a2744] tabular-nums">
                                {mins}:{String(secs).padStart(2, "0")}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Time Taken
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={() => {
                                setReviewIndex(-1);
                                setPhase("review");
                            }}
                            variant="outline"
                            className="w-full"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Review Solutions
                        </Button>
                        <Button
                            onClick={() => router.push(backUrl)}
                            className="bg-[#1a2744] hover:bg-[#1a2744]/90 w-full"
                        >
                            <BackIcon className="h-4 w-4 mr-2" />
                            {backLabel}
                        </Button>
                        {resultCta && (
                            <Button
                                variant="outline"
                                onClick={() => router.push(resultCta.href)}
                                className="w-full text-sky-600 border-sky-200 hover:bg-sky-50"
                            >
                                {resultCta.label}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── REVIEW ─────────────────────────────────────────
    if (phase === "review" && gradedResult) {
        const {
            percentage: rPct,
            marks_obtained: rMarks,
            total_marks: rTotal,
            correct: rCorrect,
            total_questions: rCount,
            score_breakdown: rBreakdown,
            questions: rQuestions,
        } = gradedResult;

        const timeSpentR =
            startedAt && endedAt
                ? Math.round(
                      (new Date(endedAt).getTime() -
                          new Date(startedAt).getTime()) /
                          1000,
                  )
                : 0;
        const formatTime = (s: number) =>
            `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;

        const getHeadline = (pct: number) => {
            if (pct >= 90) return "Outstanding performance.";
            if (pct >= 75) return "Strong result overall.";
            if (pct >= 60) return "Solid effort, room to grow.";
            if (pct >= 40) return "Accuracy needs improvement.";
            return "Keep practicing consistently.";
        };

        const getSubtext = (pct: number, c: number, t: number) => {
            if (pct >= 90)
                return `You answered ${c} out of ${t} correctly. Excellent command across all levels.`;
            if (pct >= 75)
                return `${c} of ${t} correct. A few tricky ones slipped through — review them below.`;
            if (pct >= 60)
                return `${c} of ${t} correct. Good foundation — focus on the gaps highlighted below.`;
            if (pct >= 40)
                return `${c} of ${t} correct. Spend time reviewing incorrect answers to improve.`;
            return `${c} of ${t} correct. Review each solution carefully before your next attempt.`;
        };

        const unattempted =
            rCount - Object.keys(answers).length;
        const incorrect = rCount - rCorrect - unattempted;

        const barColor = (pct: number) =>
            pct >= 75
                ? "bg-emerald-500"
                : pct >= 50
                  ? "bg-amber-400"
                  : "bg-rose-400";

        const getTypeIcon = (type: string) => {
            switch (type) {
                case "mcq":
                    return <ListChecks className="h-4 w-4 text-slate-400" />;
                case "passage_mcq":
                case "poem_mcq":
                    return <BookOpen className="h-4 w-4 text-slate-400" />;
                case "essay":
                    return <PenLine className="h-4 w-4 text-slate-400" />;
                default:
                    return <FileText className="h-4 w-4 text-slate-400" />;
            }
        };

        const showOverlay = reviewIndex >= 0 && reviewIndex < rQuestions.length;
        const openItem = showOverlay ? rQuestions[reviewIndex] : null;

        return (
            <div className="min-h-screen bg-slate-50">
                <div className="h-1 bg-[#1a2744]" />

                <div className="w-full max-w-6xl mx-auto px-6 md:px-10">
                    {/* Nav */}
                    <div className="pt-6 pb-2">
                        <button
                            onClick={() => setPhase("result")}
                            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to Results
                        </button>
                    </div>

                    {/* Hero summary */}
                    <section className="py-8 md:py-10">
                        <p className="text-sm font-medium uppercase tracking-widest text-slate-400 mb-6">
                            {testName} — Review
                        </p>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a2744] tabular-nums leading-none">
                                    {rPct}
                                    <span className="text-3xl md:text-4xl font-bold text-slate-400">
                                        %
                                    </span>
                                </h1>
                                <p className="text-lg font-medium text-slate-600 mt-2">
                                    {getHeadline(rPct)}
                                </p>
                                <p className="text-sm text-slate-400 mt-1 max-w-lg">
                                    {getSubtext(rPct, rCorrect, rCount)}
                                </p>
                            </div>

                            {/* Stat pills */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-sm font-medium">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    {rCorrect} correct
                                </div>
                                <div className="flex items-center gap-1.5 bg-rose-50 text-rose-600 rounded-full px-3 py-1 text-sm font-medium">
                                    <XCircle className="h-3.5 w-3.5" />
                                    {incorrect} incorrect
                                </div>
                                {unattempted > 0 && (
                                    <div className="flex items-center gap-1.5 bg-slate-100 text-slate-500 rounded-full px-3 py-1 text-sm font-medium">
                                        {unattempted} skipped
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 rounded-full px-3 py-1 text-sm font-medium">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatTime(timeSpentR)}
                                </div>
                                <div className="flex items-center gap-1.5 bg-violet-50 text-violet-600 rounded-full px-3 py-1 text-sm font-medium">
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    {rMarks}/{rTotal} marks
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Difficulty breakdown */}
                    <section className="py-6">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                            Difficulty Breakdown
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(["easy", "medium", "hard"] as const).map(
                                (level) => {
                                    const b = rBreakdown[level] || {
                                        total: 0,
                                        correct: 0,
                                        percentage: 0,
                                    };
                                    if (b.total === 0) return null;
                                    const label =
                                        level.charAt(0).toUpperCase() +
                                        level.slice(1);
                                    return (
                                        <div
                                            key={level}
                                            className="bg-white border border-slate-200 rounded-xl p-4"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-slate-700">
                                                    {label}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {b.correct}/{b.total}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full transition-all ${barColor(b.percentage)}`}
                                                    style={{
                                                        width: `${b.percentage}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="text-right text-xs text-slate-400 mt-1">
                                                {b.percentage}%
                                            </p>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </section>

                    {/* Question table */}
                    <section className="py-6 pb-20">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                            All Questions
                        </h2>
                        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                            {rQuestions.map((gq, idx) => {
                                const title = getQuestionTitle(gq);
                                return (
                                    <button
                                        key={gq.question_id}
                                        onClick={() =>
                                            setReviewIndex(idx)
                                        }
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <span className="text-xs font-mono text-slate-400 w-6 text-right shrink-0">
                                            {idx + 1}
                                        </span>
                                        {gq.is_correct ? (
                                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                        ) : gq.selected !== null ? (
                                            <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
                                        )}
                                        {getTypeIcon(gq.question_type)}
                                        <span className="text-sm text-slate-700 truncate flex-1">
                                            {title}
                                        </span>
                                        <span className="text-xs text-slate-400 shrink-0">
                                            {gq.marks_earned}/{gq.marks}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* Question detail overlay */}
                {showOverlay && openItem && (
                    <ReviewOverlay
                        item={openItem}
                        index={reviewIndex}
                        total={rQuestions.length}
                        onClose={() => setReviewIndex(-1)}
                        onPrev={() =>
                            setReviewIndex((i) => Math.max(0, i - 1))
                        }
                        onNext={() =>
                            setReviewIndex((i) =>
                                Math.min(rQuestions.length - 1, i + 1),
                            )
                        }
                    />
                )}
            </div>
        );
    }

    // ══════════════════════════════════════════════════
    // MAIN TESTING PHASE
    // ══════════════════════════════════════════════════
    if (phase !== "testing" || !currentQuestion || !testData) return null;

    const isFlagged = flaggedSet.has(currentQuestion.id);
    const hasPassage = passages.length > 0;
    const questionLayout: "split" | "stacked" =
        !hasPassage &&
        (currentQuestion.question_type === "mcq" ||
            currentQuestion.question_type === "essay")
            ? "split"
            : "stacked";

    return (
        <div className="h-screen flex flex-col bg-[#e8eef3] select-none">
            {/* Anti-cheat warning */}
            <AntiCheatWarning
                open={!!warningMessage}
                message={warningMessage || ""}
                onDismiss={handleWarningDismiss}
            />

            {/* HEADER BAR */}
            <header className="bg-[#1a2744] text-white px-4 py-2.5 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-sm font-semibold hidden md:block">
                        {testName}
                    </h1>
                    <Badge
                        variant="outline"
                        className="border-white/30 text-white text-xs"
                    >
                        Q {currentIndex + 1} / {questions.length}
                    </Badge>
                    {passageGroup && (
                        <span className="text-xs text-white/60">
                            Passage Q{passageGroup.start + 1}-
                            {passageGroup.end + 1}
                        </span>
                    )}
                </div>

                {/* Timer */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={timer.toggleHidden}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title={timer.isHidden ? "Show timer" : "Hide timer"}
                    >
                        {timer.isHidden ? (
                            <EyeOff className="h-4 w-4 text-white/60" />
                        ) : (
                            <Eye className="h-4 w-4 text-white/60" />
                        )}
                    </button>
                    {!timer.isHidden && (
                        <div
                            className={`flex items-center gap-1.5 font-mono text-lg font-bold ${
                                timer.isCritical
                                    ? "text-red-400 animate-pulse"
                                    : timer.isWarning
                                      ? "text-amber-400"
                                      : "text-white"
                            }`}
                        >
                            <Clock className="h-4 w-4" />
                            {timer.formatted}
                        </div>
                    )}
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2">
                    <ProgressSummary
                        totalQuestions={questions.length}
                        currentIndex={currentIndex}
                        answeredSet={answeredSet}
                        visitedSet={visitedSet}
                        flaggedSet={flaggedSet}
                        questionsOrder={questionsOrder}
                        onJumpTo={handleJumpTo}
                    />
                </div>
            </header>

            {/* SPLIT PANEL CONTENT */}
            <div className="flex-1 flex overflow-hidden">
                {/* Passage panel */}
                {hasPassage && (
                    <div className="w-1/2 border-r bg-white flex flex-col overflow-y-auto">
                        {passages.length === 1 ? (
                            <>
                                <div className="border-b px-4 py-2.5 shrink-0 bg-gray-50">
                                    <span className="text-sm font-medium text-[#1a2744]">
                                        {passages[0].passage_type === "poem"
                                            ? "Poem"
                                            : passages[0].title || "Extract"}
                                    </span>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-6 md:p-8">
                                        {passages[0].title && (
                                            <h3 className="text-lg font-semibold text-[#1a2744] mb-4">
                                                {passages[0].title}
                                            </h3>
                                        )}
                                        {passages[0].image_url && (
                                            <div className="mb-4">
                                                <img
                                                    src={passages[0].image_url}
                                                    alt={
                                                        passages[0].title ||
                                                        "Passage image"
                                                    }
                                                    className="max-w-full rounded-lg"
                                                />
                                            </div>
                                        )}
                                        <div
                                            className={`leading-relaxed text-gray-800 ${
                                                passages[0].passage_type ===
                                                "poem"
                                                    ? "whitespace-pre-line italic"
                                                    : ""
                                            }`}
                                        >
                                            {passages[0].content}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </>
                        ) : (
                            <Tabs
                                defaultValue="passage-0"
                                className="flex flex-col h-full"
                            >
                                <div className="border-b px-4 pt-2 shrink-0 bg-gray-50">
                                    <TabsList className="bg-transparent h-auto p-0 gap-0">
                                        {passages.map((p, idx) => (
                                            <TabsTrigger
                                                key={p.id}
                                                value={`passage-${idx}`}
                                                className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#1a2744] data-[state=active]:bg-white px-4 py-2 text-sm"
                                            >
                                                {p.passage_type === "poem"
                                                    ? `Poem ${idx + 1}`
                                                    : p.title ||
                                                      `Extract ${idx + 1}`}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </div>
                                {passages.map((p, idx) => (
                                    <TabsContent
                                        key={p.id}
                                        value={`passage-${idx}`}
                                        className="flex-1 m-0 data-[state=inactive]:hidden"
                                    >
                                        <ScrollArea className="h-full">
                                            <div className="p-6 md:p-8">
                                                {p.title && (
                                                    <h3 className="text-lg font-semibold text-[#1a2744] mb-4">
                                                        {p.title}
                                                    </h3>
                                                )}
                                                {p.image_url && (
                                                    <div className="mb-4">
                                                        <img
                                                            src={p.image_url}
                                                            alt={
                                                                p.title ||
                                                                "Passage image"
                                                            }
                                                            className="max-w-full rounded-lg"
                                                        />
                                                    </div>
                                                )}
                                                <div
                                                    className={`leading-relaxed text-gray-800 ${
                                                        p.passage_type ===
                                                        "poem"
                                                            ? "whitespace-pre-line italic"
                                                            : ""
                                                    }`}
                                                >
                                                    {p.content}
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        )}
                    </div>
                )}

                {/* Question panel */}
                <div
                    className={`${hasPassage ? "w-1/2" : "w-full"} flex flex-col bg-white`}
                >
                    <ScrollArea className="flex-1">
                        <div
                            className={cn(
                                "p-6 md:p-8",
                                questionLayout === "stacked" &&
                                    "max-w-3xl mx-auto",
                            )}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <span className="bg-[#1a2744] text-white text-sm font-bold px-3 py-1 rounded-lg">
                                    Q{currentIndex + 1}
                                </span>
                            </div>

                            <QuestionRenderer
                                question={currentQuestion}
                                answer={currentAnswer}
                                onAnswer={handleAnswer}
                                layout={questionLayout}
                            />
                        </div>
                    </ScrollArea>
                </div>
            </div>

            {/* BOTTOM NAV */}
            <footer className="border-t bg-white px-4 py-3 flex items-center justify-between shrink-0">
                <Button
                    variant="outline"
                    onClick={() => handleNavigate("prev")}
                    disabled={
                        currentIndex === 0 ||
                        !TEST_CONFIG.navigation.allowBackNavigation
                    }
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                <div className="flex items-center gap-3">
                    {TEST_CONFIG.flag.enabled && (
                        <Button
                            variant={isFlagged ? "default" : "outline"}
                            onClick={handleToggleFlag}
                            className={`gap-2 ${
                                isFlagged
                                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                                    : ""
                            }`}
                        >
                            <Flag
                                className={`h-4 w-4 ${isFlagged ? "fill-current" : ""}`}
                            />
                            {isFlagged ? "Flagged" : "Flag"}
                        </Button>
                    )}

                    {currentIndex === questions.length - 1 && (
                        <Button
                            onClick={() => {
                                if (TEST_CONFIG.submit.showPreSubmitSummary) {
                                    setPhase("pre-submit");
                                } else {
                                    handleSubmit();
                                }
                            }}
                            className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <Send className="h-4 w-4" />
                            Submit Test
                        </Button>
                    )}
                </div>

                <Button
                    onClick={() => handleNavigate("next")}
                    disabled={currentIndex === questions.length - 1}
                    className="gap-2 bg-[#1a2744] hover:bg-[#1a2744]/90"
                >
                    Next
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </footer>

            {/* Error toast */}
            {error && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-3 text-white/70 hover:text-white"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Helper for review question titles ──────────────────

function getQuestionTitle(gq: GradedQuestion): string {
    if (gq.passages?.[0]?.title) return gq.passages[0].title;
    const c = gq.content;
    if (typeof c.question === "string") {
        return c.question.length > 60
            ? c.question.substring(0, 60) + "..."
            : c.question;
    }
    if (typeof c.prompt === "string") {
        return c.prompt.length > 60
            ? c.prompt.substring(0, 60) + "..."
            : c.prompt;
    }
    return "Question";
}

// ── Review overlay for individual question ─────────────

function ReviewOverlay({
    item,
    index,
    total,
    onClose,
    onPrev,
    onNext,
}: {
    item: GradedQuestion;
    index: number;
    total: number;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}) {
    const content = item.content as Record<string, unknown>;
    const correctAnswer = item.correct_answer as Record<string, unknown> | null;

    // Get question text
    const questionText =
        typeof content.question === "string"
            ? content.question
            : typeof content.prompt === "string"
              ? content.prompt
              : typeof content.passage_text === "string"
                ? content.passage_text
                : typeof content.passage_with_gaps === "string"
                  ? content.passage_with_gaps
                  : "";

    // Get MCQ options
    const options = Array.isArray(content.options)
        ? (content.options as { label: string; text?: string }[])
        : null;

    const correctLabel = correctAnswer?.label
        ? String(correctAnswer.label).toUpperCase()
        : null;
    const selectedLabel =
        typeof item.selected === "string"
            ? item.selected.toUpperCase()
            : null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <span className="bg-[#1a2744] text-white text-xs font-bold px-2.5 py-1 rounded-md">
                            Q{index + 1}
                        </span>
                        {item.is_correct ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                Correct
                            </Badge>
                        ) : item.selected !== null ? (
                            <Badge className="bg-rose-100 text-rose-700 text-xs">
                                Incorrect
                            </Badge>
                        ) : (
                            <Badge
                                variant="secondary"
                                className="text-xs"
                            >
                                Skipped
                            </Badge>
                        )}
                        <span className="text-xs text-slate-400">
                            {item.marks_earned}/{item.marks} marks
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 text-xl"
                    >
                        ×
                    </button>
                </div>

                {/* Passage */}
                {item.passages?.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50 border-b">
                        <p className="text-xs font-medium text-slate-500 mb-2">
                            {item.passages[0].passage_type === "poem"
                                ? "Poem"
                                : "Passage"}
                        </p>
                        <div
                            className={`text-sm text-slate-600 leading-relaxed max-h-40 overflow-y-auto ${
                                item.passages[0].passage_type === "poem"
                                    ? "whitespace-pre-line italic"
                                    : ""
                            }`}
                        >
                            {item.passages[0].content}
                        </div>
                    </div>
                )}

                {/* Question */}
                <div className="px-6 py-4">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                        {questionText}
                    </p>
                </div>

                {/* Options (MCQ) */}
                {options && (
                    <div className="px-6 pb-4 space-y-2">
                        {options.map((opt) => {
                            const label = opt.label?.toUpperCase();
                            const isCorrectOpt = label === correctLabel;
                            const isSelectedOpt = label === selectedLabel;
                            const isWrong = isSelectedOpt && !isCorrectOpt;

                            return (
                                <div
                                    key={label}
                                    className={cn(
                                        "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm border",
                                        isCorrectOpt
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                            : isWrong
                                              ? "bg-rose-50 border-rose-200 text-rose-700"
                                              : "bg-white border-slate-100 text-slate-600",
                                    )}
                                >
                                    <span className="font-semibold shrink-0">
                                        {label})
                                    </span>
                                    <span className="flex-1">
                                        {opt.text ?? "—"}
                                    </span>
                                    {isCorrectOpt && (
                                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    )}
                                    {isWrong && (
                                        <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Solution */}
                {item.solution_text && (
                    <div className="px-6 pb-4">
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="h-4 w-4 text-amber-600" />
                                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                                    Solution
                                </span>
                            </div>
                            <p className="text-sm text-amber-900 leading-relaxed">
                                {item.solution_text}
                            </p>
                        </div>
                    </div>
                )}

                {/* Nav footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPrev}
                        disabled={index === 0}
                    >
                        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                        Previous
                    </Button>
                    <span className="text-xs text-slate-400">
                        {index + 1} of {total}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onNext}
                        disabled={index === total - 1}
                    >
                        Next
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
