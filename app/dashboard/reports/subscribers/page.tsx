"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ExternalLink } from "lucide-react";
import {
    ReportPageShell,
    ReportStatCard,
    ReportTabs,
} from "@/components/admin/report-page-shell";
import {
    fmtSubscriptionDate,
    subscriptionStatusBadge,
    expiringUrgency,
} from "@/lib/utils/subscription-ui";
import { formatPlanLabel } from "@/lib/stripe-plans";

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
    days_remaining?: number;
}

interface BreakdownRow {
    period: string;
    active: number;
    expired: number;
    grace_period: number;
    total: number;
}

interface SubscriberReportData {
    subscriptions: SubscriptionRow[];
    breakdown: BreakdownRow[];
    total: number;
    period: string;
}

interface ExpiringReportData {
    subscriptions: SubscriptionRow[];
    total: number;
}

type TabId = "overview" | "subscribers" | "expiring";

function SubscriptionReportContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = (searchParams.get("tab") as TabId) || "overview";
    const [tab, setTab] = useState<TabId>(initialTab);
    const [status, setStatus] = useState("all");
    const [period, setPeriod] = useState("month");
    const [loading, setLoading] = useState(true);
    const [subscriberData, setSubscriberData] =
        useState<SubscriberReportData | null>(null);
    const [expiringData, setExpiringData] =
        useState<ExpiringReportData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const switchTab = (next: TabId) => {
        setTab(next);
        router.replace(`/dashboard/reports/subscribers?tab=${next}`, {
            scroll: false,
        });
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ status, period });
            const [subRes, expRes] = await Promise.all([
                fetch(`/api/admin/reports/subscribers?${params}`),
                fetch("/api/admin/reports/expiring"),
            ]);

            if (!subRes.ok) {
                const body = await subRes.json().catch(() => ({}));
                setError(body.error ?? "Failed to load subscriber data");
                return;
            }

            setSubscriberData(await subRes.json());

            if (expRes.ok) {
                setExpiringData(await expRes.json());
            }
        } catch {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }, [status, period]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useEffect(() => {
        const t = searchParams.get("tab") as TabId | null;
        if (t && t !== tab) setTab(t);
    }, [searchParams, tab]);

    const subs = subscriberData?.subscriptions ?? [];
    const activeCount = subs.filter((s) => s.status === "active").length;
    const expiredCount = subs.filter((s) => s.status === "expired").length;
    const graceCount = subs.filter((s) => s.status === "grace_period").length;
    const expiringCount = expiringData?.total ?? 0;

    return (
        <ReportPageShell
            badge="Admin · Reports"
            title="Subscription Report"
            description="Subscriber analytics, renewal pipeline, and expiring subscriptions in one place."
            actions={
                <Link
                    href="/dashboard/subscriptions"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                    Manage subscriptions
                    <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            }
        >
            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="grace_period">Grace period</option>
                </select>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                    <option value="date">Group by day</option>
                    <option value="month">Group by month</option>
                    <option value="quarter">Group by quarter</option>
                    <option value="year">Group by year</option>
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
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <ReportStatCard
                            label="Total"
                            value={subscriberData?.total ?? 0}
                        />
                        <ReportStatCard
                            label="Active"
                            value={activeCount}
                            tone="success"
                        />
                        <ReportStatCard
                            label="Expiring (15d)"
                            value={expiringCount}
                            tone="warning"
                        />
                        <ReportStatCard
                            label="Grace period"
                            value={graceCount}
                            tone="warning"
                        />
                        <ReportStatCard
                            label="Expired"
                            value={expiredCount}
                            tone="danger"
                        />
                    </div>

                    <ReportTabs
                        active={tab}
                        onChange={(id) => switchTab(id as TabId)}
                        tabs={[
                            { id: "overview", label: "Overview" },
                            {
                                id: "subscribers",
                                label: "All subscribers",
                                count: subs.length,
                            },
                            {
                                id: "expiring",
                                label: "Expiring soon",
                                count: expiringCount,
                            },
                        ]}
                    />

                    {tab === "overview" && (
                        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h2 className="text-sm font-semibold text-slate-800">
                                    Period breakdown
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Subscriptions grouped by{" "}
                                    {period === "date"
                                        ? "day"
                                        : period === "month"
                                          ? "month"
                                          : period === "quarter"
                                            ? "quarter"
                                            : "year"}
                                </p>
                            </div>
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
                                        {(subscriberData?.breakdown ?? []).map(
                                            (row) => (
                                                <tr
                                                    key={row.period}
                                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
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
                                            ),
                                        )}
                                        {(subscriberData?.breakdown ?? [])
                                            .length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="py-10 text-center text-slate-400 text-sm"
                                                >
                                                    No breakdown data
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === "subscribers" && (
                        <SubscriberTable rows={subs} showStatus />
                    )}

                    {tab === "expiring" && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <ReportStatCard
                                    label="≤ 3 days"
                                    value={
                                        (expiringData?.subscriptions ?? []).filter(
                                            (s) =>
                                                (s.days_remaining ?? 99) <= 3,
                                        ).length
                                    }
                                    tone="danger"
                                />
                                <ReportStatCard
                                    label="4–7 days"
                                    value={
                                        (expiringData?.subscriptions ?? []).filter(
                                            (s) => {
                                                const d = s.days_remaining ?? 0;
                                                return d > 3 && d <= 7;
                                            },
                                        ).length
                                    }
                                    tone="warning"
                                />
                                <ReportStatCard
                                    label="8–15 days"
                                    value={
                                        (expiringData?.subscriptions ?? []).filter(
                                            (s) => (s.days_remaining ?? 0) > 7,
                                        ).length
                                    }
                                    tone="info"
                                />
                            </div>
                            <SubscriberTable
                                rows={expiringData?.subscriptions ?? []}
                                showDaysRemaining
                                emptyMessage="No subscriptions expiring in the next 15 days."
                            />
                        </>
                    )}
                </>
            )}
        </ReportPageShell>
    );
}

function SubscriberTable({
    rows,
    showStatus = false,
    showDaysRemaining = false,
    emptyMessage = "No subscribers found.",
}: {
    rows: SubscriptionRow[];
    showStatus?: boolean;
    showDaysRemaining?: boolean;
    emptyMessage?: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
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
                            {showStatus && (
                                <th className="text-left py-3 px-4 font-medium text-slate-600">
                                    Status
                                </th>
                            )}
                            <th className="text-left py-3 px-4 font-medium text-slate-600">
                                Expires
                            </th>
                            {showDaysRemaining && (
                                <th className="text-left py-3 px-4 font-medium text-slate-600">
                                    Days left
                                </th>
                            )}
                            <th className="text-right py-3 px-4 font-medium text-slate-600">
                                View
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((sub) => {
                            const badge = subscriptionStatusBadge(sub.status);
                            const days = sub.days_remaining ?? 0;
                            const urgency = expiringUrgency(days);

                            return (
                                <tr
                                    key={sub.id}
                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                                >
                                    <td className="py-3 px-4">
                                        <p className="font-medium text-slate-800">
                                            {sub.parent?.full_name ?? "—"}
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
                                            {sub.student?.student_id ?? "—"}
                                        </p>
                                    </td>
                                    <td className="py-3 px-4 text-slate-700">
                                        {formatPlanLabel(sub.plan)}
                                    </td>
                                    {showStatus && (
                                        <td className="py-3 px-4">
                                            <span
                                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                                            >
                                                {badge.label}
                                            </span>
                                        </td>
                                    )}
                                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                        {fmtSubscriptionDate(sub.expires_at)}
                                    </td>
                                    {showDaysRemaining && (
                                        <td className="py-3 px-4">
                                            <span
                                                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${urgency.className}`}
                                            >
                                                {days}{" "}
                                                {days === 1 ? "day" : "days"}
                                            </span>
                                        </td>
                                    )}
                                    <td className="py-3 px-4 text-right">
                                        <Link
                                            href={`/dashboard/subscriptions/${sub.id}`}
                                            className="text-emerald-700 hover:text-emerald-800 text-xs font-medium"
                                        >
                                            Details →
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={
                                        5 +
                                        (showStatus ? 1 : 0) +
                                        (showDaysRemaining ? 1 : 0)
                                    }
                                    className="py-12 text-center text-slate-400 text-sm"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function SubscribersReportPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-24">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            }
        >
            <SubscriptionReportContent />
        </Suspense>
    );
}
