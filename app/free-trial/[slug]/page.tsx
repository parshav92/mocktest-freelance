"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    Minus,
    Lightbulb,
    BarChart3,
    ListChecks,
    BookOpen,
    PenLine,
    ClipboardList,
} from "lucide-react";
import { TEST_CONFIG } from "@/lib/config/test-rules";
import { InstructionPages } from "@/components/test/instruction-pages";
import { QuestionRenderer } from "@/components/test/question-renderers";
import {
    ProgressSummary,
    PreSubmitSummary,
} from "@/components/test/progress-summary";
import { StartConfirmation } from "@/components/test/confirmation-modal";
import { getTrialTest, type TrialQuestion } from "@/lib/config/trial-tests";
import type { Passage, QuestionForTest } from "@/types/test";

// ── Types ──────────────────────────────────────────────

type Phase =
    | "loading"
    | "instructions"
    | "confirmation"
    | "testing"
    | "pre-submit"
    | "submitting"
    | "result"
    | "review";

interface GradedAnswer {
    questionId: string;
    selected: string | number[] | Record<string, number> | null;
    isCorrect: boolean;
    marksEarned: number;
}

// ── Grading helpers (local, matches test.service logic) ──

function gradeAnswer(
    question: TrialQuestion,
    selected: string | number[] | Record<string, number> | null,
): { isCorrect: boolean; marksEarned: number } {
    if (selected === null || selected === undefined) {
        return { isCorrect: false, marksEarned: 0 };
    }

    if (question.question_type === "essay") {
        // Essays can't be graded locally
        return { isCorrect: false, marksEarned: 0 };
    }

    const correct = question.correct_answer as Record<string, unknown>;

    switch (question.question_type) {
        case "mcq":
        case "passage_mcq":
        case "poem_mcq": {
            const isCorrect =
                String(selected).trim().toUpperCase() ===
                String(correct.label).trim().toUpperCase();
            return { isCorrect, marksEarned: isCorrect ? question.marks : 0 };
        }
        case "fill_blank_dropdown": {
            const correctArr = correct.answers as number[];
            const selectedArr = selected as number[];
            if (!Array.isArray(selectedArr)) return { isCorrect: false, marksEarned: 0 };
            const isCorrect =
                selectedArr.length === correctArr.length &&
                selectedArr.every((v, i) => v === correctArr[i]);
            // partial: 1 mark per correct blank
            const perBlank = question.marks / correctArr.length;
            const correctCount = selectedArr.filter(
                (v, i) => v === correctArr[i],
            ).length;
            return {
                isCorrect,
                marksEarned: Math.round(correctCount * perBlank * 100) / 100,
            };
        }
        case "fill_missing_sentence": {
            const correctMap = correct.mapping as Record<string, number>;
            const selectedMap = selected as Record<string, number>;
            if (typeof selectedMap !== "object") return { isCorrect: false, marksEarned: 0 };
            const isCorrect = Object.entries(correctMap).every(
                ([k, v]) => selectedMap[k] === v,
            );
            return { isCorrect, marksEarned: isCorrect ? question.marks : 0 };
        }
        default:
            return { isCorrect: false, marksEarned: 0 };
    }
}

// ── Main Trial Test Page ───────────────────────────────

export default function TrialTestPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;

    const trial = getTrialTest(slug);

    // ── State ──────────────────────────────────────────
    const [phase, setPhase] = useState<Phase>("loading");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<
        Record<string, string | number[] | Record<string, number>>
    >({});
    const [flaggedSet, setFlaggedSet] = useState<Set<string>>(new Set());
    const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());
    const [startedAt, setStartedAt] = useState<string | null>(null);
    const [endedAt, setEndedAt] = useState<string | null>(null);
    const [gradedAnswers, setGradedAnswers] = useState<GradedAnswer[]>([]);
    const [reviewIndex, setReviewIndex] = useState(-1);

    // ── Derived ────────────────────────────────────────
    const questions: TrialQuestion[] = useMemo(
        () => trial?.questions ?? [],
        [trial],
    );
    const questionsOrder = questions.map((q) => q.id);
    const currentQuestion = questions[currentIndex] ?? null;
    const currentAnswer = currentQuestion
        ? (answers[currentQuestion.id] ?? null)
        : null;
    const answeredSet = useMemo(() => new Set(Object.keys(answers)), [answers]);
    const isEssayTest = questions.every((q) => q.question_type === "essay");

    // ── Timer (real implementation) ────────────────────
    const durationMins = trial?.durationMins ?? 0;

    const [remainingSecs, setRemainingSecs] = useState(durationMins * 60);
    const [timerHidden, setTimerHidden] = useState(false);

    useEffect(() => {
        if (phase !== "testing" || !startedAt) return;
        const endTime =
            new Date(startedAt).getTime() + durationMins * 60 * 1000;

        const tick = () => {
            const left = Math.max(
                0,
                Math.round((endTime - Date.now()) / 1000),
            );
            setRemainingSecs(left);
            if (left <= 0) {
                handleAutoSubmit();
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, startedAt, durationMins]);

    const timerMinutes = Math.floor(remainingSecs / 60);
    const timerSeconds = remainingSecs % 60;
    const timerFormatted = `${timerMinutes}:${String(timerSeconds).padStart(2, "0")}`;
    const isWarning =
        remainingSecs <= TEST_CONFIG.timer.warningThresholdSecs &&
        remainingSecs > TEST_CONFIG.timer.criticalThresholdSecs;
    const isCritical =
        remainingSecs <= TEST_CONFIG.timer.criticalThresholdSecs;

    // ── Init ───────────────────────────────────────────
    useEffect(() => {
        if (!trial) return;
        setPhase("instructions");
    }, [trial]);

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
                if (currentIndex > 0) setCurrentIndex((i) => i - 1);
            }
        },
        [currentIndex, questions.length],
    );

    const handleJumpTo = useCallback((index: number) => {
        setCurrentIndex(index);
    }, []);

    const handleToggleFlag = useCallback(() => {
        if (!currentQuestion) return;
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

    const handleStart = () => {
        setStartedAt(new Date().toISOString());
        setPhase("testing");
    };

    const handleSubmit = useCallback(() => {
        setPhase("submitting");
        setEndedAt(new Date().toISOString());

        // Grade all questions locally
        const graded: GradedAnswer[] = questions.map((q) => {
            const selected = answers[q.id] ?? null;
            const { isCorrect, marksEarned } = gradeAnswer(q, selected);
            return { questionId: q.id, selected, isCorrect, marksEarned };
        });
        setGradedAnswers(graded);

        // Short delay to show "submitting" spinner
        setTimeout(() => setPhase("result"), 600);
    }, [questions, answers]);

    const handleAutoSubmit = useCallback(() => {
        // Trigger submit directly
        setPhase("submitting");
        setEndedAt(new Date().toISOString());

        const graded: GradedAnswer[] = questions.map((q) => {
            const selected = answers[q.id] ?? null;
            const { isCorrect, marksEarned } = gradeAnswer(q, selected);
            return { questionId: q.id, selected, isCorrect, marksEarned };
        });
        setGradedAnswers(graded);
        setTimeout(() => setPhase("result"), 600);
    }, [questions, answers]);

    // ── Error state ────────────────────────────────────
    if (!trial) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#e8eef3]">
                <div className="bg-white p-8 rounded-xl border max-w-md text-center">
                    <p className="text-slate-600 mb-4">
                        Trial test not found.
                    </p>
                    <Button
                        onClick={() => router.push("/free-trial")}
                        className="bg-[#1a2744]"
                    >
                        Back to Trial Tests
                    </Button>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════
    // RENDER PHASES
    // ══════════════════════════════════════════════════

    // LOADING
    if (phase === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#e8eef3]">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a2744]" />
            </div>
        );
    }

    // INSTRUCTIONS
    if (phase === "instructions") {
        return (
            <InstructionPages
                subjectName={trial.subjectName}
                subjectInstructions={trial.instructions}
                onComplete={handleInstructionsComplete}
            />
        );
    }

    // CONFIRMATION
    if (phase === "confirmation") {
        return (
            <>
                <InstructionPages
                    subjectName={trial.subjectName}
                    subjectInstructions={trial.instructions}
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

    // PRE-SUBMIT SUMMARY
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

    // RESULT
    if (phase === "result") {
        const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
        const marksObtained = gradedAnswers.reduce(
            (s, a) => s + a.marksEarned,
            0,
        );
        const percentage =
            totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;
        const correct = gradedAnswers.filter((a) => a.isCorrect).length;
        const timeSpent = startedAt && endedAt
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

        if (isEssayTest) {
            // Essay result — simplified
            return (
                <div className="min-h-screen bg-[#e8eef3] flex items-center justify-center p-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                            <Send className="h-7 w-7 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-semibold text-[#1a2744] mb-2">
                            Essay submitted
                        </h2>
                        <p className="text-sm text-slate-500 mb-6">
                            In the full version, essays are evaluated by AI with
                            detailed feedback.
                        </p>
                        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                            <div>
                                <p className="text-2xl font-bold text-[#1a2744]">1</p>
                                <p className="text-sm text-slate-400">Questions</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200" />
                            <div>
                                <p className="text-2xl font-bold text-[#1a2744]">
                                    {mins}:{String(secs).padStart(2, "0")}
                                </p>
                                <p className="text-sm text-slate-400">Time Taken</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={() => router.push("/free-trial")}
                                className="bg-[#1a2744] hover:bg-[#1a2744]/90 w-full"
                            >
                                <BackIcon className="h-4 w-4 mr-2" />
                                Back to Trial Tests
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push("/dashboard/subscribe")}
                                className="w-full"
                            >
                                Get Full Access
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        // Standard result
        return (
            <div className="min-h-screen bg-[#e8eef3] flex items-center justify-center p-6">
                <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-lg w-full text-center">
                    {/* Score */}
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

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-px bg-slate-200 rounded-lg overflow-hidden mb-6">
                        <div className="bg-slate-50 p-3">
                            <p className="text-lg font-bold text-[#1a2744] tabular-nums">
                                {marksObtained}/{totalMarks}
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
                                {questions.length - correct}
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
                            onClick={() => router.push("/free-trial")}
                            className="bg-[#1a2744] hover:bg-[#1a2744]/90 w-full"
                        >
                            <BackIcon className="h-4 w-4 mr-2" />
                            Back to Trial Tests
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push("/dashboard/subscribe")}
                            className="w-full text-sky-600 border-sky-200 hover:bg-sky-50"
                        >
                            Get Full Access
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════
    // REVIEW MODE — matches actual review page layout
    // ══════════════════════════════════════════════════
    if (phase === "review") {
        const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
        const marksObtained = gradedAnswers.reduce(
            (s, a) => s + a.marksEarned,
            0,
        );
        const reviewPercentage =
            totalMarks > 0
                ? Math.round((marksObtained / totalMarks) * 100)
                : 0;
        const correct = gradedAnswers.filter((a) => a.isCorrect).length;
        const incorrect = gradedAnswers.filter(
            (a) => !a.isCorrect && (answers[a.questionId] !== undefined),
        ).length;
        const unattempted = questions.length - Object.keys(answers).length;
        const timeSpentR =
            startedAt && endedAt
                ? Math.round(
                      (new Date(endedAt).getTime() -
                          new Date(startedAt).getTime()) /
                          1000,
                  )
                : 0;
        const formatTimeR = (secs: number) => {
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            return `${m}m ${String(s).padStart(2, "0")}s`;
        };
        const getHeadlineR = (pct: number) => {
            if (pct >= 90) return "Outstanding performance.";
            if (pct >= 75) return "Strong result overall.";
            if (pct >= 60) return "Solid effort, room to grow.";
            if (pct >= 40) return "Accuracy needs improvement.";
            return "Keep practicing consistently.";
        };
        const getSubtextR = (pct: number, c: number, t: number) => {
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

        // Difficulty breakdown
        const diffBreakdown = (["easy", "medium", "hard"] as const).map(
            (level) => {
                const qs = questions.filter((q) => q.difficulty === level);
                const c = qs.filter((q) => {
                    const g = gradedAnswers.find(
                        (a) => a.questionId === q.id,
                    );
                    return g?.isCorrect;
                }).length;
                return {
                    level,
                    total: qs.length,
                    correct: c,
                    percentage: qs.length > 0 ? Math.round((c / qs.length) * 100) : 0,
                };
            },
        );

        const barColor = (pct: number) =>
            pct >= 75
                ? "bg-emerald-500"
                : pct >= 50
                  ? "bg-amber-400"
                  : "bg-rose-400";

        // Helpers for detailed table
        const getQuestionTitle = (q: TrialQuestion) => {
            if (q.passage?.title) return `${q.passage.title}`;
            const c = q.content as unknown as Record<string, unknown>;
            if (c.question) {
                const qt = c.question as string;
                return qt.length > 60 ? qt.substring(0, 60) + "..." : qt;
            }
            if (c.prompt) {
                const p = c.prompt as string;
                return p.length > 60 ? p.substring(0, 60) + "..." : p;
            }
            return `Question`;
        };
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

        // Open question overlay state
        const openItem =
            reviewIndex >= 0 && reviewIndex < questions.length
                ? questions[reviewIndex]
                : null;
        // openGraded computed inside overlay component
        const showOverlay = reviewIndex >= 0 && openItem !== null && reviewIndex < questions.length;

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
                        <p className="text-sm font-medium uppercase tracking-widest text-slate-400 mb-6">
                            {trial.subjectName} — Review
                        </p>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="min-w-0">
                                <div className="flex items-baseline gap-3 mb-2">
                                    <span className="text-6xl md:text-7xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                                        {reviewPercentage}
                                        <span className="text-3xl font-bold text-slate-400">
                                            %
                                        </span>
                                    </span>
                                </div>
                                <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-1.5">
                                    {getHeadlineR(reviewPercentage)}
                                </h1>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                                    {getSubtextR(
                                        reviewPercentage,
                                        correct,
                                        questions.length,
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Stat row */}
                        <div className="mt-8 flex flex-wrap gap-8">
                            <div>
                                <p className="text-sm text-slate-500 mb-0.5">
                                    Correct
                                </p>
                                <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                    {correct}
                                    <span className="text-slate-400 font-normal">
                                        /{questions.length}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-0.5">
                                    Marks
                                </p>
                                <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                    {marksObtained}
                                    <span className="text-slate-400 font-normal">
                                        /{totalMarks}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-0.5">
                                    Time
                                </p>
                                <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                    {formatTimeR(timeSpentR)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-0.5">
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
                    {diffBreakdown.some((d) => d.total > 0) && (
                        <>
                            <section className="py-10">
                                <h2 className="text-lg font-medium text-slate-800 mb-6 flex items-center gap-2">
                                    <BarChart3 className="h-4.5 w-4.5 text-slate-400" />
                                    Performance by Difficulty
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    {diffBreakdown.map((data) => (
                                        <div key={data.level}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700 capitalize">
                                                    {data.level}
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
                                            <p className="text-sm text-slate-400 mt-1.5 tabular-nums">
                                                {data.percentage}% correct
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <div className="h-px bg-slate-200" />
                        </>
                    )}

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
                            {questions.map((q, idx) => {
                                const g = gradedAnswers.find(
                                    (a) => a.questionId === q.id,
                                );
                                const wasAttempted =
                                    answers[q.id] !== undefined;
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setReviewIndex(idx)}
                                        className={cn(
                                            "w-10 h-10 rounded-lg text-sm font-semibold transition-all",
                                            "flex items-center justify-center cursor-pointer",
                                            "hover:scale-110 hover:shadow-md",
                                            !wasAttempted
                                                ? "bg-slate-200 text-slate-500"
                                                : g?.isCorrect
                                                  ? "bg-emerald-500 text-white"
                                                  : "bg-rose-400 text-white",
                                        )}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-5 mt-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                                <span className="text-sm text-slate-500">
                                    Correct ({correct})
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-rose-400" />
                                <span className="text-sm text-slate-500">
                                    Incorrect ({incorrect})
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-slate-200" />
                                <span className="text-sm text-slate-500">
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
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                    #
                                </span>
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                    Type
                                </span>
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                    Question
                                </span>
                                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider text-center">
                                    Result
                                </span>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-slate-100">
                                {questions.map((q, idx) => {
                                    const g = gradedAnswers.find(
                                        (a) => a.questionId === q.id,
                                    );
                                    const wasAttempted =
                                        answers[q.id] !== undefined;
                                    return (
                                        <button
                                            key={q.id}
                                            onClick={() =>
                                                setReviewIndex(idx)
                                            }
                                            className="w-full grid grid-cols-[60px_80px_1fr_100px] px-4 py-3 hover:bg-slate-50 transition-colors text-left items-center"
                                        >
                                            <span className="text-sm font-medium text-sky-600">
                                                {idx + 1}
                                            </span>
                                            <span className="flex items-center">
                                                {getTypeIcon(
                                                    q.question_type,
                                                )}
                                            </span>
                                            <span className="text-sm text-sky-600 hover:text-sky-700 hover:underline truncate pr-4 cursor-pointer">
                                                {getQuestionTitle(q)}
                                            </span>
                                            <span className="flex justify-center">
                                                {!wasAttempted ? (
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                        <Minus className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                ) : g?.isCorrect ? (
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
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* ── ACTIONS ── */}
                    <div className="pb-14 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setPhase("result")}
                            className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Results
                        </Button>
                        <Button
                            onClick={() => router.push("/free-trial")}
                            className="w-full sm:w-auto bg-[#1a2744] hover:bg-[#1a2744]/90 shadow-sm transition-colors"
                        >
                            Try Another Subject
                        </Button>
                    </div>
                </div>

                {/* ── FULLSCREEN REVIEW OVERLAY ── */}
                {showOverlay && openItem && (
                    <TrialReviewOverlay
                        trial={trial}
                        questions={questions}
                        gradedAnswers={gradedAnswers}
                        answers={answers}
                        openIndex={reviewIndex}
                        onChangeIndex={setReviewIndex}
                        onClose={() => setReviewIndex(-1)}
                    />
                )}
            </div>
        );
    }

    // ══════════════════════════════════════════════════
    // MAIN TEST ENVIRONMENT
    // ══════════════════════════════════════════════════
    if (phase !== "testing" || !currentQuestion) return null;

    const isFlagged = flaggedSet.has(currentQuestion.id);
    const passage: Passage | null =
        currentQuestion.question_type === "passage_mcq" ||
        currentQuestion.question_type === "poem_mcq"
            ? currentQuestion.passage ?? null
            : null;
    const hasPassage = !!passage;

    const questionLayout: "split" | "stacked" =
        !hasPassage &&
        (currentQuestion.question_type === "mcq" ||
            currentQuestion.question_type === "essay")
            ? "split"
            : "stacked";

    return (
        <div className="h-screen flex flex-col bg-[#e8eef3] select-none">
            {/* HEADER */}
            <header className="bg-[#1a2744] text-white px-4 py-2.5 flex items-center justify-between z-10 shrink-0">
                {/* Left */}
                <div className="flex items-center gap-4">
                    <h1 className="text-sm font-semibold hidden md:block">
                        {trial.subjectName}
                    </h1>
                    <Badge
                        variant="outline"
                        className="border-white/30 text-white text-sm"
                    >
                        Q {currentIndex + 1} / {questions.length}
                    </Badge>
                    <Badge className="bg-sky-500/20 text-sky-300 text-[10px] border-0">
                        Trial
                    </Badge>
                </div>

                {/* Center: Timer */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setTimerHidden((h) => !h)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                        {timerHidden ? (
                            <EyeOff className="h-4 w-4 text-white/60" />
                        ) : (
                            <Eye className="h-4 w-4 text-white/60" />
                        )}
                    </button>
                    {!timerHidden && (
                        <div
                            className={`flex items-center gap-1.5 font-mono text-lg font-bold ${
                                isCritical
                                    ? "text-red-400 animate-pulse"
                                    : isWarning
                                        ? "text-amber-400"
                                        : "text-white"
                            }`}
                        >
                            <Clock className="h-4 w-4" />
                            {timerFormatted}
                        </div>
                    )}
                </div>

                {/* Right: Progress */}
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
                {hasPassage && passage && (
                    <div className="w-1/2 border-r bg-white flex flex-col overflow-y-auto">
                        <div className="border-b px-4 py-2.5 shrink-0 bg-gray-50">
                            <span className="text-sm font-medium text-[#1a2744]">
                                {passage.passage_type === "poem"
                                    ? "Poem"
                                    : passage.title || "Extract"}
                            </span>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-6 md:p-8">
                                {passage.title && (
                                    <h3 className="text-lg font-semibold text-[#1a2744] mb-4">
                                        {passage.title}
                                    </h3>
                                )}
                                <div
                                    className={`leading-relaxed text-gray-800 ${
                                        passage.passage_type === "poem"
                                            ? "whitespace-pre-line italic"
                                            : ""
                                    }`}
                                    dangerouslySetInnerHTML={{
                                        __html: passage.content,
                                    }}
                                />
                            </div>
                        </ScrollArea>
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
                                question={
                                    currentQuestion as unknown as QuestionForTest
                                }
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
                    disabled={currentIndex === 0}
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
        </div>
    );
}

// ============================================
// FULLSCREEN REVIEW OVERLAY
// Matches actual review page: split-panel per question type
// ============================================

function TrialReviewOverlay({
    trial,
    questions,
    gradedAnswers,
    answers,
    openIndex,
    onChangeIndex,
    onClose,
}: {
    trial: { subjectName: string };
    questions: TrialQuestion[];
    gradedAnswers: GradedAnswer[];
    answers: Record<string, string | number[] | Record<string, number>>;
    openIndex: number;
    onChangeIndex: (idx: number) => void;
    onClose: () => void;
}) {
    const [showSolution, setShowSolution] = useState(false);
    const openItem = questions[openIndex];
    const graded = gradedAnswers.find((a) => a.questionId === openItem.id);
    const wasAttempted = answers[openItem.id] !== undefined;
    const studentAnswer = graded?.selected ?? null;
    const openHasPassage =
        (openItem.question_type === "passage_mcq" ||
            openItem.question_type === "poem_mcq") &&
        !!openItem.passage;
    const passage = openItem.passage;

    // formatTime not needed in overlay - time shown in summary

    const questionBadge = (
        <div className="flex items-center gap-3 mb-6">
            <span className="bg-[#1a2744] text-white text-sm font-bold px-3 py-1 rounded-lg">
                Q{openIndex + 1}
            </span>
            <Badge variant="outline" className="text-sm">
                {openItem.marks === 1
                    ? "1 mark"
                    : `${openItem.marks} marks`}
            </Badge>
        </div>
    );

    const solutionBlock = openItem.solution_text ? (
        <div className="mt-6 pt-6 border-t border-gray-100">
            <button
                onClick={() => setShowSolution(!showSolution)}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1a2744] hover:text-[#1a2744]/80 transition-colors"
            >
                <Lightbulb className="h-4 w-4" />
                {showSolution ? "Hide Solution" : "Show Solution"}
            </button>
            {showSolution && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-slate-700 leading-relaxed">
                        {openItem.solution_text}
                    </p>
                </div>
            )}
        </div>
    ) : null;

    // ── Render question content by type ──
    const renderQuestionContent = () => {
        const content = openItem.content as unknown as Record<string, unknown>;
        const correctAnswer = openItem.correct_answer as Record<
            string,
            unknown
        >;

        switch (openItem.question_type) {
            case "mcq":
            case "passage_mcq":
            case "poem_mcq": {
                const questionText = content.question as string;
                const questionImage = content.question_image as
                    | string
                    | undefined;
                const options = content.options as Array<{
                    label: string;
                    text?: string;
                    image_url?: string;
                }>;
                const correctLabel = (
                    correctAnswer as { label: string }
                ).label.toUpperCase();
                const studentLabel = (
                    studentAnswer as string
                )?.toUpperCase();

                return (
                    <div className="grid grid-cols-2 gap-0 min-h-0">
                        {/* Left: Question stem + solution */}
                        <div className="p-6 md:p-8 border-r border-gray-200">
                            {questionBadge}
                            <p className="text-base leading-relaxed text-slate-800 whitespace-pre-line">
                                {questionText}
                            </p>
                            {questionImage && (
                                <img
                                    src={questionImage}
                                    alt="Question"
                                    className="max-w-full rounded-lg border mt-4"
                                />
                            )}
                            {!wasAttempted && (
                                <p className="text-sm text-slate-400 italic flex items-center gap-1.5 mt-4">
                                    <Minus className="h-3.5 w-3.5" />
                                    Not attempted
                                </p>
                            )}
                            {solutionBlock}
                        </div>

                        {/* Right: Options with highlights */}
                        <div className="p-6 md:p-8">
                            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                                Answer Options
                            </p>
                            <div className="space-y-3">
                                {options.map((option, index) => {
                                    const optionLabel =
                                        option.label.toUpperCase();
                                    const isCorrect =
                                        optionLabel === correctLabel;
                                    const isSelected =
                                        optionLabel === studentLabel;
                                    const isWrong =
                                        isSelected && !isCorrect;

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
                                                            isCorrect ||
                                                                isSelected
                                                                ? "text-gray-900 font-medium"
                                                                : "text-gray-700",
                                                        )}
                                                    >
                                                        {option.text}
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
                const studentAnswers =
                    (studentAnswer as number[]) || [];
                const correctAnswers =
                    (correctAnswer as { answers?: number[] })?.answers ||
                    blanks.map((b) =>
                        b.options.findIndex((opt) => opt === b.correct),
                    );
                const parts = passageText.split(
                    /___+|\[\d+\]|\{blank\}/gi,
                );

                return (
                    <div className="grid grid-cols-2 gap-0 min-h-0">
                        <div className="p-6 md:p-8 border-r border-gray-200">
                            {questionBadge}
                            <div className="text-base leading-relaxed text-slate-800">
                                {parts.map((part, index) => (
                                    <span key={`fb-part-${index}`}>
                                        {part}
                                        {index < blanks.length &&
                                            (() => {
                                                const isCorrectBlank =
                                                    studentAnswers[
                                                        index
                                                    ] ===
                                                    correctAnswers[index];
                                                const studentOption =
                                                    blanks[index]?.options[
                                                        studentAnswers[
                                                            index
                                                        ]
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
                                                        {studentOption ||
                                                            "Skipped"}
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

                        <div className="p-6 md:p-8">
                            <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200">
                                <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-2.5">
                                    Correct Answers
                                </p>
                                <div className="space-y-1.5">
                                    {blanks.map((blank, idx) => {
                                        const isCorrectBlank =
                                            studentAnswers[idx] ===
                                            correctAnswers[idx];
                                        const correctOpt =
                                            blank.options[
                                                correctAnswers[idx]
                                            ];
                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 text-sm"
                                            >
                                                <span className="text-sm font-medium text-emerald-600 w-16 shrink-0">
                                                    Blank {idx + 1}
                                                </span>
                                                <span className="text-emerald-700 font-medium">
                                                    {correctOpt}
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

            case "essay": {
                const prompt = content.prompt as string;
                const wordLimit = content.word_limit as
                    | number
                    | undefined;

                return (
                    <div className="grid grid-cols-2 gap-0 min-h-0">
                        <div className="p-6 md:p-8 border-r border-gray-200">
                            {questionBadge}
                            <p className="text-base leading-relaxed text-slate-800 whitespace-pre-line">
                                {prompt}
                            </p>
                            {wordLimit && (
                                <Badge
                                    variant="outline"
                                    className="text-sm mt-3"
                                >
                                    Word limit: {wordLimit}
                                </Badge>
                            )}
                            {solutionBlock}
                        </div>

                        <div className="p-6 md:p-8 space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    Your Response
                                </p>
                                {studentAnswer ? (
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                        {studentAnswer as string}
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-400">
                                        No response submitted.
                                    </p>
                                )}
                            </div>
                            <p className="text-sm text-slate-400">
                                In the full version, essays are evaluated
                                by AI with detailed rubric feedback.
                            </p>
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
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#e8eef3]">
            {/* ── HEADER BAR ── */}
            <header className="bg-[#1a2744] text-white px-4 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold hidden md:block">
                        {trial.subjectName} — Review
                    </h3>
                    <Badge
                        variant="outline"
                        className="border-white/30 text-white text-sm"
                    >
                        Q {openIndex + 1} / {questions.length}
                    </Badge>
                </div>

                <div className="flex items-center gap-3">
                    <Badge
                        className={cn(
                            "text-sm font-medium",
                            !wasAttempted
                                ? "bg-slate-500/40 text-white"
                                : graded?.isCorrect
                                  ? "bg-emerald-500/90 text-white"
                                  : "bg-rose-400/90 text-white",
                        )}
                    >
                        {!wasAttempted
                            ? "Unattempted"
                            : graded?.isCorrect
                              ? "Correct"
                              : "Incorrect"}
                    </Badge>
                    <span className="text-sm text-white/60 tabular-nums">
                        {graded?.marksEarned ?? 0}/{openItem.marks} mk
                    </span>
                </div>

                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
                >
                    <XCircle className="h-4 w-4" />
                    Close
                </button>
            </header>

            {/* ── SPLIT PANEL CONTENT ── */}
            <div className="flex-1 flex overflow-y-scroll">
                {/* Passage panel */}
                {openHasPassage && passage && (
                    <div className="w-1/2 border-r bg-white flex flex-col">
                        <div className="border-b px-4 py-2.5 shrink-0 bg-gray-50">
                            <span className="text-sm font-medium text-[#1a2744]">
                                {passage.passage_type === "poem"
                                    ? "Poem"
                                    : passage.title || "Extract"}
                            </span>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-6 md:p-8">
                                {passage.title && (
                                    <h3 className="text-lg font-semibold text-[#1a2744] mb-4">
                                        {passage.title}
                                    </h3>
                                )}
                                <div
                                    className={`leading-relaxed text-gray-800 ${
                                        passage.passage_type === "poem"
                                            ? "whitespace-pre-line italic"
                                            : ""
                                    }`}
                                    dangerouslySetInnerHTML={{
                                        __html: passage.content,
                                    }}
                                />
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* Question panel */}
                <div
                    className={`${openHasPassage ? "w-1/2" : "w-full"} flex flex-col bg-white`}
                >
                    <ScrollArea className="flex-1 overflow-y-auto">
                        {renderQuestionContent()}
                    </ScrollArea>
                </div>
            </div>

            {/* ── BOTTOM NAV BAR ── */}
            <footer className="border-t bg-white px-4 py-3 flex items-center justify-between shrink-0">
                <Button
                    variant="outline"
                    onClick={() => {
                        onChangeIndex(Math.max(0, openIndex - 1));
                        setShowSolution(false);
                    }}
                    disabled={openIndex === 0}
                    className="gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                {/* Mini question grid */}
                <div className="hidden md:flex flex-wrap px-10 items-center gap-1.5">
                    {questions.map((item, idx) => {
                        const g = gradedAnswers.find(
                            (a) => a.questionId === item.id,
                        );
                        const attempted = answers[item.id] !== undefined;
                        return (
                            <button
                                key={`nav-${item.id}`}
                                onClick={() => {
                                    onChangeIndex(idx);
                                    setShowSolution(false);
                                }}
                                className={cn(
                                    "w-7 h-7 rounded text-sm font-semibold transition-all flex items-center justify-center cursor-pointer",
                                    openIndex === idx
                                        ? "ring-2 ring-[#1a2744] ring-offset-1 scale-110"
                                        : "hover:scale-105",
                                    !attempted
                                        ? "bg-slate-200 text-slate-500"
                                        : g?.isCorrect
                                          ? "bg-emerald-500 text-white"
                                          : "bg-rose-400 text-white",
                                )}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile counter */}
                <span className="md:hidden text-sm text-slate-400 tabular-nums">
                    {openIndex + 1} of {questions.length}
                </span>

                <Button
                    onClick={() => {
                        onChangeIndex(
                            Math.min(questions.length - 1, openIndex + 1),
                        );
                        setShowSolution(false);
                    }}
                    disabled={openIndex === questions.length - 1}
                    className="gap-2 bg-[#1a2744] hover:bg-[#1a2744]/90"
                >
                    Next
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </footer>
        </div>
    );
}
