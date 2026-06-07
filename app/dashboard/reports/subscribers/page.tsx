"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Users, CreditCard, TrendingUp } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Parent {
    id: string;
    email: string;
    full_name: string;
}

interface Student {
    id: string;
    full_name: string;
    student_id: string;
    is_active: boolean;
}

interface SubscriptionRow {
    id: string;
    plan: string;
    status: "active" | "expired" | "grace_period";
    starts_at: string;
    expires_at: string;
    grace_period_ends_at: string | null;
    created_at: string;
    parent: Parent | null;
    student: Student | null;
}

interface BreakdownRow {
    period: string;
    active: number;
    expired: number;
    grace_period: number;
    total: number;
}

interface ReportData {
    subscriptions: SubscriptionRow[];
    breakdown: BreakdownRow[];
    total: number;
    period: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function statusBadge(status: string) {
    const m: Record<string, string> = {
        active: "bg-emerald-100 text-emerald-700",
        expired: "bg-red-100 text-red-600",
        grace_period: "bg-amber-100 text-amber-700",
    };
    const label: Record<string, string> = {
        active: "Active",
        expired: "Expired",
        grace_period: "Grace",
    };
    return (
        <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[status] ?? "bg-slate-100 text-slate-600"}`}
        >
            {label[status] ?? status}
        </span>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SubscribersReportPage() {
    const [status, setStatus] = useState<string>("all");
    const [period, setPeriod] = useState<string>("month");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ReportData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<"breakdown" | "list">("breakdown");

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ status, period });
            const res = await fetch(
                `/api/admin/reports/subscribers?${params.toString()}`,
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
    }, [status, period]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    return (
        <div className="px-6 py-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-emerald-700 bg-emerald-50 text-xs font-bold tracking-wider uppercase border border-emerald-200">
                    Admin · Reports
                </span>
                <h1 className="text-3xl font-bold text-zinc-900 mt-3">
                    Subscriber Report
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">
                    Active and inactive subscriber details with period breakdown.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">
                        Status:
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="grace_period">Grace Period</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">
                        Group by:
                    </label>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="date">Day</option>
                        <option value="month">Month</option>
                        <option value="quarter">Quarter</option>
                        <option value="year">Year</option>
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
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                                {data.total}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <p className="text-xs text-slate-500">Active</p>
                            <p className="text-2xl font-semibold text-emerald-700 tabular-nums">
                                {data.subscriptions.filter(
                                    (s) => s.status === "active",
                                ).length}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <p className="text-xs text-slate-500">Expired</p>
                            <p className="text-2xl font-semibold text-red-600 tabular-nums">
                                {data.subscriptions.filter(
                                    (s) => s.status === "expired",
                                ).length}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <p className="text-xs text-slate-500">Grace Period</p>
                            <p className="text-2xl font-semibold text-amber-700 tabular-nums">
                                {data.subscriptions.filter(
                                    (s) => s.status === "grace_period",
                                ).length}
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1">
                        {(["breakdown", "list"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                            >
                                {t === "breakdown" ? "Period Breakdown" : "All Subscribers"}
                            </button>
                        ))}
                    </div>

                    {/* Period Breakdown Table */}
                    {tab === "breakdown" && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">
                                                Period
                                            </th>
                                            <th className="text-right py-3 px-4 font-medium text-emerald-700">
                                                Active
                                            </th>
                                            <th className="text-right py-3 px-4 font-medium text-red-600">
                                                Expired
                                            </th>
                                            <th className="text-right py-3 px-4 font-medium text-amber-700">
                                                Grace
                                            </th>
                                            <th className="text-right py-3 px-4 font-medium text-slate-700">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.breakdown.map((row) => (
                                            <tr
                                                key={row.period}
                                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="py-3 px-4 font-medium text-slate-800">
                                                    {row.period}
                                                </td>
                                                <td className="py-3 px-4 text-right tabular-nums text-emerald-700">
                                                    {row.active}
                                                </td>
                                                <td className="py-3 px-4 text-right tabular-nums text-red-600">
                                                    {row.expired}
                                                </td>
                                                <td className="py-3 px-4 text-right tabular-nums text-amber-700">
                                                    {row.grace_period}
                                                </td>
                                                <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-900">
                                                    {row.total}
                                                </td>
                                            </tr>
                                        ))}
                                        {data.breakdown.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="py-8 text-center text-slate-400 text-sm"
                                                >
                                                    No data
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* All Subscribers List */}
                    {tab === "list" && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">
                                                Parent
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">
                                                Student
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">
                                                Plan
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">
                                                Status
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">
                                                Started
                                            </th>
                                            <th className="text-left py-3 px-4 font-medium text-slate-600">
                                                Expires
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.subscriptions.map((sub) => (
                                            <tr
                                                key={sub.id}
                                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                            >
                                                <td className="py-3 px-4">
                                                    <p className="font-medium text-slate-800">
                                                        {sub.parent?.full_name ??
                                                            "—"}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {sub.parent?.email ?? "—"}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-medium text-slate-800">
                                                        {sub.student?.full_name ??
                                                            "Unassigned"}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {sub.student?.student_id ??
                                                            "—"}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-4 capitalize text-slate-700">
                                                    {sub.plan.replace("_", " ")}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {statusBadge(sub.status)}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                                    {fmtDate(sub.starts_at)}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                                    {fmtDate(sub.expires_at)}
                                                </td>
                                            </tr>
                                        ))}
                                        {data.subscriptions.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="py-8 text-center text-slate-400 text-sm"
                                                >
                                                    No subscribers found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
