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
    Minus,
    ClipboardList,
} from "lucide-react";
import { TEST_CONFIG } from "@/lib/config/test-rules";
import { MathText } from "@/components/ui/math-text";
import { ImageEnhancedText } from "@/components/ui/image-enhanced-text";
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
    topic: string | null;
    subtopic: string | null;
    content: Record<string, unknown>;
    correct_answer: Record<string, unknown> | null;
    solution_text: string | null;
    solution_images: string[];
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
    const [reviewIndex, setReviewIndex] = useState<number | null>(null);
    const [showSolution, setShowSolution] = useState(false);

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
        onAutoSubmit: () => handleAutoSubmit(),
        onWarning: (message) => setWarningMessage(message),
    });

    // ── Load test data ─────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(
                    `/api/custom-tests/${encodeURIComponent(slug)}`,
                );
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
            setError(err instanceof Error ? err.message : "Failed to submit");
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
        if (passages.length === 0 || !currentQuestion?.passages?.length)
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
        const {
            percentage,
            marks_obtained,
            total_marks,
            correct,
            total_questions,
        } = gradedResult;
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
        const incorrect = total_questions - correct;

        const circumference = 2 * Math.PI * 54;
        const strokeOffset = circumference - (percentage / 100) * circumference;
        const progressColor =
            percentage >= 75
                ? "#22c55e"
                : percentage >= 50
                  ? "#f59e0b"
                  : "#ef4444";

        const getHeadline = (pct: number) => {
            if (pct >= 90) return "Outstanding performance.";
            if (pct >= 75) return "Strong result overall.";
            if (pct >= 60) return "Solid effort, room to grow.";
            if (pct >= 40) return "Accuracy needs improvement.";
            return "Keep practicing consistently.";
        };

        const getSubtext = (pct: number) => {
            if (pct >= 90)
                return "You demonstrated excellent command across all difficulty levels.";
            if (pct >= 75)
                return "A few tricky questions slipped through. Review the solutions to close the gaps.";
            if (pct >= 60)
                return "You have a good foundation. Focus on medium and hard level questions next.";
            if (pct >= 40)
                return "Spend more time on fundamentals before attempting harder questions.";
            return "Consider reviewing the concepts first, then re-attempt a practice test.";
        };

        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 font-[family-name:var(--font-inter)]">
                {/* Thin top accent */}
                <div className="h-1 bg-[#1a2744]" />

                <div className="w-full max-w-5xl mx-auto px-6 md:px-10 py-10 md:py-14">
                    {/* Hero section */}
                    <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-6">
                            {testName} — Test Complete
                        </p>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-12">
                            {/* Left: Score + headline */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-4 mb-3">
                                    <span className="text-6xl md:text-7xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                                        {Math.round(percentage)}
                                        <span className="text-3xl md:text-4xl font-bold text-slate-400">
                                            %
                                        </span>
                                    </span>
                                </div>
                                <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-2">
                                    {getHeadline(percentage)}
                                </h1>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                                    {getSubtext(percentage)}
                                </p>
                            </div>

                            {/* Right: Progress ring */}
                            <div className="shrink-0 self-center md:self-auto">
                                <div className="relative w-36 h-36 md:w-40 md:h-40">
                                    <svg
                                        className="w-full h-full -rotate-90"
                                        viewBox="0 0 120 120"
                                    >
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r="54"
                                            fill="none"
                                            stroke="#e2e8f0"
                                            strokeWidth="7"
                                        />
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r="54"
                                            fill="none"
                                            stroke={progressColor}
                                            strokeWidth="7"
                                            strokeLinecap="round"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={strokeOffset}
                                            className="transition-[stroke-dashoffset] duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-sm font-medium text-slate-500">
                                            {correct}/{total_questions}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            correct
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-200 my-10" />

                    {/* Stats cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <BarChart3 className="h-5 w-5 text-slate-400 mb-3" />
                            <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                {marks_obtained}
                                <span className="text-base font-normal text-slate-400">
                                    /{total_marks}
                                </span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Total Marks
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <CheckCircle className="h-5 w-5 text-slate-400 mb-3" />
                            <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                {correct}
                                <span className="text-base font-normal text-slate-400">
                                    {" "}
                                    correct
                                </span>
                                <span className="text-sm font-normal text-slate-300 ml-1">
                                    / {incorrect} wrong
                                </span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Out of {total_questions} questions
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <Clock className="h-5 w-5 text-slate-400 mb-3" />
                            <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                {mins}
                                <span className="text-base font-normal text-slate-400">
                                    m{" "}
                                </span>
                                {String(secs).padStart(2, "0")}
                                <span className="text-base font-normal text-slate-400">
                                    s
                                </span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Time Taken
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-10 flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => router.push(backUrl)}
                            className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                        >
                            <BackIcon className="h-4 w-4 mr-2" />
                            {backLabel}
                        </Button>
                        <Button
                            onClick={() => {
                                setReviewIndex(null);
                                setPhase("review");
                            }}
                            className="w-full sm:w-auto bg-[#1a2744] hover:bg-[#1a2744]/90 shadow-sm px-8"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Review Solutions
                        </Button>
                        {resultCta && (
                            <Button
                                variant="outline"
                                onClick={() => router.push(resultCta.href)}
                                className="w-full sm:w-auto text-sky-600 border-sky-200 hover:bg-sky-50"
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

        const unattempted = rCount - Object.keys(answers).length;
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
                case "fill_blank_dropdown":
                case "fill_missing_sentence":
                    return <FileText className="h-4 w-4 text-slate-400" />;
                default:
                    return <FileText className="h-4 w-4 text-slate-400" />;
            }
        };

        const getQuestionTitleForRow = (gq: GradedQuestion) => {
            if (gq.passages?.[0]?.title) return `${gq.passages[0].title}`;
            const c = gq.content;
            if (typeof c.question === "string") {
                const q = c.question as string;
                return q.length > 60 ? q.substring(0, 60) + "..." : q;
            }
            if (typeof c.prompt === "string") {
                const p = c.prompt as string;
                return p.length > 60 ? p.substring(0, 60) + "..." : p;
            }
            return "Question";
        };

        const openItem =
            reviewIndex !== null &&
            reviewIndex >= 0 &&
            reviewIndex < rQuestions.length
                ? rQuestions[reviewIndex]
                : null;
        const openHasPassage = !!(
            openItem?.passages && openItem.passages.length > 0
        );

        return (
            <div className="min-h-screen bg-slate-50">
                {/* Thin accent bar */}
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

                    {/* ── HERO SUMMARY ── */}
                    <section className="py-8 md:py-10">
                        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-6">
                            {testName} — Review
                        </p>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="min-w-0">
                                <div className="flex items-baseline gap-3 mb-2">
                                    <span className="text-6xl md:text-7xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                                        {Math.round(rPct)}
                                        <span className="text-3xl font-bold text-slate-400">
                                            %
                                        </span>
                                    </span>
                                </div>
                                <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-1.5">
                                    {getHeadline(rPct)}
                                </h1>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                                    {getSubtext(rPct, rCorrect, rCount)}
                                </p>
                            </div>
                        </div>

                        {/* Stat row */}
                        <div className="mt-8 flex flex-wrap gap-8">
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">
                                    Correct
                                </p>
                                <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                    {rCorrect}
                                    <span className="text-slate-400 font-normal">
                                        /{rCount}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">
                                    Marks
                                </p>
                                <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                    {rMarks}
                                    <span className="text-slate-400 font-normal">
                                        /{rTotal}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">
                                    Time
                                </p>
                                <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                    {formatTime(timeSpentR)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">
                                    Unattempted
                                </p>
                                <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                    {unattempted}
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-slate-200" />

                    {/* ── DIFFICULTY BREAKDOWN ── */}
                    <section className="py-10">
                        <h2 className="text-lg font-medium text-slate-800 mb-6 flex items-center gap-2">
                            <BarChart3 className="h-4.5 w-4.5 text-slate-400" />
                            Performance by Difficulty
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {(["easy", "medium", "hard"] as const).map(
                                (level) => {
                                    const data = rBreakdown[level] || {
                                        total: 0,
                                        correct: 0,
                                        percentage: 0,
                                    };
                                    return (
                                        <div key={level}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700 capitalize">
                                                    {level}
                                                </span>
                                                <span className="text-sm text-slate-500 tabular-nums">
                                                    {data.correct}/{data.total}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all duration-500 ${barColor(data.percentage)}`}
                                                    style={{
                                                        width: `${data.total > 0 ? data.percentage : 0}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1.5 tabular-nums">
                                                {Math.round(data.percentage)}%
                                                correct
                                            </p>
                                        </div>
                                    );
                                },
                            )}
                        </div>
                    </section>

                    <div className="h-px bg-slate-200" />

                    {/* ── QUESTION NAVIGATOR GRID ── */}
                    <section className="py-10">
                        <h2 className="text-lg font-medium text-slate-800 mb-2">
                            Question Review
                        </h2>
                        <p className="text-sm text-slate-500 mb-6">
                            Click any question to view it in the test
                            environment.
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {rQuestions.map((gq, idx) => (
                                <button
                                    key={gq.question_id}
                                    onClick={() => {
                                        setReviewIndex(idx);
                                        setShowSolution(false);
                                    }}
                                    className={cn(
                                        "w-10 h-10 rounded-lg text-sm font-semibold transition-all relative",
                                        "flex items-center justify-center cursor-pointer",
                                        "hover:scale-110 hover:shadow-md",
                                        gq.selected === null
                                            ? "bg-slate-200 text-slate-500"
                                            : gq.is_correct
                                              ? "bg-emerald-500 text-white"
                                              : "bg-rose-400 text-white",
                                    )}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-5 mt-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                                <span className="text-xs text-slate-500">
                                    Correct ({rCorrect})
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-rose-400" />
                                <span className="text-xs text-slate-500">
                                    Incorrect ({incorrect})
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-slate-200" />
                                <span className="text-xs text-slate-500">
                                    Unattempted ({unattempted})
                                </span>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-slate-200" />

                    {/* ── DETAILED RESULTS TABLE ── */}
                    <section className="py-10">
                        <div className="flex items-center gap-2 mb-2">
                            <ClipboardList className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-medium text-slate-800">
                                Detailed Results
                            </h2>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">
                            Click a question to view your response in detail.
                        </p>

                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-[60px_80px_1fr_100px] bg-slate-50 border-b border-slate-200 px-4 py-3">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    #
                                </span>
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Type
                                </span>
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Question
                                </span>
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                                    Result
                                </span>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-slate-100">
                                {rQuestions.map((gq, idx) => (
                                    <button
                                        key={`row-${gq.question_id}`}
                                        onClick={() => {
                                            setReviewIndex(idx);
                                            setShowSolution(false);
                                        }}
                                        className="w-full grid grid-cols-[60px_80px_1fr_100px] px-4 py-3 hover:bg-slate-50 transition-colors text-left items-center"
                                    >
                                        <span className="text-sm font-medium text-sky-600">
                                            {idx + 1}
                                        </span>
                                        <span className="flex items-center">
                                            {getTypeIcon(gq.question_type)}
                                        </span>
                                        <span className="text-sm text-sky-600 hover:text-sky-700 hover:underline truncate pr-4 cursor-pointer">
                                            {getQuestionTitleForRow(gq)}
                                        </span>
                                        <span className="flex justify-center">
                                            {gq.selected === null ? (
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                    <Minus className="h-4 w-4 text-slate-400" />
                                                </div>
                                            ) : gq.is_correct ? (
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                                                    <XCircle className="h-4 w-4 text-rose-500" />
                                                </div>
                                            )}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="pb-14 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => router.push(backUrl)}
                            className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        >
                            <BackIcon className="h-4 w-4 mr-2" />
                            {backLabel}
                        </Button>
                        {resultCta && (
                            <Button
                                variant="outline"
                                onClick={() => router.push(resultCta.href)}
                                className="w-full sm:w-auto text-sky-600 border-sky-200 hover:bg-sky-50"
                            >
                                {resultCta.label}
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── FULLSCREEN REVIEW OVERLAY ── */}
                {openItem && reviewIndex !== null && (
                    <div className="fixed inset-0 z-50 flex flex-col bg-[#e8eef3]">
                        {/* Header bar (matches test env) */}
                        <header className="bg-[#1a2744] text-white px-4 py-2.5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <h3 className="text-sm font-semibold hidden md:block">
                                    {testName} — Review
                                </h3>
                                <Badge
                                    variant="outline"
                                    className="border-white/30 text-white text-xs"
                                >
                                    Q {reviewIndex + 1} / {rQuestions.length}
                                </Badge>
                            </div>

                            <div className="flex items-center gap-3">
                                <Badge
                                    className={cn(
                                        "text-xs font-medium",
                                        openItem.selected === null
                                            ? "bg-slate-500/40 text-white"
                                            : openItem.is_correct
                                              ? "bg-emerald-500/90 text-white"
                                              : "bg-rose-400/90 text-white",
                                    )}
                                >
                                    {openItem.selected === null
                                        ? "Unattempted"
                                        : openItem.is_correct
                                          ? "Correct"
                                          : "Incorrect"}
                                </Badge>
                                <span className="text-xs text-white/60 tabular-nums">
                                    {openItem.marks_earned}/{openItem.marks} mk
                                </span>
                            </div>

                            <button
                                onClick={() => setReviewIndex(null)}
                                className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
                            >
                                <XCircle className="h-4 w-4" />
                                Close
                            </button>
                        </header>

                        {/* Split panel content */}
                        <div className="flex-1 flex overflow-y-scroll">
                            {/* Left: passage(s) */}
                            {openHasPassage && openItem.passages && (
                                <div className="w-1/2 border-r bg-white flex flex-col">
                                    {openItem.passages.length === 1 ? (
                                        <>
                                            <div className="border-b px-4 py-2.5 shrink-0 bg-gray-50">
                                                <span className="text-sm font-medium text-[#1a2744]">
                                                    {openItem.passages[0]
                                                        .passage_type === "poem"
                                                        ? "Poem"
                                                        : openItem.passages[0]
                                                              .title ||
                                                          "Extract"}
                                                </span>
                                            </div>
                                            <ScrollArea className="flex-1">
                                                <div className="p-6 md:p-8">
                                                    {openItem.passages[0]
                                                        .title && (
                                                        <h3 className="text-lg font-semibold text-[#1a2744] mb-4">
                                                            {
                                                                openItem
                                                                    .passages[0]
                                                                    .title
                                                            }
                                                        </h3>
                                                    )}
                                                    {openItem.passages[0]
                                                        .image_url && (
                                                        <div className="mb-4">
                                                            <img
                                                                src={
                                                                    openItem
                                                                        .passages[0]
                                                                        .image_url
                                                                }
                                                                alt={
                                                                    openItem
                                                                        .passages[0]
                                                                        .title ||
                                                                    "Passage image"
                                                                }
                                                                className="max-w-full rounded-lg"
                                                            />
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`leading-relaxed text-gray-800 ${
                                                            openItem.passages[0]
                                                                .passage_type ===
                                                            "poem"
                                                                ? "whitespace-pre-line italic"
                                                                : ""
                                                        }`}
                                                    >
                                                        {
                                                            openItem.passages[0]
                                                                .content
                                                        }
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
                                                    {openItem.passages.map(
                                                        (p, idx) => (
                                                            <TabsTrigger
                                                                key={p.id}
                                                                value={`passage-${idx}`}
                                                                className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#1a2744] data-[state=active]:bg-white px-4 py-2 text-sm"
                                                            >
                                                                {p.passage_type ===
                                                                "poem"
                                                                    ? `Poem ${idx + 1}`
                                                                    : p.title ||
                                                                      `Extract ${idx + 1}`}
                                                            </TabsTrigger>
                                                        ),
                                                    )}
                                                </TabsList>
                                            </div>
                                            {openItem.passages.map((p, idx) => (
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
                                                                        src={
                                                                            p.image_url
                                                                        }
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

                            {/* Right: question + answers */}
                            <div
                                className={`${openHasPassage ? "w-1/2" : "w-full"} flex flex-col bg-white`}
                            >
                                <ScrollArea className="flex-1 overflow-y-auto">
                                    <ReviewQuestionDisplay
                                        question={openItem}
                                        questionNumber={reviewIndex + 1}
                                        showSolution={showSolution}
                                        onToggleSolution={() =>
                                            setShowSolution(!showSolution)
                                        }
                                    />
                                </ScrollArea>
                            </div>
                        </div>

                        {/* Bottom nav bar (matches test env) */}
                        <footer className="border-t bg-white px-4 py-3 flex items-center justify-between shrink-0">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setReviewIndex(
                                        Math.max(0, reviewIndex - 1),
                                    );
                                    setShowSolution(false);
                                }}
                                disabled={reviewIndex === 0}
                                className="gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>

                            {/* Mini question grid */}
                            <div className="hidden md:flex flex-wrap px-10 items-center gap-1.5">
                                {rQuestions.map((gq, idx) => (
                                    <button
                                        key={`nav-${gq.question_id}`}
                                        onClick={() => {
                                            setReviewIndex(idx);
                                            setShowSolution(false);
                                        }}
                                        className={cn(
                                            "w-7 h-7 rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer",
                                            reviewIndex === idx
                                                ? "ring-2 ring-[#1a2744] ring-offset-1 scale-110"
                                                : "hover:scale-105",
                                            gq.selected === null
                                                ? "bg-slate-200 text-slate-500"
                                                : gq.is_correct
                                                  ? "bg-emerald-500 text-white"
                                                  : "bg-rose-400 text-white",
                                        )}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>

                            {/* Mobile counter */}
                            <span className="md:hidden text-xs text-slate-400 tabular-nums">
                                {reviewIndex + 1} of {rQuestions.length}
                            </span>

                            <Button
                                onClick={() => {
                                    setReviewIndex(
                                        Math.min(
                                            rQuestions.length - 1,
                                            reviewIndex + 1,
                                        ),
                                    );
                                    setShowSolution(false);
                                }}
                                disabled={reviewIndex === rQuestions.length - 1}
                                className="gap-2 bg-[#1a2744] hover:bg-[#1a2744]/90"
                            >
                                Next
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </footer>
                    </div>
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

// ── Review Question Display ── split layout matching student review ──

function ReviewQuestionDisplay({
    question,
    questionNumber,
    showSolution,
    onToggleSolution,
}: {
    question: GradedQuestion;
    questionNumber: number;
    showSolution: boolean;
    onToggleSolution: () => void;
}) {
    const content = question.content as Record<string, unknown>;
    const correctAnswer = question.correct_answer as Record<
        string,
        unknown
    > | null;
    const wasAttempted = question.selected !== null;

    const questionBadge = (
        <div className="mb-6">
            <div className="flex items-center gap-3">
            <span className="bg-[#1a2744] text-white text-sm font-bold px-3 py-1 rounded-lg">
                Q{questionNumber}
            </span>
            <Badge variant="outline" className="text-xs">
                {question.marks === 1 ? "1 mark" : `${question.marks} marks`}
            </Badge>
            </div>
            {(question.topic || question.subtopic) && (
                <p className="mt-2 text-xs text-slate-500">
                    {question.topic && question.subtopic
                        ? `Topic: ${question.topic} | Subtopic: ${question.subtopic}`
                        : question.topic
                          ? `Topic: ${question.topic}`
                          : `Subtopic: ${question.subtopic}`}
                </p>
            )}
        </div>
    );

    const hasSolution = question.solution_text || (question.solution_images && question.solution_images.length > 0);

    const solutionBlock = hasSolution ? (
        <div className="mt-6 pt-6 border-t border-gray-100">
            <button
                onClick={onToggleSolution}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1a2744] hover:text-[#1a2744]/80 transition-colors"
            >
                <Lightbulb className="h-4 w-4" />
                {showSolution ? "Hide Solution" : "Show Solution"}
            </button>
            {showSolution && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                    {question.solution_text && (
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                            <MathText content={question.solution_text} block />
                        </div>
                    )}
                    {question.solution_images && question.solution_images.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                                Solution {question.solution_text ? "Diagram" : ""}
                            </p>
                            <div
                                className={`grid gap-3 ${question.solution_images.length > 1 ? "grid-cols-1 sm:grid-cols-2" : ""}`}
                            >
                                {question.solution_images.map((imgUrl, idx) => (
                                    <img
                                        key={`solution-img-${idx}`}
                                        src={imgUrl}
                                        alt={`Solution image ${idx + 1}`}
                                        className="max-w-full rounded-lg border border-amber-300"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    ) : null;

    switch (question.question_type) {
        case "mcq":
        case "passage_mcq":
        case "poem_mcq": {
            const questionText = content.question as string;
            const questionImagesRaw = content.question_images as
                | string[]
                | undefined;
            const questionImages =
                questionImagesRaw && questionImagesRaw.length > 0
                    ? questionImagesRaw
                    : content.question_image
                      ? [content.question_image as string]
                      : content.question_image_url
                        ? [content.question_image_url as string]
                        : [];
            const options = content.options as Array<{
                label: string;
                text?: string;
                image_url?: string;
            }>;
            const correctLabel =
                (correctAnswer as { label: string })?.label?.toUpperCase() ??
                "";
            const studentLabel =
                (question.selected as string)?.toUpperCase() ?? "";

            return (
                <div className="grid grid-cols-2 gap-0 min-h-0">
                    {/* Left: Question stem + solution */}
                    <div className="p-6 md:p-8 border-r border-gray-200">
                        {questionBadge}
                        <div className="text-base leading-relaxed text-slate-800 whitespace-pre-line">
                            <ImageEnhancedText content={questionText} block />
                        </div>
                        {questionImages.length > 0 && (
                            <div
                                className={`mt-4 grid gap-3 ${questionImages.length > 1 ? "grid-cols-1 sm:grid-cols-2" : ""}`}
                            >
                                {questionImages.map((imgUrl, idx) => (
                                    <img
                                        key={`question-img-${idx}`}
                                        src={imgUrl}
                                        alt={`Question image ${idx + 1}`}
                                        className="max-w-full rounded-lg border"
                                    />
                                ))}
                            </div>
                        )}
                        {!wasAttempted && (
                            <p className="text-xs text-slate-400 italic flex items-center gap-1.5 mt-4">
                                <Minus className="h-3.5 w-3.5" />
                                Not attempted
                            </p>
                        )}
                        {solutionBlock}
                    </div>

                    {/* Right: Options with correct/wrong highlights */}
                    <div className="p-6 md:p-8">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                            Answer Options
                        </p>
                        <div className="space-y-3">
                            {options.map((option, index) => {
                                const optionLabel = option.label.toUpperCase();
                                const isCorrect = optionLabel === correctLabel;
                                const isSelected = optionLabel === studentLabel;
                                const isWrong = isSelected && !isCorrect;

                                return (
                                    <div
                                        key={`mcq-opt-${index}`}
                                        className={cn(
                                            "w-full flex items-start gap-3 p-4 rounded-lg border-2 text-left",
                                            isCorrect
                                                ? "border-emerald-500 bg-emerald-50/80 shadow-sm"
                                                : isWrong
                                                  ? "border-rose-400 bg-rose-50/60"
                                                  : "border-gray-200 bg-white",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                                                isCorrect
                                                    ? "bg-emerald-500 text-white"
                                                    : isWrong
                                                      ? "bg-rose-400 text-white"
                                                      : "bg-gray-100 text-gray-600",
                                            )}
                                        >
                                            {optionLabel}
                                        </span>
                                        <div className="flex-1 pt-1">
                                            {option.text && (
                                                <span
                                                    className={cn(
                                                        "text-sm leading-relaxed",
                                                        isCorrect || isSelected
                                                            ? "text-gray-900 font-medium"
                                                            : "text-gray-700",
                                                    )}
                                                >
                                                    <ImageEnhancedText content={option.text} />
                                                </span>
                                            )}
                                            {option.image_url && (
                                                <img
                                                    src={option.image_url}
                                                    alt={`Option ${optionLabel}`}
                                                    className="max-w-xs rounded mt-2"
                                                />
                                            )}
                                        </div>
                                        {isCorrect && (
                                            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-1" />
                                        )}
                                        {isWrong && (
                                            <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-1" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        case "fill_blank_dropdown": {
            const passageText = content.passage_text as string;
            const blanks = content.blanks as Array<{
                correct: string;
                options: string[];
                correct_index: number;
            }>;
            const studentAnswers = (question.selected as number[]) || [];
            const correctAnswers =
                (correctAnswer as { answers?: number[] })?.answers ||
                blanks.map((b) =>
                    b.options.findIndex((opt) => opt === b.correct),
                );
            const parts = passageText.split(/___+|\[\d+\]|\{blank\}/gi);

            return (
                <div className="grid grid-cols-2 gap-0 min-h-0">
                    {/* Left: Passage with inline student answers + solution */}
                    <div className="p-6 md:p-8 border-r border-gray-200">
                        {questionBadge}
                        <div className="text-base leading-relaxed text-slate-800">
                            {parts.map((part, index) => (
                                <span key={`fb-part-${index}`}>
                                    <ImageEnhancedText content={part} />
                                    {index < blanks.length &&
                                        (() => {
                                            const isCorrectBlank =
                                                studentAnswers[index] ===
                                                correctAnswers[index];
                                            const studentOption =
                                                blanks[index]?.options[
                                                    studentAnswers[index]
                                                ];

                                            return (
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 rounded-md text-sm font-medium border",
                                                        isCorrectBlank
                                                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                                            : "bg-rose-50 border-rose-300 text-rose-700",
                                                    )}
                                                >
                                                    <ImageEnhancedText
                                                        content={
                                                            studentOption ||
                                                            "Skipped"
                                                        }
                                                    />
                                                    {isCorrectBlank ? (
                                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                                    ) : (
                                                        <XCircle className="h-3.5 w-3.5 text-rose-400" />
                                                    )}
                                                </span>
                                            );
                                        })()}
                                </span>
                            ))}
                        </div>
                        {solutionBlock}
                    </div>

                    {/* Right: Correct answers */}
                    <div className="p-6 md:p-8">
                        <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200">
                            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2.5">
                                Correct Answers
                            </p>
                            <div className="space-y-1.5">
                                {blanks.map((blank, idx) => {
                                    const isCorrectBlank =
                                        studentAnswers[idx] ===
                                        correctAnswers[idx];
                                    const correctOpt =
                                        blank.options[correctAnswers[idx]];

                                    return (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <span className="text-xs font-medium text-emerald-600 w-16 shrink-0">
                                                Blank {idx + 1}
                                            </span>
                                            <span className="text-emerald-700 font-medium">
                                                <ImageEnhancedText
                                                    content={correctOpt ?? "—"}
                                                />
                                            </span>
                                            {isCorrectBlank && (
                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        case "fill_missing_sentence": {
            const passageWithGaps = content.passage_with_gaps as string;
            const sentences = content.sentences as string[];
            const studentMapping =
                (question.selected as Record<string, number>) || {};
            const correctMapping = (
                correctAnswer as { mapping: Record<string, number> }
            ).mapping;

            const gapPattern = /\{(GAP_\d+)\}/g;
            const textParts: Array<{ type: "text" | "gap"; value: string }> =
                [];
            let lastIdx = 0;
            let match;

            while ((match = gapPattern.exec(passageWithGaps)) !== null) {
                if (match.index > lastIdx) {
                    textParts.push({
                        type: "text",
                        value: passageWithGaps.slice(lastIdx, match.index),
                    });
                }
                textParts.push({ type: "gap", value: match[1] });
                lastIdx = match.index + match[0].length;
            }
            if (lastIdx < passageWithGaps.length) {
                textParts.push({
                    type: "text",
                    value: passageWithGaps.slice(lastIdx),
                });
            }

            return (
                <div className="grid grid-cols-2 gap-0 min-h-0">
                    {/* Left: Passage with gap results + solution */}
                    <div className="p-6 md:p-8 border-r border-gray-200">
                        {questionBadge}
                        <div className="text-base leading-relaxed text-slate-800">
                            {textParts.map((part, i) => {
                                if (part.type === "text") {
                                    return (
                                        <span key={`fms-text-${i}`}>
                                            <ImageEnhancedText
                                                content={part.value}
                                            />
                                        </span>
                                    );
                                }
                                const studentIdx = studentMapping[part.value];
                                const correctIdx = correctMapping?.[part.value];
                                const isCorrectGap = studentIdx === correctIdx;
                                const selectedSentence =
                                    studentIdx !== undefined
                                        ? sentences[studentIdx]
                                        : null;

                                return (
                                    <span
                                        key={`fms-gap-${i}`}
                                        className={cn(
                                            "inline-block mx-1 px-3 py-1 rounded-md text-sm font-medium border",
                                            isCorrectGap
                                                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                                : "bg-rose-50 border-rose-300 text-rose-700",
                                        )}
                                    >
                                        <ImageEnhancedText
                                            content={selectedSentence || "Empty"}
                                        />
                                        {isCorrectGap ? (
                                            <CheckCircle className="inline h-3.5 w-3.5 ml-1 text-emerald-500" />
                                        ) : (
                                            <XCircle className="inline h-3.5 w-3.5 ml-1 text-rose-400" />
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                        {solutionBlock}
                    </div>

                    {/* Right: Correct placement */}
                    <div className="p-6 md:p-8">
                        <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200">
                            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2.5">
                                Correct Placement
                            </p>
                            <div className="space-y-1.5">
                                {Object.entries(correctMapping || {}).map(
                                    ([gapKey, sentenceIdx]) => (
                                        <div
                                            key={gapKey}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <span className="text-xs font-medium text-emerald-600 w-16 shrink-0 pt-0.5">
                                                {gapKey.replace("_", " ")}
                                            </span>
                                            <span className="text-emerald-700">
                                                <ImageEnhancedText
                                                    content={
                                                        sentences[
                                                            sentenceIdx as number
                                                        ]
                                                    }
                                                />
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        default:
            return (
                <div className="p-6 md:p-8">
                    {questionBadge}
                    <p className="text-sm text-slate-400">
                        Review not available for this question type.
                    </p>
                </div>
            );
    }
}
