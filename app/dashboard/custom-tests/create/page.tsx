"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Plus,
    CheckCircle2,
    ArrowUpDown,
} from "lucide-react";
import { SortableQuestionList } from "@/components/admin/sortable-question-list";
import { sortQuestionsByPassage } from "@/lib/utils/sort-questions-by-passage";
import { hasReadingPassageQuestions } from "@/lib/utils/reading-test";

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
    marks: number;
    is_active: boolean;
    passage_ids?: string[];
    subjects: SubjectInfo;
}

// ─── Constants ──────────────────────────────────────────────────────────
const PICKER_PAGE_SIZE = 20;

const QUESTION_TYPES = [
    { value: "mcq", label: "MCQ" },
    { value: "passage_mcq", label: "Passage MCQ" },
    { value: "poem_mcq", label: "Poem MCQ" },
    { value: "fill_blank_dropdown", label: "Fill Blank" },
    { value: "fill_missing_sentence", label: "Fill Missing Sentence" },
    { value: "essay", label: "Essay" },
];

const VISIBILITY_OPTIONS = [
    { value: "admin_only", label: "Admin Only" },
    { value: "subscribers_only", label: "Subscribers Only" },
    { value: "free_trial", label: "Free Trial" },
];

// ─── Helpers ────────────────────────────────────────────────────────────
function slugify(text: string) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
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

function typeLabel(t: string) {
    return QUESTION_TYPES.find((qt) => qt.value === t)?.label ?? t;
}

function questionPreview(content: Record<string, unknown>): string {
    if (typeof content.question === "string")
        return content.question.slice(0, 120);
    if (typeof content.passage_text === "string")
        return content.passage_text.slice(0, 120);
    if (typeof content.prompt === "string")
        return content.prompt.slice(0, 120);
    return "—";
}

// ─── Component ──────────────────────────────────────────────────────────
export default function CreateCustomTestPage() {
    const router = useRouter();

    // ─── Form state ─────────────────────────────────────────────────
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugManual, setSlugManual] = useState(false);
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState("admin_only");
    const [durationMins, setDurationMins] = useState(60);
    const [isActive, setIsActive] = useState(false);

    // ─── Selected questions (ordered) ───────────────────────────────
    const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
    const selectedIds = useMemo(
        () => new Set(selectedQuestions.map((q) => q.id)),
        [selectedQuestions]
    );

    // ─── Question picker state ──────────────────────────────────────
    const [pickerQuestions, setPickerQuestions] = useState<Question[]>([]);
    const [pickerTotal, setPickerTotal] = useState(0);
    const [pickerPage, setPickerPage] = useState(0);
    const [pickerSubject, setPickerSubject] = useState("");
    const [pickerType, setPickerType] = useState("");
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerSearchInput, setPickerSearchInput] = useState("");
    const [pickerLoading, setPickerLoading] = useState(false);

    // ─── Subjects list ──────────────────────────────────────────────
    const [subjects, setSubjects] = useState<SubjectInfo[]>([]);

    // ─── Submission ─────────────────────────────────────────────────
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // ─── Auto-slug ──────────────────────────────────────────────────
    useEffect(() => {
        if (!slugManual) {
            setSlug(slugify(name));
        }
    }, [name, slugManual]);

    // ─── Fetch subjects ─────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/subjects");
                const data = await res.json();
                if (res.ok && data.subjects) {
                    setSubjects(data.subjects);
                }
            } catch {
                // non-critical
            }
        })();
    }, []);

    // ─── Fetch questions for picker ─────────────────────────────────
    const fetchPickerQuestions = useCallback(async () => {
        setPickerLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("limit", String(PICKER_PAGE_SIZE));
            params.set("offset", String(pickerPage * PICKER_PAGE_SIZE));
            if (pickerSubject) params.set("subject_id", pickerSubject);
            if (pickerType) params.set("question_type", pickerType);
            if (pickerSearch) params.set("search", pickerSearch);

            const res = await fetch(
                `/api/admin/questions?${params.toString()}`
            );
            const data = await res.json();

            if (res.ok) {
                setPickerQuestions(data.questions || []);
                setPickerTotal(data.total || 0);
            }
        } catch {
            // toast-worthy but non-blocking
        } finally {
            setPickerLoading(false);
        }
    }, [pickerPage, pickerSubject, pickerType, pickerSearch]);

    useEffect(() => {
        fetchPickerQuestions();
    }, [fetchPickerQuestions]);

    const pickerTotalPages = Math.ceil(pickerTotal / PICKER_PAGE_SIZE);

    // ─── Question selection helpers ─────────────────────────────────
    const addQuestion = (q: Question) => {
        if (!selectedIds.has(q.id)) {
            setSelectedQuestions((prev) => [...prev, q]);
        }
    };

    const removeQuestion = (id: string) => {
        setSelectedQuestions((prev) => prev.filter((q) => q.id !== id));
    };

    const showGroupByExtract = useMemo(
        () => hasReadingPassageQuestions(selectedQuestions),
        [selectedQuestions],
    );

    const groupByPassage = () => {
        setSelectedQuestions((prev) => sortQuestionsByPassage(prev));
    };

    // ─── Submit ─────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setSubmitError(null);

        if (!name.trim()) {
            setSubmitError("Test name is required.");
            return;
        }
        if (!slug.trim()) {
            setSubmitError("Slug is required.");
            return;
        }
        if (selectedQuestions.length === 0) {
            setSubmitError("Add at least one question.");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/api/admin/custom-tests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    slug: slug.trim(),
                    description: description.trim() || undefined,
                    visibility,
                    duration_mins: durationMins,
                    is_active: isActive,
                    question_ids: selectedQuestions.map((q) => q.id),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create test");
            }

            router.push("/dashboard/custom-tests");
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : "Something went wrong"
            );
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/custom-tests"
                            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-zinc-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold text-zinc-900">
                                Create Custom Test
                            </h1>
                            <p className="text-sm text-zinc-500">
                                Configure test details and pick questions
                            </p>
                        </div>
                    </div>

                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        {submitting ? "Creating…" : "Create Test"}
                    </Button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
                {submitError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                        {submitError}
                    </div>
                )}

                {/* ─── Test Details ─────────────────────────────────── */}
                <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-zinc-900">
                        Test Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="name">Test Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Week 1 – Reading Comprehension"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="slug">
                                Slug *{" "}
                                <span className="text-zinc-400 font-normal text-xs">
                                    (auto-generated)
                                </span>
                            </Label>
                            <Input
                                id="slug"
                                placeholder="week-1-reading-comprehension"
                                value={slug}
                                onChange={(e) => {
                                    setSlugManual(true);
                                    setSlug(e.target.value);
                                }}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="visibility">Visibility *</Label>
                            <Select
                                value={visibility}
                                onValueChange={setVisibility}
                            >
                                <SelectTrigger id="visibility">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {VISIBILITY_OPTIONS.map((o) => (
                                        <SelectItem
                                            key={o.value}
                                            value={o.value}
                                        >
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="duration">Duration (minutes) *</Label>
                            <Input
                                id="duration"
                                type="number"
                                min={1}
                                max={300}
                                value={durationMins}
                                onChange={(e) =>
                                    setDurationMins(
                                        parseInt(e.target.value, 10) || 60
                                    )
                                }
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="description">
                                Description{" "}
                                <span className="text-zinc-400 font-normal text-xs">
                                    (optional)
                                </span>
                            </Label>
                            <Input
                                id="description"
                                placeholder="Brief description…"
                                value={description}
                                onChange={(e) =>
                                    setDescription(e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Publish immediately (mark as active)
                    </label>
                </section>

                {/* ─── Selected Questions ───────────────────────────── */}
                <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-900">
                            Selected Questions
                        </h2>
                        <div className="flex items-center gap-2">
                            {showGroupByExtract && selectedQuestions.length > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={groupByPassage}
                                    className="h-8 text-xs gap-1"
                                >
                                    <ArrowUpDown className="h-3 w-3" />
                                    Group by extract
                                </Button>
                            )}
                            <span className="text-sm text-zinc-500">
                                {selectedQuestions.length} question
                                {selectedQuestions.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>

                    {selectedQuestions.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-8">
                            No questions added yet. Use the picker below to add
                            questions.
                        </p>
                    ) : (
                        <SortableQuestionList
                            items={selectedQuestions}
                            onReorder={setSelectedQuestions}
                            onRemove={removeQuestion}
                            renderDetails={(q) => (
                                <>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-mono text-zinc-500">
                                            {q.code}
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px]"
                                        >
                                            {typeLabel(q.question_type)}
                                        </Badge>
                                        <span
                                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${difficultyColor(q.difficulty)}`}
                                        >
                                            {q.difficulty}
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            {q.subjects?.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-0.5 truncate">
                                        {questionPreview(q.content)}
                                    </p>
                                </>
                            )}
                        />
                    )}
                </section>

                {/* ─── Question Picker ──────────────────────────────── */}
                <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-zinc-900">
                        Question Picker
                    </h2>

                    {/* Picker filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Select
                            value={pickerSubject}
                            onValueChange={(v) => {
                                setPickerSubject(v === "all" ? "" : v);
                                setPickerPage(0);
                            }}
                        >
                            <SelectTrigger>
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

                        <Select
                            value={pickerType}
                            onValueChange={(v) => {
                                setPickerType(v === "all" ? "" : v);
                                setPickerPage(0);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {QUESTION_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Search code…"
                                value={pickerSearchInput}
                                onChange={(e) =>
                                    setPickerSearchInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        setPickerSearch(
                                            pickerSearchInput.trim()
                                        );
                                        setPickerPage(0);
                                    }
                                }}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={() => {
                                    setPickerSearch(
                                        pickerSearchInput.trim()
                                    );
                                    setPickerPage(0);
                                }}
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Picker results */}
                    {pickerLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                        </div>
                    ) : pickerQuestions.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-8">
                            No questions found.
                        </p>
                    ) : (
                        <div className="space-y-1.5">
                            <p className="text-xs text-zinc-500 mb-2">
                                Showing {pickerQuestions.length} of{" "}
                                {pickerTotal}
                            </p>
                            {pickerQuestions.map((q) => {
                                const isSelected = selectedIds.has(q.id);
                                return (
                                    <div
                                        key={q.id}
                                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                                            isSelected
                                                ? "border-emerald-300 bg-emerald-50/50"
                                                : "border-slate-200/70 bg-white hover:bg-zinc-50"
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-mono text-zinc-500">
                                                    {q.code}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px]"
                                                >
                                                    {typeLabel(
                                                        q.question_type
                                                    )}
                                                </Badge>
                                                <span
                                                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${difficultyColor(q.difficulty)}`}
                                                >
                                                    {q.difficulty}
                                                </span>
                                                <span className="text-[10px] text-zinc-400">
                                                    {q.subjects?.name}
                                                </span>
                                                <span className="text-[10px] text-zinc-400">
                                                    {q.marks} mk
                                                    {q.marks !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-600 mt-0.5 truncate">
                                                {questionPreview(q.content)}
                                            </p>
                                        </div>

                                        {isSelected ? (
                                            <Badge className="bg-emerald-600 text-[10px]">
                                                Added
                                            </Badge>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0 text-xs"
                                                onClick={() => addQuestion(q)}
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Add
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Picker pagination */}
                    {pickerTotalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pickerPage === 0}
                                onClick={() =>
                                    setPickerPage((p) => Math.max(0, p - 1))
                                }
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Prev
                            </Button>

                            <span className="text-xs text-zinc-500 px-2">
                                Page {pickerPage + 1} of {pickerTotalPages}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pickerPage >= pickerTotalPages - 1}
                                onClick={() =>
                                    setPickerPage((p) =>
                                        Math.min(pickerTotalPages - 1, p + 1)
                                    )
                                }
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
