"use client";

import type { StudentSwot, SwotTopicRow } from "@/types/parent-analytics";

interface StudentSwotPanelProps {
    swot: StudentSwot;
    swotLoading: boolean;
    peerCompareEnabled?: boolean;
}

function fmtPct(value: number) {
    return `${Math.round(value)}%`;
}

function fmtSignedPct(value: number) {
    const r = Math.round(value);
    return r > 0 ? `+${r}%` : `${r}%`;
}

function deltaCls(delta: number) {
    if (delta > 0) return "text-emerald-700";
    if (delta < 0) return "text-red-600";
    return "text-slate-600";
}

const QUADRANTS = {
    strengths: {
        title: "Strengths",
        desc: "Above student average",
        border: "border-l-emerald-600",
    },
    weaknesses: {
        title: "Weaknesses",
        desc: "Below student average",
        border: "border-l-red-500",
    },
    opportunities: {
        title: "Opportunities",
        desc: "Ahead of cohort on strong topics",
        border: "border-l-sky-600",
    },
    threats: {
        title: "Threats",
        desc: "Cohort ahead on weak topics",
        border: "border-l-amber-600",
    },
} as const;

type QuadrantKey = keyof typeof QUADRANTS;

function TopicTable({
    rows,
    showPeer,
    empty,
}: {
    rows: SwotTopicRow[];
    showPeer: boolean;
    empty: string;
}) {
    if (rows.length === 0) {
        return <p className="text-xs text-slate-400 py-6 text-center">{empty}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                        <th className="text-left py-2 pr-2 font-medium">Topic</th>
                        <th className="text-left py-2 px-2 font-medium">Subtopic</th>
                        <th className="text-right py-2 px-2 font-medium">Accuracy</th>
                        {showPeer && <th className="text-right py-2 px-2 font-medium">Cohort</th>}
                        {showPeer && <th className="text-right py-2 px-2 font-medium">Δ</th>}
                        <th className="text-right py-2 pl-2 font-medium">Attempts</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.slice(0, 8).map((row, i) => (
                        <tr key={`${row.topic}-${row.subtopic}-${i}`} className="border-b border-slate-50">
                            <td className="py-2 pr-2 text-slate-800">{row.topic}</td>
                            <td className="py-2 px-2 text-slate-500">{row.subtopic !== "Unspecified" ? row.subtopic : "—"}</td>
                            <td className="py-2 px-2 text-right tabular-nums font-medium">{fmtPct(row.student_accuracy)}</td>
                            {showPeer && (
                                <td className="py-2 px-2 text-right tabular-nums text-slate-500">
                                    {row.peer_accuracy > 0 ? fmtPct(row.peer_accuracy) : "—"}
                                </td>
                            )}
                            {showPeer && (
                                <td className={`py-2 px-2 text-right tabular-nums font-medium ${deltaCls(row.delta)}`}>
                                    {row.peer_accuracy > 0 ? fmtSignedPct(row.delta) : "—"}
                                </td>
                            )}
                            <td className="py-2 pl-2 text-right tabular-nums text-slate-500">{row.attempts}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length > 8 && (
                <p className="text-[11px] text-slate-400 text-center pt-2">
                    +{rows.length - 8} more
                </p>
            )}
        </div>
    );
}

function QuadrantBlock({
    quadrant,
    topics,
    showPeer,
}: {
    quadrant: QuadrantKey;
    topics: SwotTopicRow[];
    showPeer: boolean;
}) {
    const cfg = QUADRANTS[quadrant];
    return (
        <div className={`rounded-lg border border-slate-200 bg-white border-l-4 ${cfg.border}`}>
            <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-medium text-slate-900">{cfg.title}</h4>
                    <span className="text-xs tabular-nums text-slate-400">{topics.length}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{cfg.desc}</p>
            </div>
            <div className="px-2 pb-2">
                <TopicTable
                    rows={topics}
                    showPeer={showPeer && (quadrant === "opportunities" || quadrant === "threats")}
                    empty="No topics in this quadrant yet."
                />
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 animate-pulse space-y-4">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="grid md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-40 bg-slate-50 rounded-lg" />
                ))}
            </div>
        </div>
    );
}

export function StudentSwotPanel({
    swot,
    swotLoading,
    peerCompareEnabled = true,
}: StudentSwotPanelProps) {
    if (swotLoading) return <LoadingSkeleton />;

    const { strengths, weaknesses, opportunities, threats, subject_swot, meta } = swot;

    if (meta.total_topics_analysed === 0) {
        return (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">Insufficient data for SWOT</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    At least 5 attempts per topic are required. More completed tests will populate this analysis.
                </p>
            </div>
        );
    }

    const delta = meta.student_overall_accuracy - meta.peer_overall_accuracy;

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">SWOT summary</h3>
                <div className={`grid grid-cols-2 gap-4 ${peerCompareEnabled ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
                    <div>
                        <p className="text-xs text-slate-500">Student accuracy</p>
                        <p className="text-lg font-semibold tabular-nums text-slate-900">{fmtPct(meta.student_overall_accuracy)}</p>
                    </div>
                    {peerCompareEnabled && (
                        <>
                            <div>
                                <p className="text-xs text-slate-500">Cohort accuracy</p>
                                <p className="text-lg font-semibold tabular-nums text-slate-900">{fmtPct(meta.peer_overall_accuracy)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">vs cohort</p>
                                <p className={`text-lg font-semibold tabular-nums ${deltaCls(delta)}`}>{fmtSignedPct(delta)}</p>
                            </div>
                        </>
                    )}
                    <div>
                        <p className="text-xs text-slate-500">Topics analysed</p>
                        <p className="text-lg font-semibold tabular-nums text-slate-900">{meta.total_topics_analysed}</p>
                        <p className="text-[11px] text-slate-400">Last {meta.days_analysed} days</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <QuadrantBlock quadrant="strengths" topics={strengths} showPeer={false} />
                <QuadrantBlock quadrant="weaknesses" topics={weaknesses} showPeer={false} />
                {peerCompareEnabled && (
                    <>
                        <QuadrantBlock quadrant="opportunities" topics={opportunities} showPeer />
                        <QuadrantBlock quadrant="threats" topics={threats} showPeer />
                    </>
                )}
            </div>

            {subject_swot.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                    <h4 className="text-sm font-medium text-slate-900 mb-3">By subject</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-500">
                                    <th className="text-left py-2 pr-3 font-medium">Subject</th>
                                    <th className="text-left py-2 px-2 font-medium">Quadrant</th>
                                    <th className="text-right py-2 px-2 font-medium">Student</th>
                                    {peerCompareEnabled && <th className="text-right py-2 px-2 font-medium">Cohort</th>}
                                    {peerCompareEnabled && <th className="text-right py-2 pl-2 font-medium">Δ</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {subject_swot.map((row) => (
                                    <tr key={row.subject_id} className="border-b border-slate-50">
                                        <td className="py-2 pr-3 text-slate-800">{row.subject_name}</td>
                                        <td className="py-2 px-2 capitalize text-slate-500">{row.quadrant}</td>
                                        <td className="py-2 px-2 text-right tabular-nums">{fmtPct(row.student_avg)}</td>
                                        {peerCompareEnabled && (
                                            <td className="py-2 px-2 text-right tabular-nums text-slate-500">{fmtPct(row.peer_avg)}</td>
                                        )}
                                        {peerCompareEnabled && (
                                            <td className={`py-2 pl-2 text-right tabular-nums font-medium ${deltaCls(row.delta)}`}>
                                                {fmtSignedPct(row.delta)}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
