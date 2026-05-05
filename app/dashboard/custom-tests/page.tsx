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
    Plus,
    Filter,
    X,
    ClipboardList,
    Pencil,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────
interface CustomTestSummary {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    visibility: string;
    duration_mins: number;
    is_active: boolean;
    display_order: number;
    available_from: string | null;
    available_until: string | null;
    question_count: number;
    created_at: string;
}

interface FetchResponse {
    tests: CustomTestSummary[];
    total: number;
    limit: number;
    offset: number;
}

// ─── Constants ──────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

const VISIBILITY_OPTIONS = [
    { value: "admin_only", label: "Admin Only" },
    { value: "subscribers_only", label: "Subscribers Only" },
    { value: "free_trial", label: "Free Trial" },
];

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
    return VISIBILITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

// ─── Component ──────────────────────────────────────────────────────────
export default function AdminCustomTestsPage() {
    const [tests, setTests] = useState<CustomTestSummary[]>([]);
    const [total, setTotal] = useState(0);

    // Filters
    const [visibility, setVisibility] = useState("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");

    // Pagination
    const [page, setPage] = useState(0);

    // Loading / Error
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ─── Fetch ──────────────────────────────────────────────────────────
    const fetchTests = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));
            if (visibility) params.set("visibility", visibility);
            if (search) params.set("search", search);

            const res = await fetch(
                `/api/admin/custom-tests?${params.toString()}`
            );
            const data: FetchResponse = await res.json();

            if (!res.ok) {
                throw new Error(
                    (data as unknown as { error: string }).error ||
                        "Failed to fetch custom tests"
                );
            }

            setTests(data.tests);
            setTotal(data.total);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load custom tests"
            );
        } finally {
            setIsLoading(false);
        }
    }, [page, visibility, search]);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const hasFilters = !!(visibility || search);

    const clearFilters = () => {
        setVisibility("");
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
                                Custom Tests
                            </h1>
                            <p className="text-sm text-zinc-500">
                                Create and manage hand-picked tests
                            </p>
                        </div>
                    </div>

                    <Link href="/dashboard/custom-tests/create">
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Test
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                {/* Filters */}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                            value={visibility}
                            onValueChange={(v) => {
                                setVisibility(v === "all" ? "" : v);
                                setPage(0);
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="All Visibilities" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Visibilities
                                </SelectItem>
                                {VISIBILITY_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Search name or slug…"
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

                {/* Stats bar */}
                <div className="flex items-center justify-between text-sm text-zinc-500">
                    <span>
                        {isLoading
                            ? "Loading…"
                            : `${total} test${total !== 1 ? "s" : ""} found`}
                    </span>
                    {totalPages > 1 && (
                        <span>
                            Page {page + 1} of {totalPages}
                        </span>
                    )}
                </div>

                {/* Content */}
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
                            onClick={fetchTests}
                        >
                            Retry
                        </Button>
                    </div>
                ) : tests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                        <ClipboardList className="h-10 w-10 mx-auto text-zinc-300 mb-3" />
                        <p className="text-zinc-500 text-sm">
                            {hasFilters
                                ? "No tests match the current filters."
                                : "No custom tests created yet."}
                        </p>
                        {!hasFilters && (
                            <Link href="/dashboard/custom-tests/create">
                                <Button
                                    size="sm"
                                    className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create your first test
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tests.map((t) => (
                            <div
                                key={t.id}
                                className="rounded-2xl border border-slate-200/70 bg-white hover:shadow-sm transition-shadow"
                            >
                                {/* Meta bar */}
                                <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-2">
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${visibilityColor(t.visibility)}`}
                                    >
                                        {visibilityLabel(t.visibility)}
                                    </span>
                                    {t.is_active ? (
                                        <Badge
                                            variant="default"
                                            className="text-[11px] bg-emerald-600"
                                        >
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="secondary"
                                            className="text-[11px]"
                                        >
                                            Draft
                                        </Badge>
                                    )}
                                    <span className="text-xs text-zinc-400 ml-auto">
                                        {formatDate(t.created_at)}
                                    </span>

                                    {/* Edit button */}
                                    <Link
                                        href={`/dashboard/custom-tests/${t.id}/edit`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    </Link>
                                </div>

                                {/* Clickable body */}
                                <Link
                                    href={`/dashboard/custom-tests/${t.id}`}
                                    className="block"
                                >
                                    {/* Title + description */}
                                    <div className="px-5 pb-2">
                                        <p className="text-sm font-semibold text-zinc-900">
                                            {t.name}
                                        </p>
                                        {t.description && (
                                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                                                {t.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Stats row */}
                                    <div className="flex flex-wrap items-center gap-4 px-5 pb-4 text-xs text-zinc-500">
                                        <span>
                                            {t.question_count} question
                                            {t.question_count !== 1 ? "s" : ""}
                                        </span>
                                        <span>{t.duration_mins} min</span>
                                        <span className="font-mono text-zinc-400">
                                            /{t.slug}
                                        </span>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
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
