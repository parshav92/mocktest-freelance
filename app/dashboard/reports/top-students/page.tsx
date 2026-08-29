"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import {
    ReportPageShell,
    ReportStatCard,
} from "@/components/admin/report-page-shell";

interface TopStudent {
    student_id: string;
    student_name: string;
    student_code: string;
    avg_score: number;
    tests_taken: number;
    current_week_avg: number | null;
    prev_week_avg: number | null;
    weekly_change: number | null;
    rank: number;
}

interface SubjectResult {
    subject_id: string;
    subject_name: string;
    subject_slug: string;
    top_students: TopStudent[];
}

interface ReportData {
    results: SubjectResult[];
    sort_by: string;
}

function WeeklyMovement({ change }: { change: number | null }) {
    if (change === null)
        return <span className="text-slate-300 text-xs">—</span>;
    if (change > 0)
        return (
            <span className="inline-flex items-center gap-0.5 text-xs text-emerald-700 font-medium">
                <TrendingUp className="h-3.5 w-3.5" />+{Math.round(change)}%
            </span>
        );
    if (change < 0)
        return (
            <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-medium">
                <TrendingDown className="h-3.5 w-3.5" />
                {Math.round(change)}%
            </span>
        );
    return (
        <span className="inline-flex items-center gap-0.5 text-xs text-slate-500">
            <Minus className="h-3.5 w-3.5" />
            No change
        </span>
    );
}

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1)
        return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                1
            </span>
        );
    if (rank === 2)
        return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                2
            </span>
        );
    if (rank === 3)
        return (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-800 text-xs font-bold">
                3
            </span>
        );
    return (
        <span className="text-sm text-slate-400 tabular-nums w-7 text-center inline-block">
            {rank}
        </span>
    );
}

export default function TopStudentsPage() {
    const [sortBy, setSortBy] = useState("avg_score");
    const [limit, setLimit] = useState("10");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ReportData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ sortBy, limit });
            const res = await fetch(
                `/api/admin/reports/top-students?${params.toString()}`,
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setError(body.error ?? "Failed to load data");
                return;
            }
            const json: ReportData = await res.json();
            setData(json);
            if (json.results.length > 0) {
                setExpandedSubject(json.results[0].subject_id);
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }, [sortBy, limit]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const totalStudents = data?.results.reduce(
        (sum, s) => sum + s.top_students.length,
        0,
    );

    return (
        <ReportPageShell
            badge="Admin · Reports"
            title="Top Students"
            description="Leaderboards by subject with average scores and weekly movement."
        >
            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                    <option value="avg_score">Sort by average score</option>
                    <option value="weekly_change">Sort by weekly improvement</option>
                </select>
                <select
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                    <option value="5">Top 5 per subject</option>
                    <option value="10">Top 10 per subject</option>
                    <option value="20">Top 20 per subject</option>
                    <option value="50">Top 50 per subject</option>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <ReportStatCard
                            label="Subjects"
                            value={data.results.length}
                        />
                        <ReportStatCard
                            label="Students ranked"
                            value={totalStudents ?? 0}
                            tone="info"
                        />
                        <ReportStatCard
                            label="Sort mode"
                            value={
                                sortBy === "avg_score"
                                    ? "Avg score"
                                    : "Weekly Δ"
                            }
                        />
                    </div>

                    <div className="space-y-4">
                        {data.results.map((subject) => {
                            const top3 = subject.top_students.slice(0, 3);
                            const isOpen =
                                expandedSubject === subject.subject_id;

                            return (
                                <div
                                    key={subject.subject_id}
                                    className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm"
                                >
                                    <button
                                        type="button"
                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/80 transition-colors text-left"
                                        onClick={() =>
                                            setExpandedSubject(
                                                isOpen
                                                    ? null
                                                    : subject.subject_id,
                                            )
                                        }
                                    >
                                        <div className="flex items-center gap-3">
                                            <Trophy className="h-4 w-4 text-amber-500" />
                                            <span className="font-semibold text-slate-800">
                                                {subject.subject_name}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {subject.top_students.length}{" "}
                                                students
                                            </span>
                                        </div>
                                        <span className="text-slate-400 text-sm">
                                            {isOpen ? "▲" : "▼"}
                                        </span>
                                    </button>

                                    {top3.length > 0 && (
                                        <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100">
                                            {top3.map((stu) => (
                                                <div
                                                    key={stu.student_id}
                                                    className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <RankBadge rank={stu.rank} />
                                                        <Link
                                                            href={`/dashboard/students/${stu.student_id}/report?studentId=${stu.student_id}&name=${encodeURIComponent(stu.student_name)}`}
                                                            className="font-medium text-slate-800 hover:text-emerald-700 truncate text-sm"
                                                        >
                                                            {stu.student_name}
                                                        </Link>
                                                    </div>
                                                    <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                                        {stu.avg_score}%
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {stu.tests_taken} tests ·{" "}
                                                        <WeeklyMovement
                                                            change={
                                                                stu.weekly_change
                                                            }
                                                        />
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {isOpen && (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-100">
                                                    <tr>
                                                        <th className="text-center py-2.5 px-4 font-medium text-slate-500 w-12">
                                                            Rank
                                                        </th>
                                                        <th className="text-left py-2.5 px-4 font-medium text-slate-600">
                                                            Student
                                                        </th>
                                                        <th className="text-right py-2.5 px-4 font-medium text-slate-600">
                                                            Avg
                                                        </th>
                                                        <th className="text-right py-2.5 px-4 font-medium text-slate-600">
                                                            Tests
                                                        </th>
                                                        <th className="text-right py-2.5 px-4 font-medium text-slate-600">
                                                            This week
                                                        </th>
                                                        <th className="text-right py-2.5 px-4 font-medium text-slate-600">
                                                            Last week
                                                        </th>
                                                        <th className="text-right py-2.5 px-4 font-medium text-slate-600">
                                                            Movement
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subject.top_students.map(
                                                        (stu) => (
                                                            <tr
                                                                key={
                                                                    stu.student_id
                                                                }
                                                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                                                            >
                                                                <td className="py-3 px-4 text-center">
                                                                    <RankBadge
                                                                        rank={
                                                                            stu.rank
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    <Link
                                                                        href={`/dashboard/students/${stu.student_id}/report?studentId=${stu.student_id}&name=${encodeURIComponent(stu.student_name)}`}
                                                                        className="font-medium text-slate-800 hover:text-emerald-700"
                                                                    >
                                                                        {
                                                                            stu.student_name
                                                                        }
                                                                    </Link>
                                                                    <p className="text-xs text-slate-400">
                                                                        {
                                                                            stu.student_code
                                                                        }
                                                                    </p>
                                                                </td>
                                                                <td className="py-3 px-4 text-right font-semibold tabular-nums">
                                                                    {stu.avg_score}%
                                                                </td>
                                                                <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                                                                    {
                                                                        stu.tests_taken
                                                                    }
                                                                </td>
                                                                <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                                                                    {stu.current_week_avg !==
                                                                    null
                                                                        ? `${stu.current_week_avg}%`
                                                                        : "—"}
                                                                </td>
                                                                <td className="py-3 px-4 text-right tabular-nums text-slate-500">
                                                                    {stu.prev_week_avg !==
                                                                    null
                                                                        ? `${stu.prev_week_avg}%`
                                                                        : "—"}
                                                                </td>
                                                                <td className="py-3 px-4 text-right">
                                                                    <WeeklyMovement
                                                                        change={
                                                                            stu.weekly_change
                                                                        }
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {data.results.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
                                No ranking data available yet.
                            </div>
                        )}
                    </div>
                </>
            ) : null}
        </ReportPageShell>
    );
}
