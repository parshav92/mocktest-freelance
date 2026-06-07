"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SubjectBreakdown {
    subject_id: string;
    subject_name: string;
    subject_slug: string;
    tests_count: number;
}

interface StudentActivity {
    rank: number;
    student_id: string;
    student_name: string;
    student_code: string;
    is_active: boolean;
    total_tests: number;
    subject_breakdown: SubjectBreakdown[];
}

interface ReportData {
    students: StudentActivity[];
    total: number;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TestActivityPage() {
    const [limit, setLimit] = useState<string>("20");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ReportData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ limit });
            const res = await fetch(
                `/api/admin/reports/test-activity?${params.toString()}`,
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setError(body.error ?? "Failed to load data");
                return;
            }
            setData(await res.json());
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    function toggleExpand(id: string) {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <div className="px-6 py-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-blue-700 bg-blue-50 text-xs font-bold tracking-wider uppercase border border-blue-200">
                    Admin · Reports
                </span>
                <h1 className="text-3xl font-bold text-zinc-900 mt-3">
                    Test Activity
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">
                    Students with the most test attempts, with per-subject
                    breakdown.
                </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">
                        Show top:
                    </label>
                    <select
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    {error}
                </div>
            ) : data ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-center py-3 px-4 font-medium text-slate-500 w-12">
                                        Rank
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                                        Student
                                    </th>
                                    <th className="text-center py-3 px-4 font-medium text-slate-600">
                                        Status
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-slate-600">
                                        Total Tests
                                    </th>
                                    <th className="text-center py-3 px-4 font-medium text-slate-600">
                                        Subject Breakdown
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.students.map((stu) => (
                                    <>
                                        <tr
                                            key={stu.student_id}
                                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                                            onClick={() =>
                                                toggleExpand(stu.student_id)
                                            }
                                        >
                                            <td className="py-3 px-4 text-center text-slate-500 font-medium tabular-nums">
                                                {stu.rank}
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-medium text-slate-800">
                                                    {stu.student_name}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    {stu.student_code}
                                                </p>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${stu.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                                                >
                                                    {stu.is_active
                                                        ? "Active"
                                                        : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums text-base">
                                                {stu.total_tests}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                                                    {expanded.has(
                                                        stu.student_id,
                                                    ) ? (
                                                        <>
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                            Hide
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                            Show
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded subject breakdown */}
                                        {expanded.has(stu.student_id) && (
                                            <tr
                                                key={`${stu.student_id}-breakdown`}
                                                className="bg-slate-50 border-b border-slate-200"
                                            >
                                                <td colSpan={5} className="px-8 py-3">
                                                    <div className="flex flex-wrap gap-3">
                                                        {stu.subject_breakdown.map(
                                                            (sub) => (
                                                                <div
                                                                    key={
                                                                        sub.subject_id
                                                                    }
                                                                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 min-w-32.5"
                                                                >
                                                                    <p className="text-xs text-slate-500">
                                                                        {sub.subject_name}
                                                                    </p>
                                                                    <p className="text-lg font-bold text-slate-800 tabular-nums">
                                                                        {sub.tests_count}
                                                                        <span className="text-xs font-normal text-slate-400 ml-1">
                                                                            tests
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                                {data.students.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="py-12 text-center text-slate-400 text-sm"
                                        >
                                            No test data available yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
