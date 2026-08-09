"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    Zap,
    BookOpen,
    Calendar,
    BarChart3,
    Target,
    ChevronDown,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    CheckCircle2,
    Clock,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SpeedRow {
    difficulty: "easy" | "medium" | "hard";
    student_avg_secs: number;
    peer_avg_secs: number;
    questions_attempted: number;
}

interface DisciplineTest {
    id: string;
    subject_name: string;
    subject_slug: string;
    started_at: string | null;
    ended_at: string | null;
    duration_mins: number;
    time_spent_secs: number;
    total_marks: number;
    marks_obtained: number;
    percentage: number;
    status: string;
}

interface SwotItem {
    topic: string;
    subject: string;
    accuracy: number;
}

interface OpportunityItem {
    topic: string;
    subject: string;
    student_accuracy: number;
    peer_accuracy: number;
    advantage: number;
}

interface ThreatItem {
    topic: string;
    subject: string;
    student_accuracy: number;
    peer_accuracy: number;
    gap: number;
}

interface ComparativeData {
    student_avg: number;
    peer_avg: number;
    percentile_rank: number;
    grade: string;
    peer_count: number;
    delta: number;
}

interface TopicRow {
    subject: string;
    topic: string;
    right: number;
    wrong: number;
    skipped: number;
    total_answered: number;
    accuracy: number;
}

interface ReportData {
    speed_report: SpeedRow[];
    discipline: {
        tests: DisciplineTest[];
        total_tests: number;
        avg_tests_per_student: number;
    };
    swot: {
        strengths: SwotItem[];
        weaknesses: SwotItem[];
        opportunities: OpportunityItem[];
        threats: ThreatItem[];
    };
    comparative: ComparativeData;
    topic_analysis: TopicRow[];
    peer_compare?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtSecs(secs: number): string {
    if (!secs) return "0s";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(d: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function fmtDateTime(d: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function scoreCls(pct: number): string {
    if (pct >= 70) return "text-emerald-700";
    if (pct >= 50) return "text-amber-700";
    return "text-red-600";
}

function gradeColor(g: string): string {
    const m: Record<string, string> = {
        A: "bg-emerald-100 text-emerald-800 border-emerald-300",
        B: "bg-teal-100 text-teal-800 border-teal-300",
        C: "bg-sky-100 text-sky-800 border-sky-300",
        D: "bg-amber-100 text-amber-800 border-amber-300",
        E: "bg-orange-100 text-orange-800 border-orange-300",
        F: "bg-red-100 text-red-800 border-red-300",
    };
    return m[g] ?? "bg-slate-100 text-slate-700 border-slate-300";
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">{title}</h3>
            {children}
        </section>
    );
}

// ── Report Tabs ────────────────────────────────────────────────────────────────

type Tab =
    | "speed"
    | "topic"
    | "discipline"
    | "comparative"
    | "swot";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "speed", label: "Speed & Accuracy", Icon: Zap },
    { id: "topic", label: "Topic Analysis", Icon: BookOpen },
    { id: "discipline", label: "Discipline", Icon: Calendar },
    { id: "comparative", label: "Comparative", Icon: BarChart3 },
    { id: "swot", label: "SWOT", Icon: Target },
];

// ── Speed & Accuracy Tab ───────────────────────────────────────────────────────

function SpeedTab({
    data,
    showPeer,
}: {
    data: SpeedRow[];
    showPeer: boolean;
}) {
    const chartData = data.map((r) => ({
        name: r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1),
        "Your Avg (s)": r.student_avg_secs,
        ...(showPeer ? { "Peer Avg (s)": r.peer_avg_secs } : {}),
    }));

    return (
        <div className="space-y-5">
            <Section title="Average Time per Difficulty Level">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left">
                                <th className="pb-2 pr-4 font-medium text-slate-600">
                                    Difficulty
                                </th>
                                <th className="pb-2 pr-4 font-medium text-slate-600">
                                    Your Avg Time
                                </th>
                                {showPeer && (
                                    <>
                                        <th className="pb-2 pr-4 font-medium text-slate-600">
                                            Peer Avg Time
                                        </th>
                                        <th className="pb-2 pr-4 font-medium text-slate-600">
                                            Comparison
                                        </th>
                                    </>
                                )}
                                <th className="pb-2 font-medium text-slate-600">
                                    Questions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row) => {
                                const diff =
                                    row.student_avg_secs - row.peer_avg_secs;
                                const faster = diff < 0;
                                const neutral =
                                    row.peer_avg_secs === 0 ||
                                    row.student_avg_secs === 0;
                                return (
                                    <tr
                                        key={row.difficulty}
                                        className="border-b border-slate-100 last:border-0"
                                    >
                                        <td className="py-2.5 pr-4 capitalize font-medium text-slate-800">
                                            {row.difficulty}
                                        </td>
                                        <td className="py-2.5 pr-4 tabular-nums text-slate-700">
                                            {fmtSecs(row.student_avg_secs)}
                                        </td>
                                        {showPeer && (
                                            <>
                                                <td className="py-2.5 pr-4 tabular-nums text-slate-500">
                                                    {row.peer_avg_secs > 0
                                                        ? fmtSecs(
                                                              row.peer_avg_secs,
                                                          )
                                                        : "—"}
                                                </td>
                                                <td className="py-2.5 pr-4">
                                                    {neutral ? (
                                                        <span className="text-slate-400 text-xs">
                                                            —
                                                        </span>
                                                    ) : faster ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                                                            <TrendingDown className="h-3 w-3" />
                                                            {fmtSecs(
                                                                Math.abs(diff),
                                                            )}{" "}
                                                            faster
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                                            <TrendingUp className="h-3 w-3" />
                                                            {fmtSecs(diff)}{" "}
                                                            slower
                                                        </span>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                        <td className="py-2.5 tabular-nums text-slate-500">
                                            {row.questions_attempted}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {chartData.some(
                    (d) =>
                        (d["Your Avg (s)"] as number) > 0 ||
                        (showPeer &&
                            ((d["Peer Avg (s)"] as number | undefined) ?? 0) >
                                0),
                ) && (
                    <div className="mt-4 h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barGap={4}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e2e8f0"
                                />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: "#64748b" }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: "#64748b" }}
                                    tickFormatter={(v) => `${v}s`}
                                />
                                <Tooltip
                                    formatter={(v: number) => fmtSecs(v)}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar
                                    dataKey="Your Avg (s)"
                                    fill="#1a2744"
                                    radius={[3, 3, 0, 0]}
                                />
                                {showPeer && (
                                    <Bar
                                        dataKey="Peer Avg (s)"
                                        fill="#94a3b8"
                                        radius={[3, 3, 0, 0]}
                                    />
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </Section>
        </div>
    );
}

// ── Topic Analysis Tab ─────────────────────────────────────────────────────────

function TopicTab({ data }: { data: TopicRow[] }) {
    const [subjectFilter, setSubjectFilter] = useState<string>("all");
    const subjects = Array.from(new Set(data.map((r) => r.subject)));

    const filtered =
        subjectFilter === "all"
            ? data
            : data.filter((r) => r.subject === subjectFilter);

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600">Subject:</label>
                <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Subjects</option>
                    {subjects.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </div>

            <Section title="Topic-wise Performance (Right / Wrong / Skipped)">
                {filtered.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        No topic data available for this filter.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left">
                                    <th className="pb-2 pr-4 font-medium text-slate-600">
                                        Subject
                                    </th>
                                    <th className="pb-2 pr-4 font-medium text-slate-600">
                                        Topic
                                    </th>
                                    <th className="pb-2 pr-3 font-medium text-emerald-700">
                                        Right
                                    </th>
                                    <th className="pb-2 pr-3 font-medium text-red-600">
                                        Wrong
                                    </th>
                                    <th className="pb-2 pr-3 font-medium text-slate-500">
                                        Skipped
                                    </th>
                                    <th className="pb-2 pr-4 font-medium text-slate-600">
                                        Total
                                    </th>
                                    <th className="pb-2 font-medium text-slate-600">
                                        Accuracy
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((row, i) => (
                                    <tr
                                        key={i}
                                        className="border-b border-slate-100 last:border-0"
                                    >
                                        <td className="py-2.5 pr-4 text-slate-600 text-xs">
                                            {row.subject}
                                        </td>
                                        <td className="py-2.5 pr-4 font-medium text-slate-800">
                                            {row.topic || "—"}
                                        </td>
                                        <td className="py-2.5 pr-3 tabular-nums text-emerald-700 font-medium">
                                            {row.right}
                                        </td>
                                        <td className="py-2.5 pr-3 tabular-nums text-red-600 font-medium">
                                            {row.wrong}
                                        </td>
                                        <td className="py-2.5 pr-3 tabular-nums text-slate-400">
                                            {row.skipped}
                                        </td>
                                        <td className="py-2.5 pr-4 tabular-nums text-slate-600">
                                            {row.total_answered}
                                        </td>
                                        <td className="py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${row.accuracy >= 70 ? "bg-emerald-500" : row.accuracy >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                                                        style={{
                                                            width: `${row.accuracy}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span
                                                    className={`text-xs tabular-nums font-medium ${scoreCls(row.accuracy)}`}
                                                >
                                                    {row.accuracy}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>
        </div>
    );
}

// ── Discipline Tab ─────────────────────────────────────────────────────────────

function DisciplineTab({
    data,
}: {
    data: {
        tests: DisciplineTest[];
        total_tests: number;
        avg_tests_per_student: number;
    };
}) {
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;
    const total = data.tests.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const paginated = data.tests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Total Tests Taken</p>
                    <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                        {data.total_tests}
                    </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">
                        Avg Tests (All Students)
                    </p>
                    <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                        {data.avg_tests_per_student}
                    </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Comparison</p>
                    <p
                        className={`text-2xl font-semibold tabular-nums ${data.total_tests >= data.avg_tests_per_student ? "text-emerald-700" : "text-amber-700"}`}
                    >
                        {data.total_tests >= data.avg_tests_per_student
                            ? "Above Avg"
                            : "Below Avg"}
                    </p>
                </div>
            </div>

            <Section title="Test History">
                {paginated.length === 0 ? (
                    <p className="text-sm text-slate-500">No tests found.</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left">
                                        <th className="pb-2 pr-4 font-medium text-slate-600">
                                            Date &amp; Time
                                        </th>
                                        <th className="pb-2 pr-4 font-medium text-slate-600">
                                            Subject
                                        </th>
                                        <th className="pb-2 pr-4 font-medium text-slate-600">
                                            Marks
                                        </th>
                                        <th className="pb-2 pr-4 font-medium text-slate-600">
                                            Score
                                        </th>
                                        <th className="pb-2 font-medium text-slate-600">
                                            Time Used
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((t) => (
                                        <tr
                                            key={t.id}
                                            className="border-b border-slate-100 last:border-0"
                                        >
                                            <td className="py-2.5 pr-4 text-slate-600 whitespace-nowrap">
                                                {fmtDateTime(
                                                    t.ended_at ?? t.started_at,
                                                )}
                                            </td>
                                            <td className="py-2.5 pr-4 font-medium text-slate-800">
                                                {t.subject_name}
                                            </td>
                                            <td className="py-2.5 pr-4 tabular-nums text-slate-700">
                                                {t.marks_obtained}/{t.total_marks}
                                            </td>
                                            <td className="py-2.5 pr-4">
                                                <span
                                                    className={`text-sm font-semibold tabular-nums ${scoreCls(t.percentage)}`}
                                                >
                                                    {Math.round(t.percentage)}%
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-slate-500 tabular-nums">
                                                {fmtSecs(t.time_spent_secs)} /{" "}
                                                {t.duration_mins}m
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-500">
                                    Page {page} of {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            setPage((p) => Math.max(1, p - 1))
                                        }
                                        disabled={page === 1}
                                        className="px-3 py-1 text-xs rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() =>
                                            setPage((p) =>
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                        disabled={page === totalPages}
                                        className="px-3 py-1 text-xs rounded-md border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Section>
        </div>
    );
}

// ── Comparative Tab ────────────────────────────────────────────────────────────

function ComparativeTab({ data }: { data: ComparativeData }) {
    const grades = ["A", "B", "C", "D", "E", "F"];

    return (
        <div className="space-y-5">
            {/* Grade Badge */}
            <div className="flex items-center gap-4">
                <div
                    className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl font-bold ${gradeColor(data.grade)}`}
                >
                    {data.grade}
                </div>
                <div>
                    <p className="text-sm text-slate-500">Comparative Rating</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Based on percentile rank among {data.peer_count} students
                    </p>
                    <div className="flex gap-2 mt-1.5">
                        {grades.map((g) => (
                            <span
                                key={g}
                                className={`px-2 py-0.5 rounded text-xs font-medium border ${g === data.grade ? gradeColor(g) : "bg-slate-50 text-slate-400 border-slate-200"}`}
                            >
                                {g}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Your Avg</p>
                    <p className="text-xl font-semibold text-slate-900 tabular-nums">
                        {data.student_avg}%
                    </p>
                </div>
                <div className="bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Peer Avg</p>
                    <p className="text-xl font-semibold text-slate-900 tabular-nums">
                        {data.peer_avg}%
                    </p>
                </div>
                <div className="bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Delta</p>
                    <p
                        className={`text-xl font-semibold tabular-nums ${data.delta >= 0 ? "text-emerald-700" : "text-red-600"}`}
                    >
                        {data.delta >= 0 ? "+" : ""}
                        {data.delta}%
                    </p>
                </div>
                <div className="bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Percentile</p>
                    <p className="text-xl font-semibold text-slate-900 tabular-nums">
                        {data.percentile_rank}
                        <span className="text-sm font-normal text-slate-500">
                            th
                        </span>
                    </p>
                </div>
            </div>

            {/* Grade Scale */}
            <Section title="Grade Scale">
                <div className="space-y-2">
                    {[
                        {
                            grade: "A",
                            range: "85–100th percentile",
                            label: "Excellent",
                        },
                        {
                            grade: "B",
                            range: "70–84th percentile",
                            label: "Good",
                        },
                        {
                            grade: "C",
                            range: "55–69th percentile",
                            label: "Average",
                        },
                        {
                            grade: "D",
                            range: "40–54th percentile",
                            label: "Below Average",
                        },
                        {
                            grade: "E",
                            range: "25–39th percentile",
                            label: "Needs Improvement",
                        },
                        {
                            grade: "F",
                            range: "0–24th percentile",
                            label: "Poor",
                        },
                    ].map((g) => (
                        <div
                            key={g.grade}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${g.grade === data.grade ? "bg-slate-100 ring-1 ring-slate-300" : ""}`}
                        >
                            <span
                                className={`w-7 h-7 flex items-center justify-center rounded-md text-sm font-bold border ${gradeColor(g.grade)}`}
                            >
                                {g.grade}
                            </span>
                            <span className="text-sm text-slate-700 flex-1">
                                {g.label}
                            </span>
                            <span className="text-xs text-slate-400">
                                {g.range}
                            </span>
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    );
}

// ── SWOT Tab ───────────────────────────────────────────────────────────────────

function SwotTab({
    data,
    showPeer,
}: {
    data: {
        strengths: SwotItem[];
        weaknesses: SwotItem[];
        opportunities: OpportunityItem[];
        threats: ThreatItem[];
    };
    showPeer: boolean;
}) {
    const quadrants = [
        {
            key: "strengths",
            title: "Strengths",
            color: "border-emerald-300 bg-emerald-50",
            headerColor: "text-emerald-700",
            Icon: CheckCircle2,
            description: "Topics where you score ≥ 70%",
            items: data.strengths,
            renderItem: (item: SwotItem) => (
                <div
                    key={item.topic}
                    className="flex justify-between items-center py-1.5 border-b border-emerald-100 last:border-0"
                >
                    <div>
                        <p className="text-sm font-medium text-slate-800">
                            {item.topic}
                        </p>
                        <p className="text-xs text-slate-500">{item.subject}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                        {item.accuracy}%
                    </span>
                </div>
            ),
        },
        {
            key: "weaknesses",
            title: "Weaknesses",
            color: "border-red-300 bg-red-50",
            headerColor: "text-red-700",
            Icon: AlertTriangle,
            description: "Topics where you score < 50%",
            items: data.weaknesses,
            renderItem: (item: SwotItem) => (
                <div
                    key={item.topic}
                    className="flex justify-between items-center py-1.5 border-b border-red-100 last:border-0"
                >
                    <div>
                        <p className="text-sm font-medium text-slate-800">
                            {item.topic}
                        </p>
                        <p className="text-xs text-slate-500">{item.subject}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600 tabular-nums">
                        {item.accuracy}%
                    </span>
                </div>
            ),
        },
        ...(showPeer
            ? [
                  {
                      key: "opportunities",
                      title: "Opportunities",
                      color: "border-sky-300 bg-sky-50",
                      headerColor: "text-sky-700",
                      Icon: TrendingUp,
                      description:
                          "Topics where you outperform peers by > 5%",
                      items: data.opportunities,
                      renderItem: (item: OpportunityItem) => (
                          <div
                              key={item.topic}
                              className="py-1.5 border-b border-sky-100 last:border-0"
                          >
                              <div className="flex justify-between items-start">
                                  <div>
                                      <p className="text-sm font-medium text-slate-800">
                                          {item.topic}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                          {item.subject}
                                      </p>
                                  </div>
                                  <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                                      +{item.advantage}% vs peers
                                  </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                  You: {item.student_accuracy}% · Peers:{" "}
                                  {item.peer_accuracy}%
                              </p>
                          </div>
                      ),
                  },
                  {
                      key: "threats",
                      title: "Threats",
                      color: "border-amber-300 bg-amber-50",
                      headerColor: "text-amber-700",
                      Icon: TrendingDown,
                      description: "Topics where peers outperform you by > 5%",
                      items: data.threats,
                      renderItem: (item: ThreatItem) => (
                          <div
                              key={item.topic}
                              className="py-1.5 border-b border-amber-100 last:border-0"
                          >
                              <div className="flex justify-between items-start">
                                  <div>
                                      <p className="text-sm font-medium text-slate-800">
                                          {item.topic}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                          {item.subject}
                                      </p>
                                  </div>
                                  <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                      −{item.gap}% vs peers
                                  </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                  You: {item.student_accuracy}% · Peers:{" "}
                                  {item.peer_accuracy}%
                              </p>
                          </div>
                      ),
                  },
              ]
            : []),
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {quadrants.map(
                ({
                    key,
                    title,
                    color,
                    headerColor,
                    Icon,
                    description,
                    items,
                    renderItem,
                }) => (
                    <div
                        key={key}
                        className={`border-2 rounded-xl p-4 ${color}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Icon
                                className={`h-4 w-4 ${headerColor}`}
                            />
                            <h4
                                className={`text-sm font-bold ${headerColor}`}
                            >
                                {title}
                            </h4>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                            {description}
                        </p>
                        {items.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">
                                No data — more tests needed.
                            </p>
                        ) : (
                            <div className="space-y-0.5">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(items as any[]).map((item) =>
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    (renderItem as any)(item),
                                )}
                            </div>
                        )}
                    </div>
                ),
            )}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function StudentReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentId = searchParams.get("studentId") ?? "";
    const studentName = searchParams.get("name") ?? "Student";

    const [activeTab, setActiveTab] = useState<Tab>("speed");
    const [days, setDays] = useState<string>("90");
    const [subjectId, setSubjectId] = useState<string>("all");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [featureLocked, setFeatureLocked] = useState(false);
    const [data, setData] = useState<ReportData | null>(null);

    const fetchReport = useCallback(async () => {
        if (!studentId) return;
        setLoading(true);
        setError(null);
        setFeatureLocked(false);
        try {
            const params = new URLSearchParams({ days });
            if (subjectId !== "all") params.set("subjectId", subjectId);
            const res = await fetch(
                `/api/students/${studentId}/report?${params.toString()}`,
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                if (body.code === "FEATURE_LOCKED") {
                    setFeatureLocked(true);
                }
                setError(body.error ?? "Failed to load report");
                setData(null);
                return;
            }
            setData(await res.json());
        } catch {
            setError("Network error");
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [studentId, days, subjectId]);

    useEffect(() => {
        void fetchReport();
    }, [fetchReport]);

    useEffect(() => {
        if (
            data?.peer_compare === false &&
            activeTab === "comparative"
        ) {
            setActiveTab("speed");
        }
    }, [data?.peer_compare, activeTab]);

    if (!studentId) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-500 text-sm">
                    No student specified. Please navigate from the dashboard.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-[#1a2744] sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <span className="text-white text-sm font-medium">
                            Student Report
                        </span>
                        <span className="text-white/50 text-sm mx-2">·</span>
                        <span className="text-white/80 text-sm">
                            {studentName}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
                {/* Filters */}
                {!featureLocked && (
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <select
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="180">Last 180 days</option>
                            <option value="all">All time</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-slate-400" />
                        <select
                            value={subjectId}
                            onChange={(e) => setSubjectId(e.target.value)}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Subjects</option>
                        </select>
                    </div>
                </div>
                )}

                {/* Tabs */}
                {!featureLocked && data && (
                <div className="flex gap-1 overflow-x-auto pb-1">
                    {TABS.filter(
                        (t) =>
                            t.id !== "comparative" ||
                            data.peer_compare !== false,
                    ).map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                activeTab === id
                                    ? "bg-[#1a2744] text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                    </div>
                ) : featureLocked ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3">
                        <p className="text-sm font-medium text-slate-900">
                            Report locked on your plan
                        </p>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            {error ??
                                "Full student reports require Gold or Platinum."}
                        </p>
                        <a
                            href={`/dashboard/subscribe?student=${studentId}`}
                            className="inline-flex text-sm text-sky-600 hover:underline"
                        >
                            Upgrade plan
                        </a>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                        {error}
                    </div>
                ) : data ? (
                    <>
                        {activeTab === "speed" && (
                            <SpeedTab
                                data={data.speed_report}
                                showPeer={data.peer_compare !== false}
                            />
                        )}
                        {activeTab === "topic" && (
                            <TopicTab data={data.topic_analysis} />
                        )}
                        {activeTab === "discipline" && (
                            <DisciplineTab data={data.discipline} />
                        )}
                        {activeTab === "comparative" &&
                            data.peer_compare !== false && (
                            <ComparativeTab data={data.comparative} />
                        )}
                        {activeTab === "swot" && (
                            <SwotTab
                                data={data.swot}
                                showPeer={data.peer_compare !== false}
                            />
                        )}
                    </>
                ) : null}
            </main>
        </div>
    );
}
