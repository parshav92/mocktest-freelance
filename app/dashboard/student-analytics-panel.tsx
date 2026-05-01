"use client";

import type { ParentStudentAnalytics } from "@/types/parent-analytics";

interface StudentAnalyticsPanelProps {
    analytics: ParentStudentAnalytics;
    analyticsLoading: boolean;
    topicPage: number;
    onTopicPageChange: (page: number) => void;
}

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

function BarRow({
    label,
    testsCount,
    avgPercentage,
    maxTests,
}: {
    label: string;
    testsCount: number;
    avgPercentage: number;
    maxTests: number;
}) {
    const width = maxTests > 0 ? Math.max((testsCount / maxTests) * 100, 3) : 0;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{label}</span>
                <span className="tabular-nums">
                    {testsCount} tests · {fmtPct(avgPercentage)}
                </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
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
                <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((row) => (
                        <div
                            key={row}
                            className="h-14 rounded-lg border border-slate-100 bg-slate-50"
                        />
                    ))}
                </div>
            </section>
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

    const daily = analytics.trajectories.daily;
    const weekly = analytics.trajectories.weekly;
    const maxDailyTests = Math.max(...daily.map((d) => d.tests_count), 0);
    const maxWeeklyTests = Math.max(...weekly.map((w) => w.tests_count), 0);

    return (
        <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Peer Benchmark
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Student avg</p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {fmtPct(analytics.peer_overall.student_avg_percentage)}
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
                            {fmtSignedPct(analytics.peer_overall.delta_percentage)}
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
                </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Pacing & Engagement
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Pace vs allotted</p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {fmtPct(analytics.pacing.pace_vs_allotted_pct)}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Ended early rate</p>
                        <p className="text-lg font-semibold text-slate-900 tabular-nums">
                            {fmtPct(analytics.pacing.ended_early_rate_pct)}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Avg tests / week</p>
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
                    Subject vs Peers
                </h3>
                {analytics.subject_comparison.length === 0 ? (
                    <p className="text-sm text-slate-500">No subject data yet.</p>
                ) : (
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
                                        {row.tests_taken} tests · {row.peer_tests_count} peer tests
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-600 tabular-nums">
                                        You {fmtPct(row.student_avg_percentage)} · Peers{" "}
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
                )}
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Error Patterns
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            By difficulty
                        </p>
                        {analytics.error_patterns.by_difficulty.length === 0 ? (
                            <p className="text-sm text-slate-500">No data yet.</p>
                        ) : (
                            analytics.error_patterns.by_difficulty.map((row) => (
                                <div
                                    key={row.difficulty}
                                    className="border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between"
                                >
                                    <span className="text-sm capitalize text-slate-700">
                                        {row.difficulty}
                                    </span>
                                    <span className="text-sm tabular-nums text-slate-900">
                                        {fmtPct(row.wrong_percentage)} wrong
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            By question type
                        </p>
                        {analytics.error_patterns.by_question_type.length === 0 ? (
                            <p className="text-sm text-slate-500">No data yet.</p>
                        ) : (
                            analytics.error_patterns.by_question_type.map((row) => (
                                <div
                                    key={row.question_type}
                                    className="border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between"
                                >
                                    <span className="text-sm text-slate-700">
                                        {row.question_type}
                                    </span>
                                    <span className="text-sm tabular-nums text-slate-900">
                                        {fmtPct(row.wrong_percentage)} wrong
                                    </span>
                                </div>
                            ))
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
                                        {fmtPct(row.accuracy_percentage)} accuracy
                                    </p>
                                    <p className="text-xs tabular-nums text-slate-500">
                                        {Math.round(row.avg_time_spent_secs)}s avg · {row.attempts} attempts
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div className="pt-2 flex items-center justify-between">
                            <p className="text-xs text-slate-500 tabular-nums">
                                Page {analytics.topic_pagination.page} of{" "}
                                {Math.max(analytics.topic_pagination.total_pages, 1)} ·{" "}
                                {analytics.topic_pagination.total_rows} rows
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onTopicPageChange(Math.max(topicPage - 1, 1))
                                    }
                                    disabled={topicPage <= 1 || analyticsLoading}
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
                                                    analytics.topic_pagination.total_pages,
                                                    1,
                                                ),
                                            ),
                                        )
                                    }
                                    disabled={
                                        topicPage >=
                                            Math.max(
                                                analytics.topic_pagination.total_pages,
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
                )}
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    Trajectory (Daily / Weekly)
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Daily
                        </p>
                        {daily.length === 0 ? (
                            <p className="text-sm text-slate-500">No daily data yet.</p>
                        ) : (
                            daily
                                .slice(-10)
                                .map((row) => (
                                    <BarRow
                                        key={row.date}
                                        label={fmtDay(row.date)}
                                        testsCount={row.tests_count}
                                        avgPercentage={row.avg_percentage}
                                        maxTests={maxDailyTests}
                                    />
                                ))
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Weekly
                        </p>
                        {weekly.length === 0 ? (
                            <p className="text-sm text-slate-500">No weekly data yet.</p>
                        ) : (
                            weekly
                                .slice(-10)
                                .map((row) => (
                                    <BarRow
                                        key={row.week_start}
                                        label={`Wk ${fmtDay(row.week_start)}`}
                                        testsCount={row.tests_count}
                                        avgPercentage={row.avg_percentage}
                                        maxTests={maxWeeklyTests}
                                    />
                                ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
