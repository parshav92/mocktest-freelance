"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    XCircle,
    Loader2,
    AlertTriangle,
    BarChart3,
    Minus,
    Clock,
    Lightbulb,
    FileText,
    ListChecks,
    PenLine,
    BookOpen,
    ClipboardList,
    Sparkles,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { RichTextViewer } from "@/components/ui/rich-text-editor";
import { MathText } from "@/components/ui/math-text";

interface ReviewQuestion {
    question_number: number;
    question: {
        id: string;
        code: string;
        question_type: string;
        difficulty: string;
        content: Record<string, unknown>;
        marks: number;
        correct_answer: Record<string, unknown>;
        solution_text: string | null;
        passages?: Array<{
            id: string;
            title: string;
            content: string;
            image_url?: string;
            passage_type?: string;
        }>;
    };
    student_answer: unknown;
    is_correct: boolean;
    marks_earned: number;
    time_spent_secs: number;
    was_attempted: boolean;
}

interface ReviewData {
    test: {
        id: string;
        status: string;
        started_at: string;
        ended_at: string;
        subject: {
            name: string;
            slug: string;
        };
    };
    questions: ReviewQuestion[];
    summary: {
        total_questions: number;
        attempted: number;
        unattempted: number;
        correct: number;
        incorrect: number;
        marks_obtained: number;
        total_marks: number;
        percentage: number;
        time_spent_secs: number;
        duration_mins: number;
        score_breakdown: {
            easy: { total: number; correct: number; percentage: number };
            medium: { total: number; correct: number; percentage: number };
            hard: { total: number; correct: number; percentage: number };
        };
    };
    is_read_only: boolean;
}

interface EssayEvaluation {
    id: string;
    question_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    rubric_scores: Record<string, number> | null;
    score: number | null;
    max_score: number | null;
    feedback: string | null;
    completed_at: string | null;
}

export default function TestReviewPage() {
    const router = useRouter();
    const params = useParams();
    const testId = params.id as string;

    const [reviewData, setReviewData] = useState<ReviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [showSolution, setShowSolution] = useState(false);
    const [essayEvaluations, setEssayEvaluations] = useState<EssayEvaluation[]>(
        [],
    );
    const [essayPolling, setEssayPolling] = useState(false);

    useEffect(() => {
        fetchReview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId]);

    // Poll for essay evaluation status
    const pollEssayStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/tests/${testId}/essay-status`);
            const data = await res.json();
            if (res.ok && data.evaluations) {
                setEssayEvaluations(data.evaluations);
                // Stop polling when all completed or failed
                if (
                    data.status === "completed" ||
                    data.status === "failed" ||
                    data.status === "no_essays"
                ) {
                    setEssayPolling(false);
                }
            }
        } catch {
            // Silent fail for polling
        }
    }, [testId]);

    useEffect(() => {
        if (!essayPolling) return;
        const interval = setInterval(pollEssayStatus, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [essayPolling, pollEssayStatus]);

    const fetchReview = async () => {
        try {
            const res = await fetch(`/api/tests/${testId}/review`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load review");
            }

            setReviewData(data);

            // If there are essay evaluations, set them and start polling if any are pending
            if (data.essay_evaluations) {
                setEssayEvaluations(data.essay_evaluations);
                const hasPending = data.essay_evaluations.some(
                    (e: EssayEvaluation) =>
                        e.status === "pending" || e.status === "processing",
                );
                if (hasPending) {
                    setEssayPolling(true);
                }
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load review",
            );
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${String(secs).padStart(2, "0")}s`;
    };

    const getHeadline = (pct: number) => {
        if (pct >= 90) return "Outstanding performance.";
        if (pct >= 75) return "Strong result overall.";
        if (pct >= 60) return "Solid effort, room to grow.";
        if (pct >= 40) return "Accuracy needs improvement.";
        return "Keep practicing consistently.";
    };

    const getSubtext = (pct: number, correct: number, total: number) => {
        if (pct >= 90)
            return `You answered ${correct} out of ${total} correctly. Excellent command across all levels.`;
        if (pct >= 75)
            return `${correct} of ${total} correct. A few tricky ones slipped through — review them below.`;
        if (pct >= 60)
            return `${correct} of ${total} correct. Good foundation — focus on the gaps highlighted below.`;
        if (pct >= 40)
            return `${correct} of ${total} correct. Spend time reviewing incorrect answers to improve.`;
        return `${correct} of ${total} correct. Review each solution carefully before your next attempt.`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (error || !reviewData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="max-w-sm text-center">
                    <AlertTriangle className="h-10 w-10 mx-auto text-slate-400 mb-4" />
                    <h2 className="text-lg font-semibold text-slate-800 mb-2">
                        Unable to load review
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">{error}</p>
                    <Button
                        onClick={() => router.push("/dashboard")}
                        className="bg-[#1a2744] hover:bg-[#1a2744]/90"
                    >
                        Back to Tests
                    </Button>
                </div>
            </div>
        );
    }

    const { test, questions, summary } = reviewData;
    const openItem = openIndex !== null ? questions[openIndex] : null;
    const openHasPassage = !!(openItem?.question.passages && openItem.question.passages.length > 0);

    const barColor = (pct: number) =>
        pct >= 75
            ? "bg-emerald-500"
            : pct >= 50
              ? "bg-amber-400"
              : "bg-rose-400";

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Thin accent bar */}
            <div className="h-1 bg-[#1a2744]" />

            <div className="w-full max-w-6xl mx-auto px-6 md:px-10">
                {/* Nav */}
                <div className="pt-6 pb-2">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Tests
                    </button>
                </div>

                {/* ============================================
                    HERO SUMMARY
                ============================================ */}
                <section className="py-8 md:py-10">
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-6">
                        {test.subject.name} — Review
                    </p>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="min-w-0">
                            <div className="flex items-baseline gap-3 mb-2">
                                <span className="text-6xl md:text-7xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                                    {Math.round(summary.percentage)}
                                    <span className="text-3xl font-bold text-slate-400">
                                        %
                                    </span>
                                </span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-semibold text-slate-800 mb-1.5">
                                {getHeadline(summary.percentage)}
                            </h1>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                                {getSubtext(
                                    summary.percentage,
                                    summary.correct,
                                    summary.total_questions,
                                )}
                            </p>
                        </div>

                        <p className="text-xs text-slate-400 shrink-0">
                            {new Date(test.ended_at).toLocaleDateString(
                                "en-AU",
                                {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                },
                            )}
                        </p>
                    </div>

                    {/* Stat row */}
                    <div className="mt-8 flex flex-wrap gap-8">
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">
                                Correct
                            </p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                {summary.correct}
                                <span className="text-slate-400 font-normal">
                                    /{summary.total_questions}
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">
                                Marks
                            </p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                {summary.marks_obtained}
                                <span className="text-slate-400 font-normal">
                                    /{summary.total_marks}
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">
                                Time
                            </p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                {formatTime(summary.time_spent_secs)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">
                                Unattempted
                            </p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                {summary.unattempted}
                            </p>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-slate-200" />

                {/* ============================================
                    DIFFICULTY BREAKDOWN
                ============================================ */}
                <section className="py-10">
                    <h2 className="text-lg font-medium text-slate-800 mb-6 flex items-center gap-2">
                        <BarChart3 className="h-4.5 w-4.5 text-slate-400" />
                        Performance by Difficulty
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {(["easy", "medium", "hard"] as const).map((level) => {
                            const data = summary.score_breakdown[level];
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
                                        {Math.round(data.percentage)}% correct
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="h-px bg-slate-200" />

                {/* ============================================
                    QUESTION NAVIGATOR — GRID
                ============================================ */}
                <section className="py-10">
                    <h2 className="text-lg font-medium text-slate-800 mb-2">
                        Question Review
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Click any question to view it in the test environment.
                    </p>

                    {/* Question grid */}
                    <div className="flex flex-wrap gap-2 ">
                        {questions.map((item, idx) => (
                            <button
                                key={item.question.id}
                                onClick={() => {
                                    setOpenIndex(idx);
                                    setShowSolution(false);
                                }}
                                className={cn(
                                    "w-10 h-10 rounded-lg text-sm font-semibold transition-all relative",
                                    "flex items-center justify-center cursor-pointer",
                                    "hover:scale-110 hover:shadow-md",
                                    !item.was_attempted
                                        ? "bg-slate-200 text-slate-500"
                                        : item.is_correct
                                          ? "bg-emerald-500 text-white"
                                          : "bg-rose-400 text-white",
                                )}
                            >
                                {item.question_number}
                            </button>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-5 mt-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                            <span className="text-xs text-slate-500">
                                Correct ({summary.correct})
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-rose-400" />
                            <span className="text-xs text-slate-500">
                                Incorrect ({summary.incorrect})
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-slate-200" />
                            <span className="text-xs text-slate-500">
                                Unattempted ({summary.unattempted})
                            </span>
                        </div>
                    </div>
                </section>

                <div className="h-px bg-slate-200" />

                {/* ============================================
                    DETAILED RESULTS TABLE
                ============================================ */}
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
                            {questions.map((item, idx) => {
                                const questionType =
                                    item.question.question_type;
                                const content = item.question.content as Record<
                                    string,
                                    unknown
                                >;

                                // Get question title/description
                                const getQuestionTitle = () => {
                                    if (item.question.passages?.[0]?.title) {
                                        return `${item.question.passages[0].title} Q${item.question_number}`;
                                    }
                                    if (content.question) {
                                        const q = content.question as string;
                                        return q.length > 60
                                            ? q.substring(0, 60) + "..."
                                            : q;
                                    }
                                    if (content.prompt) {
                                        const p = content.prompt as string;
                                        return p.length > 60
                                            ? p.substring(0, 60) + "..."
                                            : p;
                                    }
                                    return `Question ${item.question_number}`;
                                };

                                // Get type icon
                                const getTypeIcon = () => {
                                    switch (questionType) {
                                        case "mcq":
                                            return (
                                                <ListChecks className="h-4 w-4 text-slate-400" />
                                            );
                                        case "passage_mcq":
                                        case "poem_mcq":
                                            return (
                                                <BookOpen className="h-4 w-4 text-slate-400" />
                                            );
                                        case "essay":
                                            return (
                                                <PenLine className="h-4 w-4 text-slate-400" />
                                            );
                                        case "fill_blank_dropdown":
                                        case "fill_missing_sentence":
                                            return (
                                                <FileText className="h-4 w-4 text-slate-400" />
                                            );
                                        default:
                                            return (
                                                <FileText className="h-4 w-4 text-slate-400" />
                                            );
                                    }
                                };

                                return (
                                    <button
                                        key={item.question.id}
                                        onClick={() => {
                                            setOpenIndex(idx);
                                            setShowSolution(false);
                                        }}
                                        className="w-full grid grid-cols-[60px_80px_1fr_100px] px-4 py-3 hover:bg-slate-50 transition-colors text-left items-center"
                                    >
                                        <span className="text-sm font-medium text-sky-600">
                                            {item.question_number}
                                        </span>
                                        <span className="flex items-center">
                                            {getTypeIcon()}
                                        </span>
                                        <span className="text-sm text-sky-600 hover:text-sky-700 hover:underline truncate pr-4 cursor-pointer">
                                            {getQuestionTitle()}
                                        </span>
                                        <span className="flex justify-center">
                                            {!item.was_attempted ? (
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                    <Minus className="h-4 w-4 text-slate-400" />
                                                </div>
                                            ) : item.is_correct ? (
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

                {/* ============================================
                    ACTIONS
                ============================================ */}
                <div className="pb-14 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard")}
                        className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Tests
                    </Button>
                    <Button
                        onClick={() => router.push("/dashboard")}
                        className="w-full sm:w-auto bg-[#1a2744] hover:bg-[#1a2744]/90 shadow-sm transition-colors"
                    >
                        Back to Dashboard
                    </Button>
                </div>
            </div>

            {/* ============================================
                FULLSCREEN REVIEW OVERLAY
            ============================================ */}
            {openItem && openIndex !== null && (
                <div className="fixed inset-0 z-50 flex flex-col bg-[#e8eef3]">
                    {/* ── HEADER BAR (matches test env) ── */}
                    <header className="bg-[#1a2744] text-white px-4 py-2.5 flex items-center justify-between shrink-0">
                        {/* Left */}
                        <div className="flex items-center gap-4">
                            <h3 className="text-sm font-semibold hidden md:block">
                                {test.subject.name} — Review
                            </h3>
                            <Badge
                                variant="outline"
                                className="border-white/30 text-white text-xs"
                            >
                                Q {openItem.question_number} /{" "}
                                {questions.length}
                            </Badge>
                        </div>

                        {/* Center status */}
                        <div className="flex items-center gap-3">
                            {openItem.time_spent_secs > 0 && (
                                <div className="flex items-center gap-1.5 text-white/70 text-xs">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatTime(openItem.time_spent_secs)}
                                </div>
                            )}
                            <Badge
                                className={cn(
                                    "text-xs font-medium",
                                    !openItem.was_attempted
                                        ? "bg-slate-500/40 text-white"
                                        : openItem.is_correct
                                          ? "bg-emerald-500/90 text-white"
                                          : "bg-rose-400/90 text-white",
                                )}
                            >
                                {!openItem.was_attempted
                                    ? "Unattempted"
                                    : openItem.is_correct
                                      ? "Correct"
                                      : "Incorrect"}
                            </Badge>
                            <span className="text-xs text-white/60 tabular-nums">
                                {openItem.marks_earned}/
                                {openItem.question.marks} mk
                            </span>
                        </div>

                        {/* Right: close */}
                        <button
                            onClick={() => setOpenIndex(null)}
                            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
                        >
                            <XCircle className="h-4 w-4" />
                            Close
                        </button>
                    </header>

                    {/* ── SPLIT PANEL CONTENT ── */}
                    <div className="flex-1 flex overflow-y-scroll">
                        {/* Left panel: passage(s) */}
                        {openHasPassage && openItem.question.passages && (
                            <div className="w-1/2 border-r bg-white flex flex-col">
                                {openItem.question.passages.length === 1 ? (
                                    /* Single passage - simple header */
                                    <>
                                        <div className="border-b px-4 py-2.5 shrink-0 bg-gray-50">
                                            <span className="text-sm font-medium text-[#1a2744]">
                                                {openItem.question.passages[0].passage_type === "poem"
                                                    ? "Poem"
                                                    : openItem.question.passages[0].title || "Extract"}
                                            </span>
                                        </div>
                                        <ScrollArea className="flex-1">
                                            <div className="p-6 md:p-8">
                                                {openItem.question.passages[0].title && (
                                                    <h3 className="text-lg font-semibold text-[#1a2744] mb-4">
                                                        {openItem.question.passages[0].title}
                                                    </h3>
                                                )}
                                                {openItem.question.passages[0].image_url && (
                                                    <div className="mb-4">
                                                        <img
                                                            src={openItem.question.passages[0].image_url}
                                                            alt={openItem.question.passages[0].title || "Passage image"}
                                                            className="max-w-full rounded-lg"
                                                        />
                                                    </div>
                                                )}
                                                <div
                                                    className={`leading-relaxed text-gray-800 ${
                                                        openItem.question.passages[0].passage_type === "poem"
                                                            ? "whitespace-pre-line italic"
                                                            : ""
                                                    }`}
                                                >
                                                    <MathText content={openItem.question.passages[0].content} block />
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </>
                                ) : (
                                    /* Multiple passages - tabs */
                                    <Tabs defaultValue="passage-0" className="flex flex-col h-full">
                                        <div className="border-b px-4 pt-2 shrink-0 bg-gray-50">
                                            <TabsList className="bg-transparent h-auto p-0 gap-0">
                                                {openItem.question.passages.map((p, idx) => (
                                                    <TabsTrigger
                                                        key={p.id}
                                                        value={`passage-${idx}`}
                                                        className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-[#1a2744] data-[state=active]:bg-white px-4 py-2 text-sm"
                                                    >
                                                        {p.passage_type === "poem"
                                                            ? `Poem ${idx + 1}`
                                                            : p.title || `Extract ${idx + 1}`}
                                                    </TabsTrigger>
                                                ))}
                                            </TabsList>
                                        </div>
                                        {openItem.question.passages.map((p, idx) => (
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
                                                                    alt={p.title || "Passage image"}
                                                                    className="max-w-full rounded-lg"
                                                                />
                                                            </div>
                                                        )}
                                                        <div
                                                            className={`leading-relaxed text-gray-800 ${
                                                                p.passage_type === "poem"
                                                                    ? "whitespace-pre-line italic"
                                                                    : ""
                                                            }`}
                                                        >
                                                            <MathText content={p.content} block />
                                                        </div>
                                                    </div>
                                                </ScrollArea>
                                            </TabsContent>
                                        ))}
                                    </Tabs>
                                )}
                            </div>
                        )}

                        {/* Right panel (or full width): question + answers in split layout */}
                        <div
                            className={`${openHasPassage ? "w-1/2" : "w-full"} flex flex-col bg-white`}
                        >
                            <ScrollArea className="flex-1 overflow-y-auto">
                                <ReviewQuestionDisplay
                                    question={openItem.question}
                                    questionNumber={openItem.question_number}
                                    studentAnswer={openItem.student_answer}
                                    wasAttempted={openItem.was_attempted}
                                    solutionText={
                                        openItem.question.solution_text
                                    }
                                    showSolution={showSolution}
                                    onToggleSolution={() =>
                                        setShowSolution(!showSolution)
                                    }
                                    essayEvaluation={
                                        essayEvaluations.find(
                                            (e) =>
                                                e.question_id ===
                                                openItem.question.id,
                                        ) || null
                                    }
                                />
                            </ScrollArea>
                        </div>
                    </div>

                    {/* ── BOTTOM NAV BAR (matches test env) ── */}
                    <footer className="border-t bg-white px-4 py-3 flex items-center justify-between shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setOpenIndex(Math.max(0, openIndex - 1));
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
                            {questions.map((item, idx) => (
                                <button
                                    key={`nav-${item.question.id}`}
                                    onClick={() => {
                                        setOpenIndex(idx);
                                        setShowSolution(false);
                                    }}
                                    className={cn(
                                        "w-7 h-7 rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer",
                                        openIndex === idx
                                            ? "ring-2 ring-[#1a2744] ring-offset-1 scale-110"
                                            : "hover:scale-105",
                                        !item.was_attempted
                                            ? "bg-slate-200 text-slate-500"
                                            : item.is_correct
                                              ? "bg-emerald-500 text-white"
                                              : "bg-rose-400 text-white",
                                    )}
                                >
                                    {item.question_number}
                                </button>
                            ))}
                        </div>

                        {/* Mobile counter */}
                        <span className="md:hidden text-xs text-slate-400 tabular-nums">
                            {openIndex + 1} of {questions.length}
                        </span>

                        <Button
                            onClick={() => {
                                setOpenIndex(
                                    Math.min(
                                        questions.length - 1,
                                        openIndex + 1,
                                    ),
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
            )}
        </div>
    );
}

// ============================================
// REVIEW QUESTION DISPLAY — split layout:
// Left column: question stem + solution
// Right column: options / answers with highlights
// ============================================
function ReviewQuestionDisplay({
    question,
    questionNumber,
    studentAnswer,
    wasAttempted,
    solutionText,
    showSolution,
    onToggleSolution,
    essayEvaluation,
}: {
    question: ReviewQuestion["question"];
    questionNumber: number;
    studentAnswer: unknown;
    wasAttempted: boolean;
    solutionText: string | null;
    showSolution: boolean;
    onToggleSolution: () => void;
    essayEvaluation?: EssayEvaluation | null;
}) {
    const content = question.content;
    const correctAnswer = question.correct_answer;

    const questionBadge = (
        <div className="flex items-center gap-3 mb-6">
            <span className="bg-[#1a2744] text-white text-sm font-bold px-3 py-1 rounded-lg">
                Q{questionNumber}
            </span>
            <Badge variant="outline" className="text-xs">
                {question.marks === 1 ? "1 mark" : `${question.marks} marks`}
            </Badge>
        </div>
    );

    const solutionBlock = solutionText ? (
        <div className="mt-6 pt-6 border-t border-gray-100">
            <button
                onClick={onToggleSolution}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1a2744] hover:text-[#1a2744]/80 transition-colors"
            >
                <Lightbulb className="h-4 w-4" />
                {showSolution ? "Hide Solution" : "Show Solution"}
            </button>
            {showSolution && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-slate-700 leading-relaxed">
                        {solutionText}
                    </p>
                </div>
            )}
        </div>
    ) : null;

    switch (question.question_type) {
        case "mcq":
        case "passage_mcq":
        case "poem_mcq": {
            const questionText = content.question as string;
            const questionImage = content.question_image as string | undefined;
            const options = content.options as Array<{
                label: string;
                text?: string;
                image_url?: string;
            }>;
            const correctLabel = (
                correctAnswer as { label: string }
            ).label.toUpperCase();
            const studentLabel = (studentAnswer as string)?.toUpperCase();

            return (
                <div className="grid grid-cols-2 gap-0 min-h-0">
                    {/* Left: Question stem + solution */}
                    <div className="p-6 md:p-8 border-r border-gray-200">
                        {questionBadge}
                        <p className="text-base leading-relaxed text-slate-800 whitespace-pre-line">
                            <MathText content={questionText} />
                        </p>
                        {questionImage && (
                            <img
                                src={questionImage}
                                alt="Question"
                                className="max-w-full rounded-lg border mt-4"
                            />
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
                                                    <MathText content={option.text} />
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
            const studentAnswers = (studentAnswer as number[]) || [];
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
                                    <MathText content={part} />
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
                                                    {studentOption ? <MathText content={studentOption} /> : "Skipped"}
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
                                                {correctOpt ? <MathText content={correctOpt} /> : "—"}
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
                (studentAnswer as Record<string, number>) || {};
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
                                            <MathText content={part.value} />
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
                                        {selectedSentence ? <MathText content={selectedSentence} /> : "Empty"}
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
                                                <MathText content={
                                                    sentences[
                                                        sentenceIdx as number
                                                    ]
                                                } />
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

        case "essay": {
            const prompt = content.prompt as string;
            const essayText = studentAnswer as string;
            const wordLimit = content.word_limit as number | undefined;
            const rubric = content.rubric as Record<string, number> | undefined;

            return (
                <div className="grid grid-cols-2 gap-0 min-h-0">
                    {/* Left: Prompt + solution */}
                    <div className="p-6 md:p-8 border-r border-gray-200">
                        {questionBadge}
                        <p className="text-base leading-relaxed text-slate-800 whitespace-pre-line">
                            <MathText content={prompt} />
                        </p>
                        {wordLimit && (
                            <Badge variant="outline" className="text-xs mt-3">
                                Word limit: {wordLimit}
                            </Badge>
                        )}
                        {solutionBlock}
                    </div>

                    {/* Right: Student response + AI evaluation */}
                    <div className="p-6 md:p-8 space-y-4">
                        {/* Student response */}
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Your Response
                            </p>
                            {essayText ? (
                                <RichTextViewer
                                    content={essayText}
                                    className="text-sm text-slate-700"
                                />
                            ) : (
                                <p className="text-sm text-slate-700 leading-relaxed">
                                    No response submitted.
                                </p>
                            )}
                        </div>

                        {/* AI Evaluation */}
                        {essayEvaluation ? (
                            essayEvaluation.status === "completed" ? (
                                <div className="space-y-3">
                                    {/* Score summary */}
                                    <div className="p-4 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-lg border border-violet-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles className="h-4 w-4 text-violet-600" />
                                            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">
                                                AI Evaluation
                                            </p>
                                        </div>

                                        {/* Total score */}
                                        <div className="flex items-baseline gap-2 mb-4">
                                            <span className="text-3xl font-bold text-slate-900">
                                                {essayEvaluation.score}
                                            </span>
                                            <span className="text-sm text-slate-500">
                                                / {essayEvaluation.max_score}
                                            </span>
                                            <Badge
                                                className={cn(
                                                    "ml-2 text-xs",
                                                    essayEvaluation.score! >=
                                                        essayEvaluation.max_score! *
                                                            0.75
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : essayEvaluation.score! >=
                                                            essayEvaluation.max_score! *
                                                                0.5
                                                          ? "bg-amber-100 text-amber-700"
                                                          : "bg-rose-100 text-rose-700",
                                                )}
                                            >
                                                {Math.round(
                                                    (essayEvaluation.score! /
                                                        essayEvaluation.max_score!) *
                                                        100,
                                                )}
                                                %
                                            </Badge>
                                        </div>

                                        {/* Rubric breakdown */}
                                        {essayEvaluation.rubric_scores &&
                                            rubric && (
                                                <div className="space-y-2">
                                                    {Object.entries(
                                                        essayEvaluation.rubric_scores,
                                                    ).map(
                                                        ([category, score]) => {
                                                            const maxPoints =
                                                                rubric[
                                                                    category
                                                                ] || score;
                                                            const pct =
                                                                maxPoints > 0
                                                                    ? (score /
                                                                          maxPoints) *
                                                                      100
                                                                    : 0;
                                                            return (
                                                                <div
                                                                    key={
                                                                        category
                                                                    }
                                                                >
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-xs font-medium text-slate-600 capitalize">
                                                                            {
                                                                                category
                                                                            }
                                                                        </span>
                                                                        <span className="text-xs text-slate-500 tabular-nums">
                                                                            {
                                                                                score
                                                                            }
                                                                            /
                                                                            {
                                                                                maxPoints
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <Progress
                                                                        value={
                                                                            pct
                                                                        }
                                                                        className="h-1.5"
                                                                    />
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}
                                    </div>

                                    {/* Feedback */}
                                    {essayEvaluation.feedback && (
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
                                                Feedback
                                            </p>
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                {essayEvaluation.feedback}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : essayEvaluation.status === "failed" ? (
                                <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                                        <p className="text-sm font-medium text-rose-700">
                                            Evaluation failed
                                        </p>
                                    </div>
                                    <p className="text-xs text-rose-600 mt-1">
                                        AI evaluation encountered an error.
                                        Please contact support.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                                        <div>
                                            <p className="text-sm font-medium text-amber-800">
                                                Evaluation in progress
                                            </p>
                                            <p className="text-xs text-amber-600 mt-0.5">
                                                Your essay is being evaluated by
                                                AI. This may take a moment.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : (
                            <p className="text-xs text-slate-400">
                                Essay evaluation not available.
                            </p>
                        )}
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
