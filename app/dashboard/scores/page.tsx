"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    Eye,
    Loader2,
    FileText,
    ChevronLeft,
    ChevronRight,
    Trophy,
    TrendingUp,
    BarChart3,
    Calendar,
    Target,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Test } from "@/types/test";

const ITEMS_PER_PAGE = 8;

interface Subject {
    id: string;
    name: string;
    slug: string;
}

// ============================================
// MINI SCORE RING
// ============================================
function ScoreRing({
    percentage,
    size = 44,
}: {
    percentage: number;
    size?: number;
}) {
    const r = (size - 6) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (percentage / 100) * circumference;
    const color =
        percentage >= 70 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";

    return (
        <div
            className="relative shrink-0"
            style={{ width: size, height: size }}
        >
            <svg
                className="-rotate-90"
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-700">
                {Math.round(percentage)}
            </span>
        </div>
    );
}

export default function ScoresPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialPage = parseInt(searchParams.get("page") || "1", 10);
    const initialSubject = searchParams.get("subject") || "all";

    const [tests, setTests] = useState<Test[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [selectedSubject, setSelectedSubject] = useState(initialSubject);

    // Aggregate stats from all fetched tests
    const [allStats, setAllStats] = useState<{
        avg: number;
        best: number;
        totalTime: number;
    }>({ avg: 0, best: 0, totalTime: 0 });

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

    // Fetch a lightweight summary of all completed tests for stats
    const fetchStats = useCallback(async (subjectId?: string) => {
        try {
            let url = `/api/tests?status=submitted,ended_early&limit=200&offset=0`;
            if (subjectId && subjectId !== "all") {
                url += `&subject_id=${subjectId}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                const all: Test[] = data.tests || [];
                if (all.length > 0) {
                    const avg =
                        all.reduce((s, t) => s + (t.percentage || 0), 0) /
                        all.length;
                    const best = Math.max(...all.map((t) => t.percentage || 0));
                    const totalTime = all.reduce(
                        (s, t) => s + (t.time_spent_secs || 0),
                        0,
                    );
                    setAllStats({
                        avg: Math.round(avg),
                        best: Math.round(best),
                        totalTime,
                    });
                } else {
                    setAllStats({ avg: 0, best: 0, totalTime: 0 });
                }
            }
        } catch {
            // Silent fail
        }
    }, []);

    const fetchTests = useCallback(async (page: number, subjectId?: string) => {
        setLoading(true);
        try {
            const offset = (page - 1) * ITEMS_PER_PAGE;
            let url = `/api/tests?status=submitted,ended_early&limit=${ITEMS_PER_PAGE}&offset=${offset}`;
            if (subjectId && subjectId !== "all") {
                url += `&subject_id=${subjectId}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setTests(data.tests || []);
                setTotal(data.total || 0);
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSubjects = useCallback(async () => {
        try {
            const res = await fetch("/api/subjects");
            if (res.ok) {
                const data = await res.json();
                setSubjects(data.subjects || []);
            }
        } catch {
            // Silent fail
        }
    }, []);

    useEffect(() => {
        fetchSubjects();
    }, [fetchSubjects]);

    useEffect(() => {
        fetchTests(currentPage, selectedSubject);
    }, [currentPage, selectedSubject, fetchTests]);

    useEffect(() => {
        fetchStats(selectedSubject);
    }, [selectedSubject, fetchStats]);

    // Update URL when page or subject changes
    useEffect(() => {
        const params = new URLSearchParams();
        if (currentPage > 1) params.set("page", String(currentPage));
        if (selectedSubject !== "all") params.set("subject", selectedSubject);
        const queryString = params.toString();
        const newUrl = queryString
            ? `/dashboard/scores?${queryString}`
            : "/dashboard/scores";
        window.history.replaceState(null, "", newUrl);
    }, [currentPage, selectedSubject]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleSubjectChange = (value: string) => {
        setSelectedSubject(value);
        setCurrentPage(1);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = (secs: number | null) => {
        if (!secs) return "--";
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins}:${String(s).padStart(2, "0")}`;
    };

    const formatTotalTime = (secs: number) => {
        if (!secs) return "0m";
        const hours = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const getAccentColor = (percentage: number) => {
        if (percentage >= 70) return "border-l-green-500";
        if (percentage >= 50) return "border-l-amber-500";
        return "border-l-red-400";
    };

    const getScoreBadgeClasses = (percentage: number) => {
        if (percentage >= 70)
            return "bg-green-50 text-green-700 border-green-200";
        if (percentage >= 50)
            return "bg-amber-50 text-amber-700 border-amber-200";
        return "bg-red-50 text-red-700 border-red-200";
    };

    // Generate page numbers
    const getPageNumbers = () => {
        const pages: (number | "...")[] = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push("...");
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push("...");
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="min-h-screen bg-[#e8eef3]">
            {/* ============================================
                HEADER
            ============================================ */}
            <header className="bg-[#1a2744]">
                <div className="max-w-6xl mx-auto p-4 sm:px-6 py-6 pb-16">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-6"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Dashboard
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">
                                Score History
                            </h1>
                            <p className="text-sm text-white/50">
                                {total} {total === 1 ? "test" : "tests"}{" "}
                                completed
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6">
                {/* ============================================
                    STAT CARDS
                ============================================ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 ">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                Tests
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-[#1a2744] tabular-nums">
                            {total}
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                Avg Score
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-[#1a2744] tabular-nums">
                            {allStats.avg}
                            <span className="text-sm font-normal text-slate-400">
                                %
                            </span>
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                Best
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-[#1a2744] tabular-nums">
                            {allStats.best}
                            <span className="text-sm font-normal text-slate-400">
                                %
                            </span>
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                Total Time
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-[#1a2744] tabular-nums">
                            {formatTotalTime(allStats.totalTime)}
                        </p>
                    </div>
                </div>

                {/* ============================================
                    FILTER BAR
                ============================================ */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-slate-500">
                        {selectedSubject !== "all"
                            ? subjects.find((s) => s.id === selectedSubject)
                                  ?.name || "Filtered"
                            : "All subjects"}
                    </p>
                    <Select
                        value={selectedSubject}
                        onValueChange={handleSubjectChange}
                    >
                        <SelectTrigger className="w-[170px] bg-white border-slate-200 text-sm h-9">
                            <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Subjects</SelectItem>
                            {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* ============================================
                    TEST LIST
                ============================================ */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-7 w-7 animate-spin text-[#1a2744]/40 mb-3" />
                        <p className="text-sm text-slate-400">
                            Loading scores...
                        </p>
                    </div>
                ) : tests.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-20 text-center">
                        <div className="w-14 h-14 mx-auto rounded-full bg-slate-50 flex items-center justify-center mb-4">
                            <FileText className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-slate-600 font-medium mb-1">
                            No tests found
                        </p>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto">
                            {selectedSubject !== "all"
                                ? "No results for this subject. Try a different filter."
                                : "Complete your first practice test to see your scores here."}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-6 border-slate-200"
                            onClick={() => router.push("/dashboard/tests")}
                        >
                            Take a Test
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-2.5">
                            {tests.map((test) => {
                                const pct = test.percentage || 0;
                                const correct =
                                    test.answers?.filter((a) => a.is_correct)
                                        .length || 0;
                                const totalQ = test.questions_order.length;

                                return (
                                    <div
                                        key={test.id}
                                        className={`bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden border-l-[3px] ${getAccentColor(pct)}`}
                                    >
                                        {/* Desktop */}
                                        <div className="hidden md:flex items-center gap-5 px-5 py-4">
                                            {/* Score ring */}
                                            <ScoreRing percentage={pct} />

                                            {/* Subject + date */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-[#1a2744] truncate">
                                                    {test.subject?.name ||
                                                        "Test"}
                                                </p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <Calendar className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs text-slate-400">
                                                        {formatDate(
                                                            test.created_at,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Accuracy */}
                                            <div className="text-center w-24">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Target className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {correct}/{totalQ}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Correct
                                                </p>
                                            </div>

                                            {/* Marks */}
                                            <div className="text-center w-24">
                                                <div className="flex items-center justify-center gap-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {test.marks_obtained}/
                                                        {test.total_marks}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Marks
                                                </p>
                                            </div>

                                            {/* Time */}
                                            <div className="text-center w-20">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {formatTime(
                                                            test.time_spent_secs,
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Time
                                                </p>
                                            </div>

                                            {/* Score badge */}
                                            <Badge
                                                variant="outline"
                                                className={`text-xs font-bold px-2.5 py-1 ${getScoreBadgeClasses(pct)}`}
                                            >
                                                {Math.round(pct)}%
                                            </Badge>

                                            {/* Review */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/tests/${test.id}/review`,
                                                    )
                                                }
                                                className="text-[#1a2744] hover:bg-[#1a2744]/5 gap-1.5"
                                            >
                                                <Eye className="h-4 w-4" />
                                                <span className="text-xs">
                                                    Review
                                                </span>
                                            </Button>
                                        </div>

                                        {/* Mobile */}
                                        <div className="md:hidden p-4">
                                            <div className="flex items-start gap-3">
                                                <ScoreRing
                                                    percentage={pct}
                                                    size={40}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="font-semibold text-[#1a2744] text-sm truncate">
                                                            {test.subject
                                                                ?.name ||
                                                                "Test"}
                                                        </p>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs font-bold shrink-0 ml-2 ${getScoreBadgeClasses(pct)}`}
                                                        >
                                                            {Math.round(pct)}%
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            {
                                                                test.marks_obtained
                                                            }
                                                            /{test.total_marks}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatTime(
                                                                test.time_spent_secs,
                                                            )}
                                                        </span>
                                                        <span>
                                                            {formatDate(
                                                                test.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/tests/${test.id}/review`,
                                                        )
                                                    }
                                                    className="text-[#1a2744] text-xs gap-1 h-7"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Review
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ============================================
                            PAGINATION
                        ============================================ */}
                        {totalPages > 1 && (
                            <div className="mt-8 mb-4">
                                <div className="flex items-center justify-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            handlePageChange(currentPage - 1)
                                        }
                                        disabled={currentPage === 1}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    {getPageNumbers().map((page, idx) =>
                                        page === "..." ? (
                                            <span
                                                key={`ellipsis-${idx}`}
                                                className="w-8 text-center text-slate-400 text-sm"
                                            >
                                                ...
                                            </span>
                                        ) : (
                                            <Button
                                                key={page}
                                                variant={
                                                    currentPage === page
                                                        ? "default"
                                                        : "ghost"
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    handlePageChange(page)
                                                }
                                                className={`h-8 w-8 p-0 text-sm ${
                                                    currentPage === page
                                                        ? "bg-[#1a2744] hover:bg-[#1a2744]/90 text-white"
                                                        : "text-slate-600"
                                                }`}
                                            >
                                                {page}
                                            </Button>
                                        ),
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            handlePageChange(currentPage + 1)
                                        }
                                        disabled={currentPage === totalPages}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>

                                <p className="text-center text-xs text-slate-400 mt-2">
                                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                                    &ndash;
                                    {Math.min(
                                        currentPage * ITEMS_PER_PAGE,
                                        total,
                                    )}{" "}
                                    of {total}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
