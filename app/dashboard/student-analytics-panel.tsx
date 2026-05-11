"use client";

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
    PieChart,
    Pie,
    Cell,
} from "recharts";

interface StudentAnalyticsPanelProps {
    analytics: ParentStudentAnalytics;
    analyticsLoading: boolean;
    topicPage: number;
    onTopicPageChange: (page: number) => void;
}

const CHART_GRID = "#e2e8f0";
const CHART_AXIS = "#64748b";
const COLOR_STUDENT = "#1a2744";
const COLOR_PEER = "#94a3b8";
const COLOR_LINE = "#0ea5e9";
const COLOR_BAR_VOLUME = "#cbd5e1";
const COLOR_WRONG = "#f97316";
const COLOR_CORRECT = "#22c55e";
const COLOR_ACCURACY = "#0ea5e9";

function fmtPct(value: number) {
    return `${Math.round(value)}%`;
}

function fmtSignedPct(value: number) {
    const rounded = Math.round(value);
    if (rounded > 0) return `+${rounded}%`;
    return `${rounded}%`;
}

function fmtDay(dateLike: string) {
    return new Date(dateLike).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
    });
}

function getDeltaClass(delta: number) {
    if (delta > 0) return "text-emerald-700";
    if (delta < 0) return "text-red-600";
    return "text-slate-600";
}

function computeGrade(percentile: number): { letter: string; cls: string } {
    if (percentile >= 85) return { letter: "A", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    if (percentile >= 70) return { letter: "B", cls: "bg-sky-100 text-sky-800 border-sky-300" };
    if (percentile >= 55) return { letter: "C", cls: "bg-amber-100 text-amber-800 border-amber-300" };
    if (percentile >= 40) return { letter: "D", cls: "bg-orange-100 text-orange-800 border-orange-300" };
    if (percentile >= 25) return { letter: "E", cls: "bg-red-100 text-red-700 border-red-300" };
    return { letter: "F", cls: "bg-red-200 text-red-800 border-red-400" };
}

function AnalyticsLoadingSkeleton() {
    return (
        <div className="space-y-6">
            {[0, 1, 2].map((section) => (
                <section
                    key={section}
                    className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse"
                >
                    <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[0, 1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                            >
                                <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
                                <div className="h-5 w-14 bg-slate-200 rounded" />
                            </div>
                        ))}
                    </div>
                </section>
            ))}
            <section className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 w-56 bg-slate-200 rounded mb-4" />
                <div className="h-48 bg-slate-50 rounded-lg" />
            </section>
        </div>
    );
}

function ChartTooltip({
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
        <div className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
            {label != null && (
                <p className="font-medium text-slate-800 mb-1">{label}</p>
            )}
            {payload.map((p) => (
                <p key={p.name} className="tabular-nums text-slate-600">
                    {p.name}:{" "}
                    {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
                </p>
            ))}
        </div>
    );
}

export function StudentAnalyticsPanel({
    analytics,
    analyticsLoading,
    topicPage,
    onTopicPageChange,
}: StudentAnalyticsPanelProps) {
    if (analyticsLoading) {
        return <AnalyticsLoadingSkeleton />;
    }

    const dailySorted = [...analytics.trajectories.daily].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const weeklySorted = [...analytics.trajectories.weekly].sort(
        (a, b) =>
            new Date(a.week_start).getTime() - new Date(b.week_start).getTime(),
    );

    const dailyChartData = dailySorted.map((d) => ({
        label: fmtDay(d.date),
        avg_percentage: d.avg_percentage,
        tests_count: d.tests_count,
    }));

    const weeklyChartData = weeklySorted.map((w) => ({
        label: fmtDay(w.week_start),
        avg_percentage: w.avg_percentage,
        tests_count: w.tests_count,
    }));

    const peerBarData = [
        {
            name: "Avg score",
            student: analytics.peer_overall.student_avg_percentage,
            peer: analytics.peer_overall.peer_avg_percentage,
        },
    ];

    const subjectBarData = analytics.subject_comparison.map((s) => ({
        name:
            s.subject_name.length > 14
                ? `${s.subject_name.slice(0, 12)}…`
                : s.subject_name,
        student: s.student_avg_percentage,
        peer: s.peer_avg_percentage,
    }));

    const difficultyErrorData = analytics.error_patterns.by_difficulty.map(
        (r) => ({
            name: String(r.difficulty),
            wrong: r.wrong_percentage,
            correct: Math.max(0, 100 - r.wrong_percentage),
        }),
    );

    const typeErrorData = analytics.error_patterns.by_question_type.map(
        (r) => ({
            name: r.question_type.replace(/_/g, " "),
            wrong: r.wrong_percentage,
        }),
    );

    const topicBarData = analytics.topic_breakdown.map((r) => ({
        name:
            `${r.topic}`.length > 18
                ? `${r.topic.slice(0, 16)}…`
                : `${r.topic}`,
        accuracy: r.accuracy_percentage,
        attempts: r.attempts,
        subtopic: r.subtopic,
    }));

    const pacePct = Math.min(
        100,
        Math.max(0, analytics.pacing.pace_vs_allotted_pct),
    );
    const paceRemain = Math.max(0, 100 - pacePct);
    const pacePie = [
        { name: "Time used (vs allotted)", value: pacePct },
        { name: "Headroom", value: paceRemain },
    ];

    const earlyPct = Math.min(
        100,
        Math.max(0, analytics.pacing.ended_early_rate_pct),
    );
    const fullPct = Math.max(0, 100 - earlyPct);
    const earlyPie = [
        { name: "Ended early", value: earlyPct },
        { name: "Full submit", value: fullPct },
    ];

    return (
        <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Peer Benchmark
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-200 rounded-lg overflow-hidden mb-4">
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Student avg</p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {fmtPct(
                                analytics.peer_overall.student_avg_percentage,
                            )}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Peer avg</p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {fmtPct(analytics.peer_overall.peer_avg_percentage)}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Delta</p>
                        <p
                            className={`text-lg font-semibold tabular-nums ${getDeltaClass(analytics.peer_overall.delta_percentage)}`}
                        >
                            {fmtSignedPct(
                                analytics.peer_overall.delta_percentage,
                            )}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Percentile</p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {fmtPct(analytics.peer_overall.percentile_rank)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            {analytics.peer_overall.peer_student_count} peers
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3 flex flex-col items-center justify-center">
                        <p className="text-xs text-slate-500 mb-1">Grade</p>
                        <span
                            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-lg font-bold ${computeGrade(analytics.peer_overall.percentile_rank).cls}`}
                        >
                            {computeGrade(analytics.peer_overall.percentile_rank).letter}
                        </span>
                    </div>
                </div>
                {peerBarData[0].student > 0 || peerBarData[0].peer > 0 ? (
                    <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={peerBarData}
                                layout="vertical"
                                margin={{
                                    top: 4,
                                    right: 16,
                                    left: 8,
                                    bottom: 4,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={CHART_GRID}
                                    horizontal
                                />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tick={{ fill: CHART_AXIS, fontSize: 11 }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={72}
                                    tick={{ fill: CHART_AXIS, fontSize: 11 }}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar
                                    dataKey="student"
                                    name="Your student"
                                    fill={COLOR_STUDENT}
                                    radius={[0, 4, 4, 0]}
                                />
                                <Bar
                                    dataKey="peer"
                                    name="All students (avg)"
                                    fill={COLOR_PEER}
                                    radius={[0, 4, 4, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : null}
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Pacing & Engagement
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                    <div>
                        <p className="text-xs text-slate-500 mb-1 text-center">
                            Time used vs allotted (capped at 100% for ring)
                        </p>
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pacePie}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={44}
                                        outerRadius={62}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        <Cell fill={COLOR_LINE} />
                                        <Cell fill="#e2e8f0" />
                                    </Pie>
                                    <Tooltip
                                        formatter={(v: number) =>
                                            `${v.toFixed(1)}%`
                                        }
                                        contentStyle={{ fontSize: 12 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-center text-xs text-slate-600 tabular-nums">
                            {fmtPct(analytics.pacing.pace_vs_allotted_pct)} of
                            allotted time
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1 text-center">
                            Tests ended early vs full submit
                        </p>
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={earlyPie}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={44}
                                        outerRadius={62}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        <Cell fill={COLOR_WRONG} />
                                        <Cell fill={COLOR_CORRECT} />
                                    </Pie>
                                    <Tooltip
                                        formatter={(v: number) =>
                                            `${v.toFixed(1)}%`
                                        }
                                        contentStyle={{ fontSize: 12 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-center text-xs text-slate-600 tabular-nums">
                            {fmtPct(analytics.pacing.ended_early_rate_pct)}{" "}
                            ended early
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                            Pace vs allotted
                        </p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {fmtPct(analytics.pacing.pace_vs_allotted_pct)}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                            Ended early rate
                        </p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {fmtPct(analytics.pacing.ended_early_rate_pct)}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                            Avg tests / week
                        </p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {analytics.engagement.avg_tests_per_week.toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Longest gap</p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {analytics.engagement.longest_gap_days}d
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Trajectory (Daily / Weekly)
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                            Daily
                        </p>
                        {dailyChartData.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No daily data yet.
                            </p>
                        ) : (
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={dailyChartData}
                                        margin={{
                                            top: 8,
                                            right: 12,
                                            left: 0,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={CHART_GRID}
                                        />
                                        <XAxis
                                            dataKey="label"
                                            tick={{
                                                fill: CHART_AXIS,
                                                fontSize: 10,
                                            }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            domain={[0, 100]}
                                            tick={{
                                                fill: CHART_AXIS,
                                                fontSize: 10,
                                            }}
                                            width={32}
                                            label={{
                                                value: "%",
                                                angle: -90,
                                                position: "insideLeft",
                                                style: {
                                                    fill: CHART_AXIS,
                                                    fontSize: 10,
                                                },
                                            }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            allowDecimals={false}
                                            tick={{
                                                fill: CHART_AXIS,
                                                fontSize: 10,
                                            }}
                                            width={28}
                                            label={{
                                                value: "Tests",
                                                angle: 90,
                                                position: "insideRight",
                                                style: {
                                                    fill: CHART_AXIS,
                                                    fontSize: 10,
                                                },
                                            }}
                                        />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11 }}
                                        />
                                        <Bar
                                            yAxisId="right"
                                            dataKey="tests_count"
                                            name="Tests"
                                            fill={COLOR_BAR_VOLUME}
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={28}
                                        />
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="avg_percentage"
                                            name="Avg %"
                                            stroke={COLOR_LINE}
                                            strokeWidth={2}
                                            dot={{ r: 3, fill: COLOR_LINE }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                            Weekly
                        </p>
                        {weeklyChartData.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No weekly data yet.
                            </p>
                        ) : (
                            <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={weeklyChartData}
                                        margin={{
                                            top: 8,
                                            right: 12,
                                            left: 0,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={CHART_GRID}
                                        />
                                        <XAxis
                                            dataKey="label"
                                            tick={{
                                                fill: CHART_AXIS,
                                                fontSize: 10,
                                            }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            domain={[0, 100]}
                                            tick={{
                                                fill: CHART_AXIS,
                                                fontSize: 10,
                                            }}
                                            width={32}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            allowDecimals={false}
                                            tick={{
                                                fill: CHART_AXIS,
                                                fontSize: 10,
                                            }}
                                            width={28}
                                        />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11 }}
                                        />
                                        <Bar
                                            yAxisId="right"
                                            dataKey="tests_count"
                                            name="Tests"
                                            fill={COLOR_BAR_VOLUME}
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={28}
                                        />
                                        <Line
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="avg_percentage"
                                            name="Avg %"
                                            stroke={COLOR_LINE}
                                            strokeWidth={2}
                                            dot={{ r: 3, fill: COLOR_LINE }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Subject vs Peers
                </h3>
                {analytics.subject_comparison.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        No subject data yet.
                    </p>
                ) : (
                    <>
                        <div className="h-56 w-full mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={subjectBarData}
                                    margin={{
                                        top: 8,
                                        right: 8,
                                        left: 0,
                                        bottom: 48,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke={CHART_GRID}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        tick={{
                                            fill: CHART_AXIS,
                                            fontSize: 10,
                                        }}
                                        angle={-35}
                                        textAnchor="end"
                                        height={56}
                                        interval={0}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{
                                            fill: CHART_AXIS,
                                            fontSize: 10,
                                        }}
                                        width={32}
                                    />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar
                                        dataKey="student"
                                        name="Your student"
                                        fill={COLOR_STUDENT}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={36}
                                    />
                                    <Bar
                                        dataKey="peer"
                                        name="All students (avg)"
                                        fill={COLOR_PEER}
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={36}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                            {analytics.subject_comparison.map((row) => (
                                <div
                                    key={row.subject_id}
                                    className="border border-slate-200 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                            {row.subject_name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {row.tests_taken} tests ·{" "}
                                            {row.peer_tests_count} peer tests
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-600 tabular-nums">
                                            You{" "}
                                            {fmtPct(row.student_avg_percentage)}{" "}
                                            · Peers{" "}
                                            {fmtPct(row.peer_avg_percentage)}
                                        </p>
                                        <p
                                            className={`text-xs font-semibold tabular-nums ${getDeltaClass(row.delta_percentage)}`}
                                        >
                                            {fmtSignedPct(row.delta_percentage)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Error Patterns
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                            By difficulty (wrong vs correct %)
                        </p>
                        {difficultyErrorData.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No data yet.
                            </p>
                        ) : (
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={difficultyErrorData}
                                        margin={{
                                            top: 4,
                                            right: 8,
                                            left: 56,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={CHART_GRID}
                                        />
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            tick={{
                                                fontSize: 10,
                                                fill: CHART_AXIS,
                                            }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            tick={{
                                                fontSize: 11,
                                                fill: CHART_AXIS,
                                            }}
                                            width={52}
                                        />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11 }}
                                        />
                                        <Bar
                                            dataKey="wrong"
                                            name="Wrong %"
                                            stackId="a"
                                            fill={COLOR_WRONG}
                                            radius={[0, 0, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="correct"
                                            name="Correct %"
                                            stackId="a"
                                            fill={COLOR_CORRECT}
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                            By question type (wrong %)
                        </p>
                        {typeErrorData.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                No data yet.
                            </p>
                        ) : (
                            <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={typeErrorData}
                                        margin={{
                                            top: 4,
                                            right: 8,
                                            left: 100,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={CHART_GRID}
                                        />
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            tick={{
                                                fontSize: 10,
                                                fill: CHART_AXIS,
                                            }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            tick={{
                                                fontSize: 10,
                                                fill: CHART_AXIS,
                                            }}
                                            width={96}
                                        />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar
                                            dataKey="wrong"
                                            name="Wrong %"
                                            fill={COLOR_WRONG}
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Topic & Subtopic Breakdown
                </h3>
                {analytics.topic_breakdown.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        No topic/subtopic metadata available yet.
                    </p>
                ) : (
                    <>
                        <div className="mb-4 max-w-2xl mx-auto">
                            <p className="text-xs text-slate-500 mb-2">
                                Accuracy by topic
                            </p>
                            <div className="h-52 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={topicBarData}
                                        margin={{
                                            top: 4,
                                            right: 8,
                                            left: 4,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke={CHART_GRID}
                                        />
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            tick={{
                                                fontSize: 10,
                                                fill: CHART_AXIS,
                                            }}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={100}
                                            tick={{
                                                fontSize: 10,
                                                fill: CHART_AXIS,
                                            }}
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.[0])
                                                    return null;
                                                const p = payload[0]
                                                    .payload as {
                                                    name: string;
                                                    accuracy: number;
                                                    attempts: number;
                                                    subtopic: string;
                                                };
                                                return (
                                                    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm max-w-xs">
                                                        <p className="font-medium text-slate-800">
                                                            {p.name}
                                                        </p>
                                                        <p className="text-slate-600">
                                                            {p.subtopic}
                                                        </p>
                                                        <p className="tabular-nums">
                                                            Accuracy:{" "}
                                                            {p.accuracy.toFixed(
                                                                1,
                                                            )}
                                                            % · Attempts:{" "}
                                                            {p.attempts}
                                                        </p>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Bar
                                            dataKey="accuracy"
                                            name="Accuracy %"
                                            fill={COLOR_ACCURACY}
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {analytics.topic_breakdown.map((row, index) => (
                                <div
                                    key={`${row.topic}-${row.subtopic}-${index}`}
                                    className="border border-slate-200 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                            {row.topic}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {row.subtopic}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm tabular-nums text-slate-900">
                                            {fmtPct(row.accuracy_percentage)}{" "}
                                            accuracy
                                        </p>
                                        <p className="text-xs tabular-nums text-slate-500">
                                            {Math.round(
                                                row.avg_time_spent_secs,
                                            )}
                                            s avg · {row.attempts} attempts
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2 flex items-center justify-between">
                                <p className="text-xs text-slate-500 tabular-nums">
                                    Page {analytics.topic_pagination.page} of{" "}
                                    {Math.max(
                                        analytics.topic_pagination.total_pages,
                                        1,
                                    )}{" "}
                                    · {analytics.topic_pagination.total_rows}{" "}
                                    rows
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onTopicPageChange(
                                                Math.max(topicPage - 1, 1),
                                            )
                                        }
                                        disabled={
                                            topicPage <= 1 || analyticsLoading
                                        }
                                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 disabled:opacity-40"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onTopicPageChange(
                                                Math.min(
                                                    topicPage + 1,
                                                    Math.max(
                                                        analytics
                                                            .topic_pagination
                                                            .total_pages,
                                                        1,
                                                    ),
                                                ),
                                            )
                                        }
                                        disabled={
                                            topicPage >=
                                                Math.max(
                                                    analytics.topic_pagination
                                                        .total_pages,
                                                    1,
                                                ) || analyticsLoading
                                        }
                                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
