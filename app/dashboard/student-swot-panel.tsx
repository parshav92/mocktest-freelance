"use client";

import type { StudentSwot, SwotTopicRow, SwotSubjectRow } from "@/types/parent-analytics";

interface StudentSwotPanelProps {
    swot: StudentSwot;
    swotLoading: boolean;
}

// ── Helpers ────────────────────────────────────────────

function fmtPct(value: number) {
    return `${Math.round(value)}%`;
}

function fmtSignedPct(value: number) {
    const rounded = Math.round(value);
    if (rounded > 0) return `+${rounded}%`;
    return `${rounded}%`;
}

function getDeltaClass(delta: number) {
    if (delta > 0) return "text-emerald-600";
    if (delta < 0) return "text-red-500";
    return "text-slate-500";
}

// ── Quadrant configs ───────────────────────────────────

const QUADRANT_CONFIG = {
    strengths: {
        title: "Strengths",
        icon: "💪",
        subtitle: "Topics above your own average",
        borderColor: "border-emerald-200",
        headerBg: "bg-emerald-50",
        headerText: "text-emerald-800",
        headerSubText: "text-emerald-600",
        barColor: "bg-emerald-500",
        iconBg: "bg-emerald-100",
        countBg: "bg-emerald-100 text-emerald-700",
        emptyText: "No strong topics identified yet",
        emptySubText: "Topics scoring above your overall average will appear here",
    },
    weaknesses: {
        title: "Weaknesses",
        icon: "⚠️",
        subtitle: "Topics below your own average",
        borderColor: "border-red-200",
        headerBg: "bg-red-50",
        headerText: "text-red-800",
        headerSubText: "text-red-500",
        barColor: "bg-red-400",
        iconBg: "bg-red-100",
        countBg: "bg-red-100 text-red-700",
        emptyText: "No weak topics identified yet",
        emptySubText: "Topics scoring below your average will appear here",
    },
    opportunities: {
        title: "Opportunities",
        icon: "🚀",
        subtitle: "Strengths where you beat peers",
        borderColor: "border-sky-200",
        headerBg: "bg-sky-50",
        headerText: "text-sky-800",
        headerSubText: "text-sky-600",
        barColor: "bg-sky-500",
        iconBg: "bg-sky-100",
        countBg: "bg-sky-100 text-sky-700",
        emptyText: "No peer advantages identified yet",
        emptySubText: "Topics where you outperform other students will appear here",
    },
    threats: {
        title: "Threats",
        icon: "🔥",
        subtitle: "Weaknesses where peers excel",
        borderColor: "border-amber-200",
        headerBg: "bg-amber-50",
        headerText: "text-amber-800",
        headerSubText: "text-amber-600",
        barColor: "bg-amber-500",
        iconBg: "bg-amber-100",
        countBg: "bg-amber-100 text-amber-700",
        emptyText: "No urgent gaps found yet",
        emptySubText: "Topics where peers outperform you will appear here",
    },
} as const;

type QuadrantKey = keyof typeof QUADRANT_CONFIG;

const MAX_ROWS = 8;

// ── Quadrant card ──────────────────────────────────────

function QuadrantCard({
    quadrant,
    topics,
    showPeer,
}: {
    quadrant: QuadrantKey;
    topics: SwotTopicRow[];
    showPeer: boolean;
}) {
    const cfg = QUADRANT_CONFIG[quadrant];
    const visible = topics.slice(0, MAX_ROWS);
    const extra = topics.length - MAX_ROWS;

    return (
        <div
            className={`bg-white border ${cfg.borderColor} rounded-xl overflow-hidden flex flex-col shadow-sm`}
        >
            {/* Header */}
            <div className={`${cfg.headerBg} px-4 py-3 flex items-center gap-3 border-b ${cfg.borderColor}`}>
                <span
                    className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center text-base shrink-0`}
                >
                    {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${cfg.headerText}`}>
                        {cfg.title}
                    </p>
                    <p className={`text-[11px] ${cfg.headerSubText}`}>{cfg.subtitle}</p>
                </div>
                {topics.length > 0 && (
                    <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full ${cfg.countBg}`}>
                        {topics.length}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 bg-white">
                {visible.length === 0 ? (
                    <div className="px-4 py-10 text-center flex flex-col items-center gap-1.5">
                        <p className="text-sm font-medium text-slate-400">{cfg.emptyText}</p>
                        <p className="text-[11px] text-slate-300 max-w-xs">{cfg.emptySubText}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {visible.map((row, i) => (
                            <div key={`${row.topic}-${row.subtopic}-${i}`} className="px-4 py-3">
                                <div className="flex items-start justify-between mb-1.5 gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 truncate leading-tight">
                                            {row.topic}
                                        </p>
                                        {row.subtopic !== "Unspecified" && (
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                {row.subtopic}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0 flex flex-col items-end">
                                        <span className="text-sm font-bold tabular-nums text-slate-800">
                                            {fmtPct(row.student_accuracy)}
                                        </span>
                                        {showPeer && row.peer_accuracy > 0 && (
                                            <span
                                                className={`text-[11px] font-semibold tabular-nums ${getDeltaClass(row.delta)}`}
                                            >
                                                {fmtSignedPct(row.delta)} vs peers
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Student accuracy bar */}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${cfg.barColor} transition-all duration-700`}
                                            style={{
                                                width: `${Math.min(row.student_accuracy, 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-400 tabular-nums w-12 text-right shrink-0">
                                        {row.attempts} att.
                                    </span>
                                </div>
                                {/* Peer bar */}
                                {showPeer && row.peer_accuracy > 0 && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-slate-300 transition-all duration-700"
                                                style={{
                                                    width: `${Math.min(row.peer_accuracy, 100)}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 tabular-nums w-12 text-right shrink-0">
                                            peers {fmtPct(row.peer_accuracy)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                        {extra > 0 && (
                            <p className="text-xs text-slate-400 text-center py-2.5 border-t border-slate-100">
                                +{extra} more topic{extra > 1 ? "s" : ""}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Subject SWOT badge ─────────────────────────────────

function quadrantBadge(q: SwotSubjectRow["quadrant"]) {
    const map: Record<SwotSubjectRow["quadrant"], { label: string; cls: string }> = {
        strength: {
            label: "Strength",
            cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
        },
        weakness: {
            label: "Weakness",
            cls: "bg-red-50 text-red-600 border-red-200",
        },
        opportunity: {
            label: "Opportunity",
            cls: "bg-sky-50 text-sky-700 border-sky-200",
        },
        threat: {
            label: "Threat",
            cls: "bg-amber-50 text-amber-700 border-amber-200",
        },
    };
    const cfg = map[q];
    return (
        <span
            className={`text-[10px] leading-none px-1.5 py-0.5 border rounded font-medium ${cfg.cls}`}
        >
            {cfg.label}
        </span>
    );
}

// ── Subject bar helper ─────────────────────────────────

function SubjectBar({ student, peer }: { student: number; peer: number }) {
    const max = Math.max(student, peer, 1);
    return (
        <div className="flex flex-col gap-1 w-28">
            <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-[#1a2744] transition-all duration-700"
                        style={{ width: `${(student / max) * 100}%` }}
                    />
                </div>
                <span className="text-[10px] text-slate-500 tabular-nums w-7 text-right">{Math.round(student)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-slate-300 transition-all duration-700"
                        style={{ width: `${(peer / max) * 100}%` }}
                    />
                </div>
                <span className="text-[10px] text-slate-400 tabular-nums w-7 text-right">{Math.round(peer)}%</span>
            </div>
        </div>
    );
}

// ── Loading skeleton ───────────────────────────────────

function SwotLoadingSkeleton() {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-medium text-slate-900 mb-3">
                SWOT Analysis
            </h3>
            <div className="animate-pulse space-y-4">
                {/* Meta skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i}>
                            <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
                            <div className="h-6 w-12 bg-slate-200 rounded" />
                        </div>
                    ))}
                </div>
                {/* Quadrant skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                        >
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-200" />
                                <div>
                                    <div className="h-3.5 w-20 bg-slate-200 rounded mb-1.5" />
                                    <div className="h-2.5 w-32 bg-slate-100 rounded" />
                                </div>
                            </div>
                            <div className="px-4 py-4 space-y-3.5">
                                {[0, 1, 2].map((j) => (
                                    <div key={j}>
                                        <div className="h-3 w-28 bg-slate-100 rounded mb-1.5" />
                                        <div className="h-1.5 bg-slate-100 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────

export function StudentSwotPanel({ swot, swotLoading }: StudentSwotPanelProps) {
    if (swotLoading) {
        return <SwotLoadingSkeleton />;
    }

    const { strengths, weaknesses, opportunities, threats, subject_swot, meta } = swot;

    const hasData = meta.total_topics_analysed > 0;
    const delta = meta.student_overall_accuracy - meta.peer_overall_accuracy;

    if (!hasData) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    SWOT Analysis
                </h3>
                <div className="py-12 text-center">
                    <div className="text-3xl mb-3">📊</div>
                    <p className="text-sm font-medium text-slate-600 mb-1">
                        Not enough data for SWOT analysis
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        A minimum of 5 attempts per topic is needed. Complete more tests
                        to unlock personalised insights.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── Overview stats card ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mt-4">
                <h3 className="text-sm font-medium text-slate-900 mb-3">
                    SWOT Analysis
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-slate-500 mb-0.5">Your accuracy</p>
                        <p className="text-xl font-bold text-slate-900 tabular-nums">
                            {fmtPct(meta.student_overall_accuracy)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-0.5">Peer accuracy</p>
                        <p className="text-xl font-bold text-slate-900 tabular-nums">
                            {fmtPct(meta.peer_overall_accuracy)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-0.5">vs Peers</p>
                        <p className={`text-xl font-bold tabular-nums ${getDeltaClass(delta)}`}>
                            {fmtSignedPct(delta)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-0.5">Topics analysed</p>
                        <p className="text-xl font-bold text-slate-900 tabular-nums">
                            {meta.total_topics_analysed}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 2×2 SWOT quadrant grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QuadrantCard quadrant="strengths" topics={strengths} showPeer={false} />
                <QuadrantCard quadrant="weaknesses" topics={weaknesses} showPeer={false} />
                <QuadrantCard quadrant="opportunities" topics={opportunities} showPeer={true} />
                <QuadrantCard quadrant="threats" topics={threats} showPeer={true} />
            </div>

            {/* ── Subject-level overview ── */}
            {subject_swot.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                        Subject Overview
                    </p>
                    <div className="space-y-2">
                        {subject_swot.map((row) => (
                            <div
                                key={row.subject_id}
                                className="border border-slate-100 rounded-lg px-3 py-2.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-slate-800">
                                            {row.subject_name}
                                        </p>
                                        {quadrantBadge(row.quadrant)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <SubjectBar student={row.student_avg} peer={row.peer_avg} />
                                    <div className="text-right w-14">
                                        <p
                                            className={`text-sm font-bold tabular-nums ${getDeltaClass(row.delta)}`}
                                        >
                                            {fmtSignedPct(row.delta)}
                                        </p>
                                        <p className="text-[10px] text-slate-400">vs peers</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-1.5 rounded-full bg-[#1a2744]" />
                            <span className="text-[11px] text-slate-500">Your score</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-1 rounded-full bg-slate-300" />
                            <span className="text-[11px] text-slate-400">Peer avg</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
