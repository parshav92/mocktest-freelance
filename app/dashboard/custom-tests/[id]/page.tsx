"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MathText } from "@/components/ui/math-text";
import { ArrowLeft, Loader2, ClipboardList, Play, Pencil, Send } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────
interface SubjectInfo {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
}

interface QuestionDetail {
    id: string;
    subject_id: string;
    code: string;
    question_type: string;
    difficulty: string;
    content: Record<string, unknown>;
    correct_answer: Record<string, unknown> | null;
    marks: number;
    is_active: boolean;
    subjects: SubjectInfo;
}

interface TestQuestion {
    id: string;
    question_id: string;
    sort_order: number;
    questions: QuestionDetail;
}

interface CustomTest {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    visibility: string;
    duration_mins: number;
    instructions: unknown;
    is_active: boolean;
    display_order: number;
    available_from: string | null;
    available_until: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────
const QUESTION_TYPES: Record<string, string> = {
    mcq: "MCQ",
    passage_mcq: "Passage MCQ",
    poem_mcq: "Poem MCQ",
    fill_blank_dropdown: "Fill Blank",
    fill_missing_sentence: "Fill Missing Sentence",
    essay: "Essay",
};

// ─── Helpers ────────────────────────────────────────────────────────────
function visibilityColor(v: string) {
    switch (v) {
        case "admin_only":
            return "bg-zinc-100 text-zinc-700";
        case "subscribers_only":
            return "bg-blue-100 text-blue-700";
        case "free_trial":
            return "bg-emerald-100 text-emerald-700";
        default:
            return "bg-zinc-100 text-zinc-700";
    }
}

function visibilityLabel(v: string) {
    switch (v) {
        case "admin_only":
            return "Admin Only";
        case "subscribers_only":
            return "Subscribers Only";
        case "free_trial":
            return "Free Trial";
        default:
            return v;
    }
}

function difficultyColor(d: string) {
    switch (d) {
        case "easy":
            return "bg-emerald-100 text-emerald-700";
        case "medium":
            return "bg-amber-100 text-amber-700";
        case "hard":
            return "bg-red-100 text-red-700";
        default:
            return "bg-zinc-100 text-zinc-700";
    }
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function getQuestionText(content: Record<string, unknown>): string {
    if (typeof content.question === "string") return content.question;
    if (typeof content.passage_text === "string") return content.passage_text;
    if (typeof content.passage_with_gaps === "string")
        return content.passage_with_gaps;
    if (typeof content.prompt === "string") return content.prompt;
    return "—";
}

function getOptions(
    content: Record<string, unknown>
): Array<{ label: string; text?: string }> | null {
    if (Array.isArray(content.options)) {
        return content.options as Array<{ label: string; text?: string }>;
    }
    return null;
}

function getCorrectAnswerDisplay(
    questionType: string,
    correctAnswer: Record<string, unknown> | null,
    content: Record<string, unknown>
): string {
    if (!correctAnswer) return "—";

    if (["mcq", "passage_mcq", "poem_mcq"].includes(questionType)) {
        const label = (correctAnswer as { label?: string }).label;
        if (label && Array.isArray(content.options)) {
            const opt = (
                content.options as Array<{ label: string; text?: string }>
            ).find((o) => o.label.toUpperCase() === label.toUpperCase());
            return opt?.text
                ? `${label.toUpperCase()}) ${opt.text}`
                : label.toUpperCase();
        }
        return label?.toUpperCase() ?? "—";
    }

    if (questionType === "fill_blank_dropdown") {
        const answers = (correctAnswer as { answers?: number[] }).answers;
        if (answers && Array.isArray(content.blanks)) {
            const blanks = content.blanks as Array<{ options: string[] }>;
            return answers
                .map((idx, i) => blanks[i]?.options?.[idx] ?? "?")
                .join(", ");
        }
        return JSON.stringify(answers);
    }

    if (questionType === "essay") return "AI evaluated";

    return "—";
}

// ─── Component ──────────────────────────────────────────────────────────
export default function CustomTestDetailPage() {
    const { id } = useParams<{ id: string }>();

    const [test, setTest] = useState<CustomTest | null>(null);
    const [questions, setQuestions] = useState<TestQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);

    const handlePublish = async () => {
        if (!test) return;
        setPublishing(true);
        try {
            const res = await fetch(`/api/admin/custom-tests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: true }),
            });
            if (!res.ok) throw new Error("Failed to publish");
            setTest((prev) => prev ? { ...prev, is_active: true } : prev);
        } catch {
            // could add error toast here
        } finally {
            setPublishing(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        (async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/admin/custom-tests/${id}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Not found");
                setTest(data.test);
                setQuestions(data.questions || []);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to load test"
                );
            } finally {
                setIsLoading(false);
            }
        })();
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error || !test) {
        return (
            <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4">
                <p className="text-red-600">{error || "Test not found"}</p>
                <Link href="/dashboard/custom-tests">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Tests
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link
                        href="/dashboard/custom-tests"
                        className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-zinc-600" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-semibold text-zinc-900">
                            {test.name}
                        </h1>
                        <p className="text-sm text-zinc-500 font-mono">
                            /{test.slug}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Edit button */}
                        <Link href={`/dashboard/custom-tests/${id}/edit`}>
                            <Button variant="outline" className="gap-2">
                                <Pencil className="h-4 w-4" />
                                Edit
                            </Button>
                        </Link>

                        {/* Quick-publish for drafts */}
                        {!test.is_active && (
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                                onClick={handlePublish}
                                disabled={publishing}
                            >
                                {publishing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Publish
                            </Button>
                        )}

                        {/* Take test (active only) */}
                        {test.is_active && questions.length > 0 && (
                            <Link href={`/custom-test/${test.slug}`}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                                    <Play className="h-4 w-4" />
                                    Take Test
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                {/* Test info card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${visibilityColor(test.visibility)}`}
                        >
                            {visibilityLabel(test.visibility)}
                        </span>
                        {test.is_active ? (
                            <Badge className="bg-emerald-600 text-xs">
                                Active
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="text-xs">
                                Draft
                            </Badge>
                        )}
                    </div>

                    {test.description && (
                        <p className="text-sm text-zinc-600 mb-4">
                            {test.description}
                        </p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-zinc-400 text-xs">Duration</p>
                            <p className="font-medium text-zinc-900">
                                {test.duration_mins} min
                            </p>
                        </div>
                        <div>
                            <p className="text-zinc-400 text-xs">Questions</p>
                            <p className="font-medium text-zinc-900">
                                {questions.length}
                            </p>
                        </div>
                        <div>
                            <p className="text-zinc-400 text-xs">Created</p>
                            <p className="font-medium text-zinc-900">
                                {formatDate(test.created_at)}
                            </p>
                        </div>
                        <div>
                            <p className="text-zinc-400 text-xs">
                                Display Order
                            </p>
                            <p className="font-medium text-zinc-900">
                                {test.display_order}
                            </p>
                        </div>
                    </div>

                    {(test.available_from || test.available_until) && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-sm">
                            {test.available_from && (
                                <div>
                                    <span className="text-zinc-400 text-xs">
                                        Available from:{" "}
                                    </span>
                                    <span className="text-zinc-700">
                                        {formatDate(test.available_from)}
                                    </span>
                                </div>
                            )}
                            {test.available_until && (
                                <div>
                                    <span className="text-zinc-400 text-xs">
                                        Until:{" "}
                                    </span>
                                    <span className="text-zinc-700">
                                        {formatDate(test.available_until)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Questions */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-zinc-500" />
                        <h2 className="text-lg font-semibold text-zinc-900">
                            Questions ({questions.length})
                        </h2>
                    </div>

                    {questions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                            <p className="text-sm text-zinc-400">
                                No questions assigned to this test.
                            </p>
                        </div>
                    ) : (
                        questions.map((tq, idx) => {
                            const q = tq.questions;
                            if (!q) return null;
                            const options = getOptions(q.content);
                            const correctLabel = (
                                q.correct_answer as { label?: string } | null
                            )?.label?.toUpperCase();

                            return (
                                <div
                                    key={tq.id}
                                    className="rounded-2xl border border-slate-200/70 bg-white"
                                >
                                    {/* Meta */}
                                    <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-2">
                                        <span className="text-xs font-mono text-zinc-400">
                                            #{idx + 1}
                                        </span>
                                        <span className="text-xs font-mono text-zinc-500">
                                            {q.code}
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px]"
                                        >
                                            {QUESTION_TYPES[
                                                q.question_type
                                            ] ?? q.question_type}
                                        </Badge>
                                        <span
                                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${difficultyColor(q.difficulty)}`}
                                        >
                                            {q.difficulty}
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            {q.subjects?.name}
                                        </span>
                                        <span className="text-[10px] text-zinc-400 ml-auto">
                                            {q.marks} mark
                                            {q.marks !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    {/* Question text */}
                                    <div className="px-5 pb-3">
                                        <MathText
                                            content={getQuestionText(q.content)}
                                            block
                                            className="text-sm text-zinc-800 whitespace-pre-wrap"
                                        />
                                    </div>

                                    {/* Options */}
                                    {options && options.length > 0 && (
                                        <div className="px-5 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {options.map((opt) => {
                                                const isCorrect =
                                                    correctLabel ===
                                                    opt.label?.toUpperCase();
                                                return (
                                                    <div
                                                        key={opt.label}
                                                        className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                                                            isCorrect
                                                                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                                                                : "bg-zinc-50 border border-zinc-100 text-zinc-700"
                                                        }`}
                                                    >
                                                        <span className="font-semibold shrink-0">
                                                            {opt.label?.toUpperCase()}
                                                            )
                                                        </span>
                                                        <span>
                                                            <MathText
                                                                content={
                                                                    opt.text ??
                                                                    "—"
                                                                }
                                                            />
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Non-MCQ correct answer */}
                                    {!options &&
                                        q.correct_answer &&
                                        q.question_type !== "essay" && (
                                            <div className="px-5 pb-3">
                                                <span className="inline-block rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-800">
                                                    Answer:{" "}
                                                    <MathText
                                                        content={getCorrectAnswerDisplay(
                                                            q.question_type,
                                                            q.correct_answer,
                                                            q.content,
                                                        )}
                                                    />
                                                </span>
                                            </div>
                                        )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
