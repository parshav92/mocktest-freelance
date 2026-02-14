"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Loader2,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    BarChart3,
    Minus,
} from "lucide-react";

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
        passage?: {
            title: string;
            content: string;
        };
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

export default function TestReviewPage() {
    const router = useRouter();
    const params = useParams();
    const testId = params.id as string;

    const [reviewData, setReviewData] = useState<ReviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
        new Set(),
    );

    useEffect(() => {
        fetchReview();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId]);

    const fetchReview = async () => {
        try {
            const res = await fetch(`/api/tests/${testId}/review`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load review");
            }

            setReviewData(data);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load review",
            );
        } finally {
            setLoading(false);
        }
    };

    const toggleQuestion = (index: number) => {
        setExpandedQuestions((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
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
                        onClick={() => router.push("/dashboard/tests")}
                        className="bg-[#1a2744] hover:bg-[#1a2744]/90"
                    >
                        Back to Tests
                    </Button>
                </div>
            </div>
        );
    }

    const { test, questions, summary } = reviewData;
    const barColor = (pct: number) =>
        pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Thin accent bar */}
            <div className="h-1 bg-[#1a2744]" />

            <div className="w-full max-w-6xl mx-auto px-6 md:px-10">
                {/* Nav */}
                <div className="pt-6 pb-2">
                    <button
                        onClick={() => router.push("/dashboard/tests")}
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
                            <p className="text-xs text-slate-500 mb-0.5">Correct</p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                {summary.correct}
                                <span className="text-slate-400 font-normal">
                                    /{summary.total_questions}
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">Marks</p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                {summary.marks_obtained}
                                <span className="text-slate-400 font-normal">
                                    /{summary.total_marks}
                                </span>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">Time</p>
                            <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                {formatTime(summary.time_spent_secs)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-0.5">Unattempted</p>
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
                    QUESTION REVIEW
                ============================================ */}
                <section className="py-10">
                    <h2 className="text-lg font-medium text-slate-800 mb-6">
                        Question Review
                    </h2>

                    <div className="space-y-3">
                        {questions.map((item, idx) => {
                            const isOpen = expandedQuestions.has(idx);
                            return (
                                <div
                                    key={item.question.id}
                                    className={`bg-white rounded-xl shadow-sm overflow-hidden border-l-[3px] ${
                                        !item.was_attempted
                                            ? "border-l-slate-300"
                                            : item.is_correct
                                              ? "border-l-emerald-500"
                                              : "border-l-rose-400"
                                    }`}
                                >
                                    {/* Question row */}
                                    <button
                                        onClick={() => toggleQuestion(idx)}
                                        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50/60 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-sm font-semibold text-slate-900 shrink-0">
                                                Q{item.question_number}
                                            </span>
                                            {!item.was_attempted ? (
                                                <Minus className="h-4 w-4 text-slate-400 shrink-0" />
                                            ) : item.is_correct ? (
                                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                                            )}
                                            <span className="text-xs text-slate-400 capitalize shrink-0">
                                                {item.question.difficulty}
                                            </span>
                                            <span className="text-xs text-slate-300 shrink-0">
                                                /
                                            </span>
                                            <span className="text-xs text-slate-400 shrink-0">
                                                {item.question.question_type.replace(
                                                    /_/g,
                                                    " ",
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <span className="text-sm text-slate-500 tabular-nums">
                                                {item.marks_earned}/
                                                {item.question.marks}
                                            </span>
                                            {isOpen ? (
                                                <ChevronUp className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded content */}
                                    {isOpen && (
                                        <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                                            {/* Passage */}
                                            {item.question.passage && (
                                                <div className="mb-5 p-4 bg-slate-50 rounded-lg">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                                                        {item.question.passage
                                                            .title || "Passage"}
                                                    </p>
                                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                        {
                                                            item.question
                                                                .passage.content
                                                        }
                                                    </p>
                                                </div>
                                            )}

                                            {/* Question */}
                                            <QuestionDisplay
                                                question={item.question}
                                                studentAnswer={
                                                    item.student_answer
                                                }
                                                wasAttempted={
                                                    item.was_attempted
                                                }
                                            />

                                            {/* Solution */}
                                            {item.question.solution_text && (
                                                <div className="mt-5 p-4 bg-slate-50 rounded-lg">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                                                        Solution
                                                    </p>
                                                    <p className="text-sm text-slate-700 leading-relaxed">
                                                        {
                                                            item.question
                                                                .solution_text
                                                        }
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ============================================
                    ACTIONS
                ============================================ */}
                <div className="pb-14 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/tests")}
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
        </div>
    );
}

// ============================================
// QUESTION DISPLAY
// ============================================
function QuestionDisplay({
    question,
    studentAnswer,
    wasAttempted,
}: {
    question: ReviewQuestion["question"];
    studentAnswer: unknown;
    wasAttempted: boolean;
}) {
    const content = question.content;
    const correctAnswer = question.correct_answer;

    switch (question.question_type) {
        case "mcq":
        case "passage_mcq":
        case "poem_mcq": {
            const questionText = content.question as string;
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
                <div>
                    <p className="text-sm text-slate-800 mb-4 leading-relaxed">
                        {questionText}
                    </p>
                    <div className="space-y-2">
                        {options.map((option, index) => {
                            const optionLabel = option.label.toUpperCase();
                            const isCorrect = optionLabel === correctLabel;
                            const isSelected = optionLabel === studentLabel;

                            return (
                                <div
                                    key={`mcq-opt-${index}`}
                                    className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-colors ${
                                        isCorrect
                                            ? "bg-emerald-50 text-slate-800"
                                            : isSelected
                                              ? "bg-rose-50 text-slate-800"
                                              : "bg-slate-50 text-slate-600"
                                    }`}
                                >
                                    <span
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                            isCorrect
                                                ? "bg-emerald-500 text-white"
                                                : isSelected
                                                  ? "bg-rose-400 text-white"
                                                  : "bg-slate-200 text-slate-500"
                                        }`}
                                    >
                                        {optionLabel}
                                    </span>
                                    <span className="flex-1">{option.text}</span>
                                    {isCorrect && (
                                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                    )}
                                    {isSelected && !isCorrect && (
                                        <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {!wasAttempted && (
                        <p className="text-xs text-slate-400 mt-3 italic">
                            Not attempted
                        </p>
                    )}
                </div>
            );
        }

        case "fill_blank_dropdown": {
            const passageText = content.passage_text as string;
            const blanks = content.blanks as Array<{
                position: number;
                options: string[];
                correct_index: number;
            }>;
            const studentAnswers = (studentAnswer as number[]) || [];
            const correctAnswers = (correctAnswer as { answers: number[] })
                .answers;

            return (
                <div>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                        {passageText}
                    </p>
                    <div className="space-y-2">
                        {blanks.map((blank, idx) => {
                            const isCorrectBlank =
                                studentAnswers[idx] === correctAnswers[idx];
                            const studentOption =
                                blank.options[studentAnswers[idx]];
                            const correctOption =
                                blank.options[correctAnswers[idx]];

                            return (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <span className="text-xs font-medium text-slate-500 w-16 shrink-0">
                                        Blank {idx + 1}
                                    </span>
                                    <span
                                        className={
                                            isCorrectBlank
                                                ? "text-emerald-600 font-medium"
                                                : "text-rose-500 line-through"
                                        }
                                    >
                                        {studentOption || "Skipped"}
                                    </span>
                                    {!isCorrectBlank && (
                                        <>
                                            <span className="text-slate-300">
                                                →
                                            </span>
                                            <span className="text-emerald-600 font-medium">
                                                {correctOption}
                                            </span>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        case "essay": {
            const prompt = content.prompt as string;
            const essayText = studentAnswer as string;

            return (
                <div>
                    <p className="text-sm text-slate-800 font-medium mb-3">
                        {prompt}
                    </p>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {essayText || "No response submitted."}
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Essays are evaluated by AI. Score may vary.
                    </p>
                </div>
            );
        }

        default:
            return (
                <p className="text-sm text-slate-400">
                    Review not available for this question type.
                </p>
            );
    }
}
