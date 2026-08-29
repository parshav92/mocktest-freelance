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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    FileQuestion,
    Filter,
    X,
    Pencil,
    Trash2,
    ToggleLeft,
    ToggleRight,
    AlertTriangle,
    ArrowUpDown,
    CheckSquare,
    Square,
    MinusSquare,
} from "lucide-react";
import {
    getContentTextField,
    getMcqCorrectLabel,
    getOptions,
    getQuestionText,
    isMcqType,
    parseQuestionContent,
} from "@/lib/utils/question-content";

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

function getCorrectAnswerDisplay(
    questionType: string,
    correctAnswer: Record<string, unknown> | null,
    content: Record<string, unknown>
): string {
    if (!correctAnswer) return "—";

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

    if (questionType === "fill_missing_sentence") {
        const mapping = (correctAnswer as { mapping?: Record<string, number> }).mapping;
        if (mapping) {
            return Object.entries(mapping)
                .map(([gap, idx]) => `${gap}: option ${idx + 1}`)
                .join("; ");
        }
    }

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
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [codeFrom, setCodeFrom] = useState("");
    const [codeTo, setCodeTo] = useState("");
    const [codeFromInput, setCodeFromInput] = useState("");
    const [codeToInput, setCodeToInput] = useState("");

    // Pagination
    const [page, setPage] = useState(0);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    // Loading / Error
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Solution visibility
    const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(new Set());
    const toggleSolution = (id: string) =>
        setExpandedSolutions((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });

    // ── Edit modal state ─────────────────────────────────────────────
    const [editQuestion, setEditQuestion] = useState<Question | null>(null);
    const [editText, setEditText] = useState("");
    const [editSolution, setEditSolution] = useState("");
    const [editDifficulty, setEditDifficulty] = useState("");
    const [editMarks, setEditMarks] = useState<number>(1);
    const [editCorrectAnswer, setEditCorrectAnswer] = useState<string>("");
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const openEdit = (q: Question) => {
        const parsedContent = parseQuestionContent(q.content);
        const textKey = getContentTextField(q.question_type);
        setEditQuestion({ ...q, content: parsedContent });
        setEditText(
            typeof parsedContent[textKey] === "string"
                ? (parsedContent[textKey] as string)
                : getQuestionText(parsedContent),
        );
        setEditSolution(q.solution_text ?? "");
        setEditDifficulty(q.difficulty);
        setEditMarks(q.marks);
        setEditCorrectAnswer(
            isMcqType(q.question_type)
                ? getMcqCorrectLabel(q.correct_answer)
                : "",
        );
        setEditError(null);
    };

    const closeEdit = () => {
        setEditQuestion(null);
        setEditError(null);
    };

    const saveEdit = async () => {
        if (!editQuestion) return;
        setEditSaving(true);
        setEditError(null);

        const textKey = getContentTextField(editQuestion.question_type);
        const updatedContent = { ...editQuestion.content, [textKey]: editText };

        // Build correct_answer update for MCQ types
        const updatedCorrectAnswer =
            isMcqType(editQuestion.question_type) && editCorrectAnswer
                ? { label: editCorrectAnswer.toUpperCase() }
                : editQuestion.correct_answer;

        try {
            const res = await fetch("/api/admin/questions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editQuestion.id,
                    content: updatedContent,
                    correct_answer: updatedCorrectAnswer,
                    solution_text: editSolution || null,
                    difficulty: editDifficulty,
                    marks: editMarks,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");

            setQuestions((prev) =>
                prev.map((q) =>
                    q.id === editQuestion.id
                        ? {
                              ...q,
                              content: updatedContent,
                              correct_answer: updatedCorrectAnswer,
                              solution_text: editSolution || null,
                              difficulty: editDifficulty,
                              marks: editMarks,
                          }
                        : q
                )
            );
            closeEdit();
        } catch (err) {
            setEditError(
                err instanceof Error ? err.message : "Failed to save changes"
            );
        } finally {
            setEditSaving(false);
        }
    };

    // ── Delete confirmation state ────────────────────────────────────
    const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        setDeleteError(null);
        try {
            const res = await fetch("/api/admin/questions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: deleteTarget.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete");

            setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget.id));
            setTotal((t) => t - 1);
            setDeleteTarget(null);
        } catch (err) {
            setDeleteError(
                err instanceof Error ? err.message : "Failed to delete question"
            );
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Active / Inactive toggle ─────────────────────────────────────
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

    const toggleActive = async (q: Question) => {
        setTogglingIds((prev) => {
            const next = new Set(prev);
            next.add(q.id);
            return next;
        });
        try {
            const res = await fetch("/api/admin/questions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: q.id, is_active: !q.is_active }),
            });
            if (!res.ok) throw new Error("Failed to update status");
            setQuestions((prev) =>
                prev.map((item) =>
                    item.id === q.id ? { ...item, is_active: !item.is_active } : item
                )
            );
        } catch {
            // Silently ignore – user can retry
        } finally {
            setTogglingIds((prev) => {
                const next = new Set(prev);
                next.delete(q.id);
                return next;
            });
        }
    };

    // ─── Fetch subjects ──────────────────────────────────────────────
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
                // Non-critical
            }
        })();
    }, []);

    // ─── Fetch questions ────────────────────────────────────────────
    const fetchQuestions = useCallback(async () => {
        if (!subjectId) {
            setQuestions([]);
            setTotal(0);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));
            params.set("sort_order", sortOrder);
            if (subjectId) params.set("subject_id", subjectId);
            if (questionType) params.set("question_type", questionType);
            if (difficulty) params.set("difficulty", difficulty);
            if (search) params.set("search", search);
            if (codeFrom) params.set("code_from", codeFrom);
            if (codeTo) params.set("code_to", codeTo);

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
    }, [page, subjectId, questionType, difficulty, search, sortOrder, codeFrom, codeTo]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // ─── Derived ────────────────────────────────────────────────────
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const hasFilters = !!(questionType || difficulty || search || codeFrom || codeTo);

    const clearFilters = () => {
        setQuestionType("");
        setDifficulty("");
        setSearch("");
        setSearchInput("");
        setCodeFrom("");
        setCodeTo("");
        setCodeFromInput("");
        setCodeToInput("");
        setPage(0);
    };

    const handleSearch = () => {
        setSearch(searchInput.trim());
        setCodeFrom(codeFromInput.trim());
        setCodeTo(codeToInput.trim());
        setPage(0);
    };

    // ─── Bulk selection helpers ──────────────────────────────────────
    const allSelected = questions.length > 0 && questions.every((q) => selectedIds.has(q.id));
    const someSelected = questions.some((q) => selectedIds.has(q.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(questions.map((q) => q.id)));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const bulkToggleActive = async (newActive: boolean) => {
        if (selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            const res = await fetch("/api/admin/questions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds), is_active: newActive }),
            });
            if (!res.ok) throw new Error("Failed to bulk update");
            setQuestions((prev) =>
                prev.map((q) =>
                    selectedIds.has(q.id) ? { ...q, is_active: newActive } : q
                )
            );
            setSelectedIds(new Set());
        } catch {
            // Silently ignore – user can retry
        } finally {
            setBulkLoading(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-zinc-50">
            {/* ── Edit Modal ──────────────────────────────────────── */}
            <Dialog open={!!editQuestion} onOpenChange={(open) => !open && closeEdit()}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">
                            Edit Question
                            {editQuestion && (
                                <span className="ml-2 text-xs font-mono text-zinc-400">
                                    {editQuestion.code}
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            You can edit the question text, correct answer, solution, difficulty and marks.
                        </DialogDescription>
                    </DialogHeader>

                    {editQuestion && (
                        <div className="space-y-5 py-2">
                            {/* Question text */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-600">
                                    Question Text
                                </label>
                                <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={6}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y font-mono"
                                />
                            </div>

                            {/* Options — click to change correct answer */}
                            {getOptions(editQuestion.content) && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-600">
                                        Options <span className="text-zinc-400 font-normal">— click to set correct answer</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {getOptions(editQuestion.content)!.map((opt) => {
                                            const optLabel = opt.label.toUpperCase();
                                            const isCorrect = editCorrectAnswer === optLabel;
                                            return (
                                                <button
                                                    key={optLabel}
                                                    type="button"
                                                    onClick={() => setEditCorrectAnswer(optLabel)}
                                                    className={`flex items-start gap-2 rounded-lg px-3 py-1.5 text-xs text-left transition-colors ${
                                                        isCorrect
                                                            ? "bg-emerald-50 text-emerald-800 font-medium border-2 border-emerald-400 ring-1 ring-emerald-200"
                                                            : "bg-zinc-50 text-zinc-500 border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-100"
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
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Solution */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-600">
                                    Solution / Explanation
                                    <span className="ml-1 text-zinc-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={editSolution}
                                    onChange={(e) => setEditSolution(e.target.value)}
                                    rows={4}
                                    placeholder="Leave blank if no solution text…"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y"
                                />
                            </div>

                            {/* Difficulty + Marks row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-600">
                                        Difficulty
                                    </label>
                                    <Select
                                        value={editDifficulty}
                                        onValueChange={setEditDifficulty}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DIFFICULTY_LEVELS.map((d) => (
                                                <SelectItem key={d.value} value={d.value}>
                                                    {d.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-600">
                                        Marks
                                    </label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={editMarks}
                                        onChange={(e) => setEditMarks(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {editError && (
                                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                                    {editError}
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={closeEdit} disabled={editSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={saveEdit}
                            disabled={editSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {editSaving ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation Modal ────────────────────────── */}
            <Dialog
                open={!!deleteTarget}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteTarget(null);
                        setDeleteError(null);
                    }
                }}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Question
                        </DialogTitle>
                        <DialogDescription className="text-sm text-zinc-500 pt-1">
                            This action is <strong>permanent</strong> and cannot be undone.
                            The question and all its data will be removed.
                            {deleteTarget && (
                                <span className="block mt-2 font-mono text-xs text-zinc-400">
                                    {deleteTarget.code}
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {deleteError && (
                        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                            {deleteError}
                        </p>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteTarget(null);
                                setDeleteError(null);
                            }}
                            disabled={deleteLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                "Delete Permanently"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                        <span className="text-sm font-medium text-zinc-700">Filters</span>

                        {/* Sort toggle */}
                        <button
                            onClick={() => setSortOrder((o) => o === "asc" ? "desc" : "asc")}
                            className="ml-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors rounded-lg border border-zinc-200 px-2.5 py-1 hover:bg-zinc-50"
                            title={`Sort by code: ${sortOrder === "asc" ? "A → Z" : "Z → A"}`}
                        >
                            <ArrowUpDown className="h-3 w-3" />
                            Code {sortOrder === "asc" ? "A→Z" : "Z→A"}
                        </button>

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
                            value={subjectId || undefined}
                            onValueChange={(v) => {
                                setSubjectId(v);
                                setPage(0);
                                setSelectedIds(new Set());
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select One" />
                            </SelectTrigger>
                            <SelectContent>
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
                                <SelectItem value="all">All Difficulties</SelectItem>
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

                    {/* Code range search row */}
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-zinc-500 shrink-0">Code range:</span>
                        <Input
                            placeholder="From (e.g. MR_MCQ_0001)"
                            value={codeFromInput}
                            onChange={(e) => setCodeFromInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                            className="flex-1 text-xs h-8"
                        />
                        <span className="text-xs text-zinc-400">→</span>
                        <Input
                            placeholder="To (e.g. MR_MCQ_0050)"
                            value={codeToInput}
                            onChange={(e) => setCodeToInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                            className="flex-1 text-xs h-8"
                        />
                        <Button variant="outline" size="sm" onClick={handleSearch} className="shrink-0 h-8 text-xs">
                            Apply
                        </Button>
                    </div>
                </div>

                {/* ── Stats bar + bulk actions ─────────────────────────── */}
                <div className="flex items-center justify-between text-sm text-zinc-500">
                    <div className="flex items-center gap-3">
                        {/* Select all checkbox */}
                        {questions.length > 0 && (
                            <button
                                onClick={toggleSelectAll}
                                className="p-0.5 rounded hover:bg-zinc-100 transition-colors"
                                title={allSelected ? "Deselect all" : "Select all on page"}
                            >
                                {allSelected ? (
                                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                                ) : someSelected ? (
                                    <MinusSquare className="h-4 w-4 text-zinc-400" />
                                ) : (
                                    <Square className="h-4 w-4 text-zinc-300" />
                                )}
                            </button>
                        )}
                        <span>
                            {isLoading
                                ? "Loading…"
                                : selectedIds.size > 0
                                ? `${selectedIds.size} selected`
                                : `${total} question${total !== 1 ? "s" : ""} found`}
                        </span>
                        {/* Bulk action buttons */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-1.5 ml-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={bulkLoading}
                                    onClick={() => bulkToggleActive(false)}
                                    className="h-7 text-xs gap-1"
                                >
                                    {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ToggleLeft className="h-3 w-3" />}
                                    Disable
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={bulkLoading}
                                    onClick={() => bulkToggleActive(true)}
                                    className="h-7 text-xs gap-1"
                                >
                                    {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ToggleRight className="h-3 w-3" />}
                                    Enable
                                </Button>
                            </div>
                        )}
                    </div>
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
                ) : !subjectId ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                        <FileQuestion className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
                        <p className="text-zinc-500 text-sm">
                            Select a subject to view questions.
                        </p>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                        <FileQuestion className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
                        <p className="text-zinc-500 text-sm">
                            {hasFilters
                                ? "No questions match the current filters."
                                : "No questions found for this subject."}
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
                            const isToggling = togglingIds.has(q.id);

                            return (
                                <div
                                    key={q.id}
                                    className={`rounded-2xl border bg-white transition-shadow hover:shadow-sm ${
                                        q.is_active
                                            ? "border-slate-200/70"
                                            : "border-zinc-200 opacity-60"
                                    }`}
                                >
                                    {/* Meta bar */}
                                    <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-2">
                                        {/* Selection checkbox */}
                                        <button
                                            onClick={() => toggleSelect(q.id)}
                                            className="p-0.5 rounded hover:bg-zinc-100 transition-colors shrink-0"
                                        >
                                            {selectedIds.has(q.id) ? (
                                                <CheckSquare className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <Square className="h-4 w-4 text-zinc-300" />
                                            )}
                                        </button>
                                        <span className="text-xs font-mono text-zinc-400">
                                            {q.code}
                                        </span>
                                        <span className="text-zinc-300">·</span>
                                        <span className="text-xs text-zinc-500">
                                            {q.subjects?.name ?? "—"}
                                        </span>
                                        <span className="text-zinc-300">·</span>
                                        <Badge variant="secondary" className="text-[11px]">
                                            {typeLabel(q.question_type)}
                                        </Badge>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${difficultyColor(q.difficulty)}`}
                                        >
                                            {q.difficulty}
                                        </span>

                                        {/* Active badge */}
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                q.is_active
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-zinc-100 text-zinc-500"
                                            }`}
                                        >
                                            {q.is_active ? "Active" : "Inactive"}
                                        </span>

                                        <span className="text-xs text-zinc-400 ml-auto">
                                            {q.marks} mark{q.marks !== 1 ? "s" : ""} ·{" "}
                                            {formatDate(q.created_at)}
                                        </span>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 ml-2">
                                            {/* Toggle active */}
                                            <button
                                                title={q.is_active ? "Set Inactive" : "Set Active"}
                                                disabled={isToggling}
                                                onClick={() => toggleActive(q)}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                                            >
                                                {isToggling ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : q.is_active ? (
                                                    <ToggleRight className="h-4 w-4 text-emerald-500" />
                                                ) : (
                                                    <ToggleLeft className="h-4 w-4" />
                                                )}
                                            </button>

                                            {/* Edit */}
                                            <button
                                                title="Edit question"
                                                onClick={() => openEdit(q)}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                title="Delete question"
                                                onClick={() => {
                                                    setDeleteError(null);
                                                    setDeleteTarget(q);
                                                }}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
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
                                                        (
                                                            q.correct_answer as {
                                                                label?: string;
                                                            }
                                                        ).label?.toUpperCase() ===
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

                                    {/* Solution toggle */}
                                    {q.solution_text && (
                                        <div className="border-t border-slate-100">
                                            <button
                                                onClick={() => toggleSolution(q.id)}
                                                className="flex items-center gap-1.5 w-full px-5 py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
                                            >
                                                <ChevronDown
                                                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                                        expandedSolutions.has(q.id)
                                                            ? "rotate-180"
                                                            : ""
                                                    }`}
                                                />
                                                {expandedSolutions.has(q.id)
                                                    ? "Hide Solution"
                                                    : "Show Solution"}
                                            </button>
                                            {expandedSolutions.has(q.id) && (
                                                <div className="px-5 pb-4">
                                                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-zinc-700 whitespace-pre-line">
                                                        {q.solution_text}
                                                    </div>
                                                </div>
                                            )}
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
