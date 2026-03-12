"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    FileQuestion,
    Filter,
    X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────
interface SubjectInfo {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
}

interface Question {
    id: string;
    subject_id: string;
    code: string;
    question_type: string;
    difficulty: string;
    content: Record<string, unknown>;
    correct_answer: Record<string, unknown> | null;
    solution_text: string | null;
    marks: number;
    is_active: boolean;
    times_shown: number;
    times_correct: number;
    created_at: string;
    updated_at: string;
    subjects: SubjectInfo;
}

interface FetchResponse {
    questions: Question[];
    total: number;
    limit: number;
    offset: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
const PAGE_SIZE = 30;

const QUESTION_TYPES = [
    { value: "mcq", label: "MCQ" },
    { value: "passage_mcq", label: "Passage MCQ" },
    { value: "poem_mcq", label: "Poem MCQ" },
    { value: "fill_blank_dropdown", label: "Fill Blank" },
    { value: "fill_missing_sentence", label: "Fill Missing Sentence" },
    { value: "essay", label: "Essay" },
];

const DIFFICULTY_LEVELS = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
];

// ─── Helpers ────────────────────────────────────────────────────────────
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

function typeLabel(t: string) {
    return QUESTION_TYPES.find((qt) => qt.value === t)?.label ?? t;
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
    if (typeof content.passage_with_gaps === "string") return content.passage_with_gaps;
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

    // MCQ types
    if (
        questionType === "mcq" ||
        questionType === "passage_mcq" ||
        questionType === "poem_mcq"
    ) {
        const label = (correctAnswer as { label?: string }).label;
        if (label && Array.isArray(content.options)) {
            const opt = (content.options as Array<{ label: string; text?: string }>).find(
                (o) => o.label.toUpperCase() === label.toUpperCase()
            );
            return opt?.text ? `${label.toUpperCase()}) ${opt.text}` : label.toUpperCase();
        }
        return label?.toUpperCase() ?? "—";
    }

    // Fill blank
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

    // Fill missing sentence
    if (questionType === "fill_missing_sentence") {
        const mapping = (correctAnswer as { mapping?: Record<string, number> }).mapping;
        if (mapping) {
            return Object.entries(mapping)
                .map(([gap, idx]) => `${gap}: option ${idx + 1}`)
                .join("; ");
        }
    }

    // Essay
    if (questionType === "essay") return "Evaluated by AI";

    return "—";
}

// ─── Component ──────────────────────────────────────────────────────────
export default function AdminQuestionsPage() {
    // Data
    const [questions, setQuestions] = useState<Question[]>([]);
    const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
    const [total, setTotal] = useState(0);

    // Filters
    const [subjectId, setSubjectId] = useState<string>("");
    const [questionType, setQuestionType] = useState<string>("");
    const [difficulty, setDifficulty] = useState<string>("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");

    // Pagination
    const [page, setPage] = useState(0);

    // Loading / Error
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ─── Fetch subjects for the filter dropdown ─────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/subjects");
                const data = await res.json();
                if (res.ok && data.subjects) {
                    setSubjects(
                        data.subjects.map(
                            (s: { id: string; name: string; slug: string; icon: string }) => ({
                                id: s.id,
                                name: s.name,
                                slug: s.slug,
                                icon: s.icon,
                            })
                        )
                    );
                }
            } catch {
                // Non-critical – filter will just be empty
            }
        })();
    }, []);

    // ─── Fetch questions ────────────────────────────────────────────────
    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));
            if (subjectId) params.set("subject_id", subjectId);
            if (questionType) params.set("question_type", questionType);
            if (difficulty) params.set("difficulty", difficulty);
            if (search) params.set("search", search);

            const res = await fetch(`/api/admin/questions?${params.toString()}`);
            const data: FetchResponse = await res.json();

            if (!res.ok) {
                throw new Error(
                    (data as unknown as { error: string }).error ||
                        "Failed to fetch questions"
                );
            }

            setQuestions(data.questions);
            setTotal(data.total);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load questions"
            );
        } finally {
            setIsLoading(false);
        }
    }, [page, subjectId, questionType, difficulty, search]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // ─── Derived ────────────────────────────────────────────────────────
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const hasFilters = !!(subjectId || questionType || difficulty || search);

    const clearFilters = () => {
        setSubjectId("");
        setQuestionType("");
        setDifficulty("");
        setSearch("");
        setSearchInput("");
        setPage(0);
    };

    const handleSearch = () => {
        setSearch(searchInput.trim());
        setPage(0);
    };

    // ─── Render ─────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-zinc-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold text-zinc-900">
                                Question Bank
                            </h1>
                            <p className="text-sm text-zinc-500">
                                Browse and filter all questions
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/dashboard/upload"
                        className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                        Upload Questions
                    </Link>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                {/* ── Filters ────────────────────────────────────────── */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-700">
                            Filters
                        </span>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="ml-auto inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
                            >
                                <X className="h-3 w-3" />
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Subject */}
                        <Select
                            value={subjectId}
                            onValueChange={(v) => {
                                setSubjectId(v === "all" ? "" : v);
                                setPage(0);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Subjects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Subjects
                                </SelectItem>
                                {subjects.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Question type */}
                        <Select
                            value={questionType}
                            onValueChange={(v) => {
                                setQuestionType(v === "all" ? "" : v);
                                setPage(0);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {QUESTION_TYPES.map((qt) => (
                                    <SelectItem key={qt.value} value={qt.value}>
                                        {qt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Difficulty */}
                        <Select
                            value={difficulty}
                            onValueChange={(v) => {
                                setDifficulty(v === "all" ? "" : v);
                                setPage(0);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Difficulties" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Difficulties
                                </SelectItem>
                                {DIFFICULTY_LEVELS.map((d) => (
                                    <SelectItem key={d.value} value={d.value}>
                                        {d.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Code search */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search code…"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSearch();
                                }}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleSearch}
                                className="shrink-0"
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── Stats bar ───────────────────────────────────────── */}
                <div className="flex items-center justify-between text-sm text-zinc-500">
                    <span>
                        {isLoading
                            ? "Loading…"
                            : `${total} question${total !== 1 ? "s" : ""} found`}
                    </span>
                    {totalPages > 1 && (
                        <span>
                            Page {page + 1} of {totalPages}
                        </span>
                    )}
                </div>

                {/* ── Content ─────────────────────────────────────────── */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                        <p className="text-red-600">{error}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={fetchQuestions}
                        >
                            Retry
                        </Button>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                        <FileQuestion className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
                        <p className="text-zinc-500 text-sm">
                            {hasFilters
                                ? "No questions match the current filters."
                                : "No questions uploaded yet."}
                        </p>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map((q) => {
                            const options = getOptions(q.content);
                            const answerText = getCorrectAnswerDisplay(
                                q.question_type,
                                q.correct_answer,
                                q.content
                            );

                            return (
                                <div
                                    key={q.id}
                                    className="rounded-2xl border border-slate-200/70 bg-white hover:shadow-sm transition-shadow"
                                >
                                    {/* Meta bar */}
                                    <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-2">
                                        <span className="text-xs font-mono text-zinc-400">
                                            {q.code}
                                        </span>
                                        <span className="text-zinc-300">·</span>
                                        <span className="text-xs text-zinc-500">
                                            {q.subjects?.name ?? "—"}
                                        </span>
                                        <span className="text-zinc-300">·</span>
                                        <Badge
                                            variant="secondary"
                                            className="text-[11px]"
                                        >
                                            {typeLabel(q.question_type)}
                                        </Badge>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${difficultyColor(q.difficulty)}`}
                                        >
                                            {q.difficulty}
                                        </span>
                                        <span className="text-xs text-zinc-400 ml-auto">
                                            {q.marks} mark{q.marks !== 1 ? "s" : ""} · {formatDate(q.created_at)}
                                        </span>
                                    </div>

                                    {/* Question text */}
                                    <div className="px-5 pb-3">
                                        <p className="text-sm text-zinc-900 whitespace-pre-line">
                                            {getQuestionText(q.content)}
                                        </p>
                                    </div>

                                    {/* Options (MCQ types) */}
                                    {options && options.length > 0 && (
                                        <div className="px-5 pb-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                {options.map((opt) => {
                                                    const isCorrect =
                                                        q.correct_answer &&
                                                        (q.correct_answer as { label?: string }).label?.toUpperCase() ===
                                                            opt.label.toUpperCase();
                                                    return (
                                                        <div
                                                            key={opt.label}
                                                            className={`flex items-start gap-2 rounded-lg px-3 py-1.5 text-xs ${
                                                                isCorrect
                                                                    ? "bg-emerald-50 text-emerald-800 font-medium"
                                                                    : "bg-zinc-50 text-zinc-700"
                                                            }`}
                                                        >
                                                            <span className="font-semibold shrink-0">
                                                                {opt.label.toUpperCase()})
                                                            </span>
                                                            <span>{opt.text ?? "—"}</span>
                                                            {isCorrect && (
                                                                <span className="ml-auto text-emerald-600 text-[10px] font-bold shrink-0">
                                                                    ✓ Correct
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Answer (non-MCQ types) */}
                                    {!options && answerText !== "—" && (
                                        <div className="px-5 pb-4">
                                            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                                                <span className="font-semibold">Answer:</span>
                                                <span>{answerText}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Pagination ──────────────────────────────────────── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>

                        {/* page numbers (show up to 5) */}
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i;
                            } else if (page < 3) {
                                pageNum = i;
                            } else if (page > totalPages - 4) {
                                pageNum = totalPages - 5 + i;
                            } else {
                                pageNum = page - 2 + i;
                            }
                            return (
                                <Button
                                    key={pageNum}
                                    variant={pageNum === page ? "default" : "outline"}
                                    size="sm"
                                    className="w-9"
                                    onClick={() => setPage(pageNum)}
                                >
                                    {pageNum + 1}
                                </Button>
                            );
                        })}

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages - 1}
                            onClick={() =>
                                setPage((p) => Math.min(totalPages - 1, p + 1))
                            }
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
