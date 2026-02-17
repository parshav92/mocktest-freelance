"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    ChevronsLeft,
    ChevronsRight,
    Filter,
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

export default function ScoresPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get initial page from URL or default to 1
    const initialPage = parseInt(searchParams.get("page") || "1", 10);
    const initialSubject = searchParams.get("subject") || "all";

    const [tests, setTests] = useState<Test[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [selectedSubject, setSelectedSubject] = useState(initialSubject);

    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

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
        setCurrentPage(1); // Reset to first page when filter changes
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

    const getScoreColor = (percentage: number) => {
        if (percentage >= 70)
            return "border-green-300 text-green-700 bg-green-50";
        if (percentage >= 50)
            return "border-amber-300 text-amber-700 bg-amber-50";
        return "border-red-300 text-red-700 bg-red-50";
    };

    // Generate page numbers to display
    const getPageNumbers = () => {
        const pages: (number | "...")[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible + 2) {
            // Show all pages
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push("...");
            }

            // Show pages around current
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push("...");
            }

            // Always show last page
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="min-h-screen bg-[#e8eef3] font-[family-name:var(--font-inter)]">
            {/* Header */}
            <header className="bg-[#1a2744] text-white">
                <div className="container mx-auto px-4 py-4">
                    <button
                        onClick={() => router.push("/dashboard")}
                        className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-4">
                {/* Title and filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[#1a2744]">
                            All Scores
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {total} {total === 1 ? "test" : "tests"} completed
                        </p>
                    </div>

                    {/* Subject filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <Select
                            value={selectedSubject}
                            onValueChange={handleSubjectChange}
                        >
                            <SelectTrigger className="w-[180px] bg-white">
                                <SelectValue placeholder="All Subjects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Subjects
                                </SelectItem>
                                {subjects.map((subject) => (
                                    <SelectItem
                                        key={subject.id}
                                        value={subject.id}
                                    >
                                        {subject.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tests list */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : tests.length === 0 ? (
                    <Card className="bg-white">
                        <CardContent className="py-16 text-center">
                            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">No tests found</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {selectedSubject !== "all"
                                    ? "Try selecting a different subject"
                                    : "Complete your first test to see your scores here"}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="hidden md:grid md:grid-cols-[1fr_100px_100px_100px_80px] gap-4 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <span>Test</span>
                            <span className="text-center">Score</span>
                            <span className="text-center">Marks</span>
                            <span className="text-center">Time</span>
                            <span></span>
                        </div>

                        {/* Tests */}
                        <div className="flex flex-col gap-2">
                            {tests.map((test) => (
                                <Card
                                    key={test.id}
                                    className="bg-white hover:shadow-md transition-shadow"
                                >
                                    <CardContent className="p-4">
                                        {/* Desktop layout */}
                                        <div className="hidden md:grid md:grid-cols-[1fr_100px_100px_100px_80px] gap-4 items-center">
                                            <div>
                                                <span className="font-medium text-[#1a2744]">
                                                    {test.subject?.name ||
                                                        "Test"}
                                                </span>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {formatDate(
                                                        test.created_at,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-sm font-semibold ${getScoreColor(test.percentage || 0)}`}
                                                >
                                                    {Math.round(
                                                        test.percentage || 0,
                                                    )}
                                                    %
                                                </Badge>
                                            </div>
                                            <div className="text-center text-sm text-gray-600">
                                                {test.marks_obtained}/
                                                {test.total_marks}
                                            </div>
                                            <div className="text-center text-sm text-gray-600">
                                                {formatTime(
                                                    test.time_spent_secs,
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/tests/${test.id}/review`,
                                                        )
                                                    }
                                                    className="text-[#1a2744]"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Mobile layout */}
                                        <div className="md:hidden">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-[#1a2744]">
                                                    {test.subject?.name ||
                                                        "Test"}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-sm font-semibold ${getScoreColor(test.percentage || 0)}`}
                                                >
                                                    {Math.round(
                                                        test.percentage || 0,
                                                    )}
                                                    %
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        {test.marks_obtained}/
                                                        {test.total_marks}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        router.push(
                                                            `/dashboard/tests/${test.id}/review`,
                                                        )
                                                    }
                                                    className="text-[#1a2744]"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-1 mt-8">
                                {/* First page */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePageChange(1)}
                                    disabled={currentPage === 1}
                                    className="h-9 w-9 p-0"
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>

                                {/* Previous page */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        handlePageChange(currentPage - 1)
                                    }
                                    disabled={currentPage === 1}
                                    className="h-9 w-9 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                {/* Page numbers */}
                                <div className="flex items-center gap-1 mx-2">
                                    {getPageNumbers().map((page, idx) =>
                                        page === "..." ? (
                                            <span
                                                key={`ellipsis-${idx}`}
                                                className="w-9 text-center text-gray-400"
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
                                                className={`h-9 w-9 p-0 ${
                                                    currentPage === page
                                                        ? "bg-[#1a2744] hover:bg-[#1a2744]/90"
                                                        : ""
                                                }`}
                                            >
                                                {page}
                                            </Button>
                                        ),
                                    )}
                                </div>

                                {/* Next page */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        handlePageChange(currentPage + 1)
                                    }
                                    disabled={currentPage === totalPages}
                                    className="h-9 w-9 p-0"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>

                                {/* Last page */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePageChange(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="h-9 w-9 p-0"
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* Page info */}
                        {totalPages > 1 && (
                            <p className="text-center text-sm text-gray-400 mt-3">
                                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                                -{Math.min(currentPage * ITEMS_PER_PAGE, total)}{" "}
                                of {total}
                            </p>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
