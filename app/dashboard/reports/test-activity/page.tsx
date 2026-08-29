"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
    ReportPageShell,
    ReportStatCard,
} from "@/components/admin/report-page-shell";

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

export default function TestActivityPage() {
    const [limit, setLimit] = useState("20");
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

    const totalTests =
        data?.students.reduce((sum, s) => sum + s.total_tests, 0) ?? 0;
    const activeStudents =
        data?.students.filter((s) => s.is_active).length ?? 0;

    return (
        <ReportPageShell
            badge="Admin · Reports"
            title="Test Activity"
            description="Students with the highest test volume and per-subject breakdown."
        >
            <div className="flex items-center gap-3">
                <select
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                    <option value="10">Top 10 students</option>
                    <option value="20">Top 20 students</option>
                    <option value="50">Top 50 students</option>
                    <option value="100">Top 100 students</option>
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            ) : data ? (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <ReportStatCard
                            label="Students shown"
                            value={data.students.length}
                        />
                        <ReportStatCard
                            label="Total tests"
                            value={totalTests}
                            tone="info"
                        />
                        <ReportStatCard
                            label="Active accounts"
                            value={activeStudents}
                            tone="success"
                        />
                        <ReportStatCard
                            label="Avg tests / student"
                            value={
                                data.students.length
                                    ? Math.round(
                                          totalTests / data.students.length,
                                      )
                                    : 0
                            }
                        />
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-center py-3 px-4 font-medium text-slate-500 w-12">
                                            #
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-slate-600">
                                            Student
                                        </th>
                                        <th className="text-center py-3 px-4 font-medium text-slate-600">
                                            Status
                                        </th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">
                                            Tests
                                        </th>
                                        <th className="text-center py-3 px-4 font-medium text-slate-600 w-28">
                                            Details
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.students.map((stu) => {
                                        const isOpen = expanded.has(
                                            stu.student_id,
                                        );
                                        const maxSubject = Math.max(
                                            ...stu.subject_breakdown.map(
                                                (s) => s.tests_count,
                                            ),
                                            1,
                                        );

                                        return (
                                            <Fragment key={stu.student_id}>
                                                <tr
                                                    className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                                                    onClick={() =>
                                                        toggleExpand(
                                                            stu.student_id,
                                                        )
                                                    }
                                                >
                                                    <td className="py-3 px-4 text-center font-medium text-slate-500 tabular-nums">
                                                        {stu.rank}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Link
                                                            href={`/dashboard/students/${stu.student_id}/report?studentId=${stu.student_id}&name=${encodeURIComponent(stu.student_name)}`}
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                            className="font-medium text-slate-800 hover:text-emerald-700"
                                                        >
                                                            {stu.student_name}
                                                        </Link>
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
                                                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                                                        {stu.total_tests}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                            {isOpen ? (
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
                                                        </span>
                                                    </td>
                                                </tr>

                                                {isOpen && (
                                                    <tr className="bg-slate-50/80 border-b border-slate-200">
                                                        <td
                                                            colSpan={5}
                                                            className="px-6 py-4"
                                                        >
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {stu.subject_breakdown.map(
                                                                    (sub) => (
                                                                        <div
                                                                            key={
                                                                                sub.subject_id
                                                                            }
                                                                            className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                                                                        >
                                                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                                                <p className="text-xs font-medium text-slate-600 truncate">
                                                                                    {
                                                                                        sub.subject_name
                                                                                    }
                                                                                </p>
                                                                                <p className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                                                                                    {
                                                                                        sub.tests_count
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                                                <div
                                                                                    className="h-full rounded-full bg-emerald-500"
                                                                                    style={{
                                                                                        width: `${(sub.tests_count / maxSubject) * 100}%`,
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                    {data.students.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="py-12 text-center text-slate-400 text-sm"
                                            >
                                                No test activity yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : null}
        </ReportPageShell>
    );
}
