"use client";

import { useMemo } from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    BarChart,
    Bar,
    Legend,
    Brush,
} from "recharts";

const NAVY = "#1a2744";
const GRID = "#e2e8f0";
const AXIS = "#64748b";
const EASY = "#16a34a";
const MED = "#d97706";
const HARD = "#dc2626";

export interface OverviewTest {
    id: string;
    subject?: { name: string } | null;
    percentage: number;
    marks_obtained: number;
    total_marks: number;
    time_spent_secs: number;
    created_at: string;
}

export interface OverviewSubjectStat {
    id: string;
    subject: { name: string };
    tests_taken: number;
    overall_accuracy: number;
    easy_attempted: number;
    easy_correct: number;
    medium_attempted: number;
    medium_correct: number;
    hard_attempted: number;
    hard_correct: number;
    current_level: string;
}

function fmtShortDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
    });
}

function fmtTime(secs: number) {
    if (!secs) return "0m";
    const m = Math.floor(secs / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function accPct(correct: number, attempted: number) {
    return attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
}

function ChartCard({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4">
                <h3 className="text-sm font-medium text-slate-900">{title}</h3>
                {subtitle && (
                    <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                )}
            </div>
            {children}
        </div>
    );
}

function ScoreTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: Array<{ payload: Record<string, string | number> }>;
}) {
    if (!active || !payload?.[0]) return null;
    const p = payload[0].payload;
    return (
        <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
            <p className="font-medium text-slate-900">{p.subject}</p>
            <p className="text-slate-500 mt-0.5">{p.label}</p>
            <p className="tabular-nums text-slate-800 mt-1">
                {p.score}% · {p.marks} · {fmtTime(Number(p.time))}
            </p>
        </div>
    );
}

function SubjectTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
            <p className="font-medium text-slate-900 mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="tabular-nums text-slate-600">
                    {p.name}: {p.value}%
                </p>
            ))}
        </div>
    );
}

export function ScoreTrendChart({ tests }: { tests: OverviewTest[] }) {
    const { data, avg, trend } = useMemo(() => {
        const points = [...tests].reverse().map((t, i) => ({
            idx: i + 1,
            label: fmtShortDate(t.created_at),
            score: Math.round(t.percentage || 0),
            subject: t.subject?.name ?? "Test",
            marks: `${t.marks_obtained}/${t.total_marks}`,
            time: t.time_spent_secs,
        }));
        const average =
            points.length > 0
                ? Math.round(
                      points.reduce((s, d) => s + d.score, 0) / points.length,
                  )
                : 0;
        let delta = 0;
        if (points.length >= 4) {
            const mid = Math.floor(points.length / 2);
            const firstHalf =
                points.slice(0, mid).reduce((s, d) => s + d.score, 0) / mid;
            const secondHalf =
                points.slice(mid).reduce((s, d) => s + d.score, 0) /
                (points.length - mid);
            delta = Math.round(secondHalf - firstHalf);
        }
        return { data: points, avg: average, trend: delta };
    }, [tests]);

    if (!data.length) {
        return (
            <p className="text-sm text-slate-500 py-10 text-center">
                No completed tests to chart yet.
            </p>
        );
    }

    return (
        <>
            <div className="flex items-baseline gap-4 mb-3 text-xs text-slate-500">
                <span>
                    Average{" "}
                    <span className="font-medium text-slate-800 tabular-nums">
                        {avg}%
                    </span>
                </span>
                {data.length >= 4 && (
                    <span>
                        Recent trend{" "}
                        <span
                            className={`font-medium tabular-nums ${trend >= 0 ? "text-emerald-700" : "text-red-600"}`}
                        >
                            {trend >= 0 ? "+" : ""}
                            {trend} pts
                        </span>
                    </span>
                )}
            </div>
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={GRID}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: AXIS, fontSize: 11 }}
                            interval="preserveStartEnd"
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fill: AXIS, fontSize: 11 }}
                            width={32}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip content={<ScoreTooltip />} />
                        <ReferenceLine
                            y={avg}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                        />
                        <Line
                            type="monotone"
                            dataKey="score"
                            name="Score"
                            stroke={NAVY}
                            strokeWidth={2}
                            dot={{ r: 3, fill: NAVY }}
                            activeDot={{ r: 5 }}
                        />
                        {data.length > 10 && (
                            <Brush
                                dataKey="label"
                                height={20}
                                stroke={NAVY}
                                travellerWidth={6}
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}

export function SubjectDifficultyChart({
    subjectStats,
}: {
    subjectStats: OverviewSubjectStat[];
}) {
    const data = useMemo(() => {
        return [...subjectStats]
            .sort((a, b) => b.tests_taken - a.tests_taken)
            .slice(0, 8)
            .map((s) => ({
                name:
                    s.subject.name.length > 16
                        ? `${s.subject.name.slice(0, 14)}…`
                        : s.subject.name,
                fullName: s.subject.name,
                easy: accPct(s.easy_correct, s.easy_attempted),
                medium: accPct(s.medium_correct, s.medium_attempted),
                hard: accPct(s.hard_correct, s.hard_attempted),
                overall: Math.round(s.overall_accuracy),
                tests: s.tests_taken,
                level: s.current_level,
            }));
    }, [subjectStats]);

    if (!data.length) return null;

    return (
        <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 4, right: 8, left: -8, bottom: 48 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={GRID}
                        vertical={false}
                    />
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
                        tick={{ fill: AXIS, fontSize: 11 }}
                        width={32}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<SubjectTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar
                        dataKey="easy"
                        name="Easy"
                        fill={EASY}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={18}
                    />
                    <Bar
                        dataKey="medium"
                        name="Medium"
                        fill={MED}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={18}
                    />
                    <Bar
                        dataKey="hard"
                        name="Hard"
                        fill={HARD}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={18}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function OverviewCharts({
    recentTests,
    subjectStats,
}: {
    recentTests: OverviewTest[];
    subjectStats: OverviewSubjectStat[];
}) {
    return (
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
            <ChartCard
                title="Score history"
                subtitle="Most recent tests, oldest to newest"
            >
                <ScoreTrendChart tests={recentTests} />
            </ChartCard>
            {subjectStats.length > 0 && (
                <ChartCard
                    title="Accuracy by difficulty"
                    subtitle="Per subject — easy, medium, hard"
                >
                    <SubjectDifficultyChart subjectStats={subjectStats} />
                </ChartCard>
            )}
        </div>
    );
}
