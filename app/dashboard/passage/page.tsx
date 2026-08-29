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
    BookText,
    Filter,
    X,
    ChevronDown,
    ChevronUp,
    Pencil,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { isPoem } from "@/lib/utils/passage";

// ─── Types ──────────────────────────────────────────────────────────────
interface SubjectInfo {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
}

interface Passage {
    id: string;
    subject_id: string;
    code: string;
    passage_type: "extract" | "poem" | "article";
    title: string | null;
    content: string;
    image_url: string | null;
    created_at: string;
    updated_at: string;
    subjects: SubjectInfo;
}

interface FetchResponse {
    passages: Passage[];
    total: number;
    limit: number;
    offset: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const PASSAGE_TYPES = [
    { value: "extract", label: "Extract" },
    { value: "poem", label: "Poem" },
    { value: "article", label: "Article" },
];

// ─── Helpers ────────────────────────────────────────────────────────────
function typeColor(t: string) {
    switch (t) {
        case "extract":
            return "bg-blue-100 text-blue-700";
        case "poem":
            return "bg-purple-100 text-purple-700";
        case "article":
            return "bg-amber-100 text-amber-700";
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

// ─── Component ──────────────────────────────────────────────────────────
export default function AdminPassagesPage() {
    // Data
    const [passages, setPassages] = useState<Passage[]>([]);
    const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
    const [total, setTotal] = useState(0);

    // Filters
    const [subjectId, setSubjectId] = useState<string>("");
    const [passageType, setPassageType] = useState<string>("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");

    // Pagination
    const [page, setPage] = useState(0);

    // Expanded cards
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Loading / Error
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editPassage, setEditPassage] = useState<Passage | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editType, setEditType] = useState<string>("extract");
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const openEdit = (p: Passage) => {
        setEditPassage(p);
        setEditTitle(p.title ?? "");
        setEditContent(p.content);
        setEditType(p.passage_type);
        setEditError(null);
    };

    const closeEdit = () => {
        setEditPassage(null);
        setEditError(null);
    };

    const saveEdit = async () => {
        if (!editPassage) return;
        setEditSaving(true);
        setEditError(null);
        try {
            const res = await fetch("/api/admin/passage", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editPassage.id,
                    title: editTitle.trim() || null,
                    content: editContent,
                    passage_type: editType,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");

            setPassages((prev) =>
                prev.map((p) =>
                    p.id === editPassage.id ? { ...p, ...data.passage } : p,
                ),
            );
            closeEdit();
        } catch (err) {
            setEditError(
                err instanceof Error ? err.message : "Failed to save changes",
            );
        } finally {
            setEditSaving(false);
        }
    };

    // ─── Toggle expand ──────────────────────────────────────────────────
    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ─── Fetch subjects for the filter dropdown ─────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/subjects");
                const data = await res.json();
                if (res.ok && data.subjects) {
                    setSubjects(
                        data.subjects.map(
                            (s: {
                                id: string;
                                name: string;
                                slug: string;
                                icon: string;
                            }) => ({
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

    // ─── Fetch passages ─────────────────────────────────────────────────
    const fetchPassages = useCallback(async () => {
        if (!subjectId) {
            setPassages([]);
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
            if (subjectId) params.set("subject_id", subjectId);
            if (passageType) params.set("passage_type", passageType);
            if (search) params.set("search", search);

            const res = await fetch(
                `/api/admin/passage?${params.toString()}`
            );
            const data: FetchResponse = await res.json();

            if (!res.ok) {
                throw new Error(
                    (data as unknown as { error: string }).error ||
                        "Failed to fetch passages"
                );
            }

            setPassages(data.passages);
            setTotal(data.total);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load passages"
            );
        } finally {
            setIsLoading(false);
        }
    }, [page, subjectId, passageType, search]);

    useEffect(() => {
        fetchPassages();
    }, [fetchPassages]);

    // ─── Derived ────────────────────────────────────────────────────────
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const hasFilters = !!(passageType || search);

    const clearFilters = () => {
        setPassageType("");
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
            <Dialog open={!!editPassage} onOpenChange={(open) => !open && closeEdit()}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">
                            Edit Passage
                            {editPassage && (
                                <span className="ml-2 text-xs font-mono text-zinc-400">
                                    {editPassage.code}
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Update the passage title, type, and content.
                        </DialogDescription>
                    </DialogHeader>

                    {editPassage && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-600">
                                    Title
                                </label>
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Optional title"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-600">
                                    Type
                                </label>
                                <Select value={editType} onValueChange={setEditType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PASSAGE_TYPES.map((pt) => (
                                            <SelectItem key={pt.value} value={pt.value}>
                                                {pt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-zinc-600">
                                    Content
                                </label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={12}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y whitespace-pre-line"
                                />
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
                            disabled={editSaving || !editContent.trim()}
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
                                Passage Bank
                            </h1>
                            <p className="text-sm text-zinc-500">
                                Browse and filter all passages
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/dashboard/upload"
                        className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                        Upload Passages
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Subject */}
                        <Select
                            value={subjectId || undefined}
                            onValueChange={(v) => {
                                setSubjectId(v);
                                setPage(0);
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

                        {/* Passage type */}
                        <Select
                            value={passageType}
                            onValueChange={(v) => {
                                setPassageType(v === "all" ? "" : v);
                                setPage(0);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {PASSAGE_TYPES.map((pt) => (
                                    <SelectItem
                                        key={pt.value}
                                        value={pt.value}
                                    >
                                        {pt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Code / title search */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search code or title…"
                                value={searchInput}
                                onChange={(e) =>
                                    setSearchInput(e.target.value)
                                }
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
                            : `${total} passage${total !== 1 ? "s" : ""} found`}
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
                            onClick={fetchPassages}
                        >
                            Retry
                        </Button>
                    </div>
                ) : !subjectId ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                        <BookText className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
                        <p className="text-zinc-500 text-sm">
                            Select a subject to view passages.
                        </p>
                    </div>
                ) : passages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                        <BookText className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
                        <p className="text-zinc-500 text-sm">
                            {hasFilters
                                ? "No passages match the current filters."
                                : "No passages found for this subject."}
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
                        {passages.map((p) => {
                            const isExpanded = expandedIds.has(p.id);
                            const contentPreview =
                                p.content.length > 200
                                    ? p.content.slice(0, 200) + "…"
                                    : p.content;

                            return (
                                <div
                                    key={p.id}
                                    className="rounded-2xl border border-slate-200/70 bg-white hover:shadow-sm transition-shadow"
                                >
                                    {/* Meta bar */}
                                    <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-2">
                                        <span className="text-xs font-mono text-zinc-400">
                                            {p.code}
                                        </span>
                                        <span className="text-zinc-300">
                                            ·
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                            {p.subjects?.name ?? "—"}
                                        </span>
                                        <span className="text-zinc-300">
                                            ·
                                        </span>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${typeColor(p.passage_type)}`}
                                        >
                                            {p.passage_type}
                                        </span>
                                        <span className="text-xs text-zinc-400 ml-auto">
                                            {formatDate(p.created_at)}
                                        </span>
                                        <button
                                            title="Edit passage"
                                            onClick={() => openEdit(p)}
                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Title */}
                                    {p.title && (
                                        <div className="px-5 pb-1">
                                            <p className="text-sm font-semibold text-zinc-900">
                                                {p.title}
                                            </p>
                                        </div>
                                    )}

                                    {/* Passage content */}
                                    <div className="px-5 pb-3">
                                        <p
                                            className={`text-sm text-zinc-700 whitespace-pre-line ${
                                                isPoem(p.passage_type) ? "italic" : ""
                                            }`}
                                        >
                                            {isExpanded
                                                ? p.content
                                                : contentPreview}
                                        </p>
                                    </div>

                                    {/* Expand / collapse toggle */}
                                    {p.content.length > 200 && (
                                        <div className="px-5 pb-4">
                                            <button
                                                onClick={() =>
                                                    toggleExpand(p.id)
                                                }
                                                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="h-3.5 w-3.5" />
                                                        Show less
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                        Show full passage
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {/* Image indicator */}
                                    {p.image_url && (
                                        <div className="px-5 pb-4">
                                            <Badge
                                                variant="outline"
                                                className="text-[11px]"
                                            >
                                                📷 Has image
                                            </Badge>
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
                            onClick={() =>
                                setPage((p) => Math.max(0, p - 1))
                            }
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>

                        {/* page numbers (show up to 5) */}
                        {Array.from(
                            { length: Math.min(totalPages, 5) },
                            (_, i) => {
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
                                        variant={
                                            pageNum === page
                                                ? "default"
                                                : "outline"
                                        }
                                        size="sm"
                                        className="w-9"
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum + 1}
                                    </Button>
                                );
                            }
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages - 1}
                            onClick={() =>
                                setPage((p) =>
                                    Math.min(totalPages - 1, p + 1)
                                )
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
