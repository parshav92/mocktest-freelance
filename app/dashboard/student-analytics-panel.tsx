"use client";

import { useMemo, useState } from "react";
import type { ParentStudentAnalytics } from "@/types/parent-analytics";
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    BarChart,
    Brush,
    ReferenceLine,
} from "recharts";

interface StudentAnalyticsPanelProps {
    analytics: ParentStudentAnalytics;
    analyticsLoading: boolean;
    topicPage: number;
    onTopicPageChange: (page: number) => void;
    showPeer?: boolean;
}

const NAVY = "#1a2744";
const PEER = "#94a3b8";
const GRID = "#e2e8f0";
const AXIS = "#64748b";
const ACCENT = "#2563eb";
const VOLUME = "#cbd5e1";

function fmtPct(value: number) {
    return `${Math.round(value)}%`;
}

function fmtSignedPct(value: number) {
    const r = Math.round(value);
    return r > 0 ? `+${r}%` : `${r}%`;
}

function fmtDay(d: string) {
    return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
    });
}

function deltaCls(delta: number) {
    if (delta > 0) return "text-emerald-700";
    if (delta < 0) return "text-red-600";
    return "text-slate-600";
}

function gradeFromPercentile(p: number) {
    if (p >= 85) return "A";
    if (p >= 70) return "B";
    if (p >= 55) return "C";
    if (p >= 40) return "D";
    if (p >= 25) return "E";
    return "F";
}

function Panel({
    title,
    subtitle,
    children,
    action,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <h3 className="text-sm font-medium text-slate-900">
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>
                {action}
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function Metric({
    label,
    value,
    hint,
    valueClass,
}: {
    label: string;
    value: string;
    hint?: string;
    valueClass?: string;
}) {
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p
                className={`text-lg font-semibold tabular-nums text-slate-900 mt-0.5 ${valueClass ?? ""}`}
            >
                {value}
            </p>
            {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
    );
}

function ChartTip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color?: string }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
            {label && <p className="font-medium text-slate-800 mb-1">{label}</p>}
            {payload.map((p) => (
                <p key={p.name} className="tabular-nums text-slate-600">
                    {p.name}:{" "}
                    {typeof p.value === "number"
                        ? Number.isInteger(p.value)
                            ? p.value
                            : p.value.toFixed(1)
                        : p.value}
                </p>
            ))}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-white p-4 animate-pulse"
                >
                    <div className="h-3.5 w-36 bg-slate-200 rounded mb-4" />
                    <div className="h-40 bg-slate-50 rounded" />
                </div>
            ))}
        </div>
    );
}

export function StudentAnalyticsPanel({
    analytics,
    analyticsLoading,
    topicPage,
    onTopicPageChange,
    showPeer = true,
}: StudentAnalyticsPanelProps) {
    const [trajectoryView, setTrajectoryView] = useState<"daily" | "weekly">(
        "weekly",
    );

    const trajectoryData = useMemo(() => {
        const rows =
            trajectoryView === "daily"
                ? [...analytics.trajectories.daily].sort(
                      (a, b) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime(),
                  )
                : [...analytics.trajectories.weekly].sort(
                      (a, b) =>
                          new Date(a.week_start).getTime() -
                          new Date(b.week_start).getTime(),
                  );
        return rows.map((r) => ({
            label: fmtDay(
                "date" in r ? r.date : r.week_start,
            ),
            avg: "avg_percentage" in r ? r.avg_percentage : 0,
            tests: r.tests_count,
        }));
    }, [analytics.trajectories, trajectoryView]);

    const subjectChartData = useMemo(
        () =>
            analytics.subject_comparison.map((s) => ({
                name:
                    s.subject_name.length > 14
                        ? `${s.subject_name.slice(0, 12)}…`
                        : s.subject_name,
                student: s.student_avg_percentage,
                peer: s.peer_avg_percentage,
                tests: s.tests_taken,
            })),
        [analytics.subject_comparison],
    );

    const difficultyData = useMemo(
        () =>
            analytics.error_patterns.by_difficulty.map((r) => ({
                name: String(r.difficulty),
                wrong: r.wrong_percentage,
                correct: Math.max(0, 100 - r.wrong_percentage),
                attempts: r.attempts,
            })),
        [analytics.error_patterns.by_difficulty],
    );

    const typeData = useMemo(
        () =>
            analytics.error_patterns.by_question_type.map((r) => ({
                name: r.question_type.replace(/_/g, " "),
                wrong: r.wrong_percentage,
                attempts: r.attempts,
            })),
        [analytics.error_patterns.by_question_type],
    );

    if (analyticsLoading) return <LoadingSkeleton />;

    const peer = analytics.peer_overall;

    return (
        <div className="space-y-4">
            {showPeer && (
                <Panel
                    title="Peer comparison"
                    subtitle={`Based on ${peer.peer_student_count} students with tests in the same period`}
                >
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                        <Metric label="Student avg" value={fmtPct(peer.student_avg_percentage)} />
                        <Metric label="Cohort avg" value={fmtPct(peer.peer_avg_percentage)} />
                        <Metric
                            label="Difference"
                            value={fmtSignedPct(peer.delta_percentage)}
                            valueClass={deltaCls(peer.delta_percentage)}
                        />
                        <Metric
                            label="Percentile"
                            value={fmtPct(peer.percentile_rank)}
                            hint={`Grade ${gradeFromPercentile(peer.percentile_rank)}`}
                        />
                        <Metric
                            label="Tests in window"
                            value={String(analytics.summary.total_tests)}
                        />
                    </div>
                    <div className="h-12 w-full max-w-md">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[
                                    {
                                        label: "Average",
                                        student: peer.student_avg_percentage,
                                        cohort: peer.peer_avg_percentage,
                                    },
                                ]}
                                layout="vertical"
                                margin={{ top: 0, right: 16, left: 64, bottom: 0 }}
                            >
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis
                                    type="category"
                                    dataKey="label"
                                    tick={{ fill: AXIS, fontSize: 11 }}
                                    width={60}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<ChartTip />} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar
                                    dataKey="student"
                                    name="Student"
                                    fill={NAVY}
                                    radius={[0, 3, 3, 0]}
                                    barSize={12}
                                />
                                <Bar
                                    dataKey="cohort"
                                    name="Cohort"
                                    fill={PEER}
                                    radius={[0, 3, 3, 0]}
                                    barSize={12}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel
                    title="Score trajectory"
                    subtitle="Average score and test volume over time"
                    action={
                        <div className="flex rounded-md border border-slate-200 p-0.5 text-xs">
                            {(["daily", "weekly"] as const).map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => setTrajectoryView(v)}
                                    className={`px-2.5 py-1 rounded capitalize ${trajectoryView === v ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    }
                >
                    {trajectoryData.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            No {trajectoryView} data in this period.
                        </p>
                    ) : (
                        <div className="h-52 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={trajectoryData}
                                    margin={{ top: 4, right: 8, left: -8, bottom: trajectoryData.length > 12 ? 24 : 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fill: AXIS, fontSize: 10 }}
                                        interval="preserveStartEnd"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        yAxisId="score"
                                        domain={[0, 100]}
                                        tick={{ fill: AXIS, fontSize: 10 }}
                                        width={32}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        yAxisId="vol"
                                        orientation="right"
                                        allowDecimals={false}
                                        tick={{ fill: AXIS, fontSize: 10 }}
                                        width={24}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar
                                        yAxisId="vol"
                                        dataKey="tests"
                                        name="Tests"
                                        fill={VOLUME}
                                        radius={[2, 2, 0, 0]}
                                        maxBarSize={24}
                                    />
                                    <Line
                                        yAxisId="score"
                                        type="monotone"
                                        dataKey="avg"
                                        name="Avg score %"
                                        stroke={ACCENT}
                                        strokeWidth={2}
                                        dot={{ r: 2, fill: ACCENT }}
                                        activeDot={{ r: 4 }}
                                    />
                                    {trajectoryData.length > 12 && (
                                        <Brush dataKey="label" height={18} stroke={NAVY} travellerWidth={6} />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Panel>

                <Panel title="Pacing & consistency" subtitle="Time usage and study habits">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <Metric
                            label="Time used vs allotted"
                            value={fmtPct(analytics.pacing.pace_vs_allotted_pct)}
                        />
                        <Metric
                            label="Tests ended early"
                            value={fmtPct(analytics.pacing.ended_early_rate_pct)}
                        />
                        <Metric
                            label="Avg tests per week"
                            value={analytics.engagement.avg_tests_per_week.toFixed(1)}
                        />
                        <Metric
                            label="Longest gap between tests"
                            value={`${analytics.engagement.longest_gap_days} days`}
                        />
                    </div>
                    <div className="h-12 w-full max-w-md">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[
                                    {
                                        label: "Rates",
                                        used: analytics.pacing.pace_vs_allotted_pct,
                                        early: analytics.pacing.ended_early_rate_pct,
                                    },
                                ]}
                                layout="vertical"
                                margin={{ top: 0, right: 8, left: 48, bottom: 0 }}
                            >
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis
                                    type="category"
                                    dataKey="label"
                                    tick={{ fill: AXIS, fontSize: 11 }}
                                    width={44}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<ChartTip />} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="used" name="Time used %" fill={NAVY} radius={[0, 2, 2, 0]} barSize={10} />
                                <Bar dataKey="early" name="Ended early %" fill="#f97316" radius={[0, 2, 2, 0]} barSize={10} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
            </div>

            {subjectChartData.length > 0 && (
                <Panel
                    title={showPeer ? "Subject performance vs cohort" : "Subject performance"}
                    subtitle="Average score by subject"
                >
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={subjectChartData}
                                margin={{ top: 4, right: 8, left: -8, bottom: 48 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: AXIS, fontSize: 10 }}
                                    angle={-30}
                                    textAnchor="end"
                                    height={52}
                                    interval={0}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fill: AXIS, fontSize: 10 }}
                                    width={32}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<ChartTip />} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="student" name="Student" fill={NAVY} radius={[2, 2, 0, 0]} maxBarSize={32} />
                                {showPeer && (
                                    <Bar dataKey="peer" name="Cohort" fill={PEER} radius={[2, 2, 0, 0]} maxBarSize={32} />
                                )}
                                <ReferenceLine y={peer.student_avg_percentage} stroke={ACCENT} strokeDasharray="4 4" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-500">
                                    <th className="text-left py-2 pr-3 font-medium">Subject</th>
                                    <th className="text-right py-2 px-2 font-medium">Student</th>
                                    {showPeer && <th className="text-right py-2 px-2 font-medium">Cohort</th>}
                                    {showPeer && <th className="text-right py-2 px-2 font-medium">Δ</th>}
                                    <th className="text-right py-2 pl-2 font-medium">Tests</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.subject_comparison.map((row) => (
                                    <tr key={row.subject_id} className="border-b border-slate-50">
                                        <td className="py-2 pr-3 text-slate-800">{row.subject_name}</td>
                                        <td className="py-2 px-2 text-right tabular-nums">{fmtPct(row.student_avg_percentage)}</td>
                                        {showPeer && (
                                            <td className="py-2 px-2 text-right tabular-nums text-slate-500">
                                                {fmtPct(row.peer_avg_percentage)}
                                            </td>
                                        )}
                                        {showPeer && (
                                            <td className={`py-2 px-2 text-right tabular-nums font-medium ${deltaCls(row.delta_percentage)}`}>
                                                {fmtSignedPct(row.delta_percentage)}
                                            </td>
                                        )}
                                        <td className="py-2 pl-2 text-right tabular-nums text-slate-500">{row.tests_taken}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Errors by difficulty" subtitle="Wrong vs correct split">
                    {difficultyData.length === 0 ? (
                        <p className="text-sm text-slate-500">No data.</p>
                    ) : (
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={difficultyData}
                                    margin={{ top: 0, right: 8, left: 48, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: AXIS }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: AXIS }} width={44} />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="wrong" name="Wrong %" stackId="a" fill="#f97316" />
                                    <Bar dataKey="correct" name="Correct %" stackId="a" fill="#22c55e" radius={[0, 2, 2, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Panel>

                <Panel title="Errors by question type" subtitle="Where marks are lost">
                    {typeData.length === 0 ? (
                        <p className="text-sm text-slate-500">No data.</p>
                    ) : (
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={typeData}
                                    margin={{ top: 0, right: 8, left: 88, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: AXIS }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: AXIS }} width={84} />
                                    <Tooltip content={<ChartTip />} />
                                    <Bar dataKey="wrong" name="Wrong %" fill="#f97316" radius={[0, 2, 2, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Panel>
            </div>

            <Panel title="Topic breakdown" subtitle="Accuracy and attempt volume by topic">
                {analytics.topic_breakdown.length === 0 ? (
                    <p className="text-sm text-slate-500">No topic data in this period.</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-500">
                                        <th className="text-left py-2 pr-3 font-medium">Topic</th>
                                        <th className="text-left py-2 px-2 font-medium">Subtopic</th>
                                        <th className="text-right py-2 px-2 font-medium">Accuracy</th>
                                        <th className="text-right py-2 px-2 font-medium">Attempts</th>
                                        <th className="text-right py-2 pl-2 font-medium">Avg time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.topic_breakdown.map((row, i) => (
                                        <tr key={`${row.topic}-${row.subtopic}-${i}`} className="border-b border-slate-50">
                                            <td className="py-2 pr-3 text-slate-800">{row.topic}</td>
                                            <td className="py-2 px-2 text-slate-500">{row.subtopic}</td>
                                            <td className="py-2 px-2 text-right tabular-nums font-medium">{fmtPct(row.accuracy_percentage)}</td>
                                            <td className="py-2 px-2 text-right tabular-nums text-slate-500">{row.attempts}</td>
                                            <td className="py-2 pl-2 text-right tabular-nums text-slate-500">{Math.round(row.avg_time_spent_secs)}s</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                            <p className="text-xs text-slate-500 tabular-nums">
                                Page {analytics.topic_pagination.page} of{" "}
                                {Math.max(analytics.topic_pagination.total_pages, 1)} ·{" "}
                                {analytics.topic_pagination.total_rows} topics
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onTopicPageChange(Math.max(topicPage - 1, 1))}
                                    disabled={topicPage <= 1 || analyticsLoading}
                                    className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onTopicPageChange(
                                            Math.min(
                                                topicPage + 1,
                                                Math.max(analytics.topic_pagination.total_pages, 1),
                                            ),
                                        )
                                    }
                                    disabled={
                                        topicPage >= Math.max(analytics.topic_pagination.total_pages, 1) ||
                                        analyticsLoading
                                    }
                                    className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </Panel>
        </div>
    );
}
