"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

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
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                1
            </span>
        );
    if (rank === 2)
        return (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
                2
            </span>
        );
    if (rank === 3)
        return (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                3
            </span>
        );
    return (
        <span className="text-sm text-slate-400 tabular-nums">{rank}</span>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TopStudentsPage() {
    const [sortBy, setSortBy] = useState<string>("avg_score");
    const [limit, setLimit] = useState<string>("10");
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
            // Auto-expand first subject
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

    return (
        <div className="px-6 py-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-yellow-700 bg-yellow-50 text-xs font-bold tracking-wider uppercase border border-yellow-200">
                    Admin · Reports
                </span>
                <h1 className="text-3xl font-bold text-zinc-900 mt-3 flex items-center gap-2">
                    {/* <Trophy className="h-7 w-7 text-yellow-500" /> */}
                    Top Scoring Students
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">
                    Leaderboard per subject with weekly movement tracking.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">
                        Sort by:
                    </label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="avg_score">Average Score</option>
                        <option value="weekly_change">Weekly Improvement</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">
                        Top:
                    </label>
                    <select
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
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
                <div className="space-y-4">
                    {data.results.map((subject) => (
                        <div
                            key={subject.subject_id}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                        >
                            {/* Subject header (accordion) */}
                            <button
                                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                                onClick={() =>
                                    setExpandedSubject(
                                        expandedSubject === subject.subject_id
                                            ? null
                                            : subject.subject_id,
                                    )
                                }
                            >
                                <div className="flex items-center gap-3">
                                    {/* <Trophy className="h-4 w-4 text-yellow-500" /> */}
                                    <span className="font-semibold text-slate-800">
                                        {subject.subject_name}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {subject.top_students.length} students
                                    </span>
                                </div>
                                <span className="text-slate-400 text-sm">
                                    {expandedSubject === subject.subject_id
                                        ? "▲"
                                        : "▼"}
                                </span>
                            </button>

                            {expandedSubject === subject.subject_id && (
                                <div className="border-t border-slate-100">
                                    {subject.top_students.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-slate-400">
                                            No data yet.
                                        </p>
                                    ) : (
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
                                                            Avg Score
                                                        </th>
                                                        <th className="text-right py-2.5 px-4 font-medium text-slate-600">
                                                            Tests
                                                        </th>
                                                        <th className="text-right py-2.5 px-4 font-medium text-slate-600">
                                                            This Week
                                                        </th>
                                                        <th className="text-right py-2.5 px-4 font-medium text-slate-600">
                                                            Last Week
                                                        </th>
                                                        <th className="text-right py-2.5 px-4 font-medium text-slate-600">
                                                            Weekly Movement
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
                                                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                                            >
                                                                <td className="py-3 px-4 text-center">
                                                                    <RankBadge
                                                                        rank={
                                                                            stu.rank
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    <p className="font-medium text-slate-800">
                                                                        {stu.student_name}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400">
                                                                        {stu.student_code}
                                                                    </p>
                                                                </td>
                                                                <td className="py-3 px-4 text-right font-semibold text-slate-800 tabular-nums">
                                                                    {stu.avg_score}%
                                                                </td>
                                                                <td className="py-3 px-4 text-right text-slate-600 tabular-nums">
                                                                    {stu.tests_taken}
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
                            )}
                        </div>
                    ))}
                    {data.results.length === 0 && (
                        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
                            <p className="text-slate-400 text-sm">
                                No data available yet.
                            </p>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
