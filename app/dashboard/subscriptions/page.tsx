import Link from "next/link";
import { requireAdminAccess } from "@/lib/auth/rbac";
import { formatPlanLabel } from "@/lib/stripe-plans";
import {
    fmtSubscriptionDate,
    normalizeRelation,
    subscriptionStatusBadge,
} from "@/lib/utils/subscription-ui";
import { ChevronRight, CreditCard } from "lucide-react";

export default async function AdminSubscriptionsPage() {
    const { supabase } = await requireAdminAccess();

    const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select(
            `
            id,
            plan,
            status,
            expires_at,
            starts_at,
            parent:profiles(id, email, full_name),
            student:students(id, full_name, student_id)
        `,
        )
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <div className="px-6 py-10 max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold text-zinc-900">
                    Subscriptions
                </h1>
                <p className="text-red-600 mt-4 text-sm">
                    Failed to load subscriptions.
                </p>
            </div>
        );
    }

    const rows = subscriptions ?? [];
    const active = rows.filter((s) => s.status === "active").length;
    const grace = rows.filter((s) => s.status === "grace_period").length;
    const expired = rows.filter((s) => s.status === "expired").length;

    return (
        <div className="px-6 py-10 max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase border border-slate-200 bg-white text-slate-600">
                        Admin
                    </span>
                    <h1 className="text-3xl font-bold text-zinc-900 mt-3">
                        Subscriptions
                    </h1>
                    <p className="text-zinc-500 mt-1 text-sm">
                        Browse and inspect all parent subscriptions.
                    </p>
                </div>
                <Link
                    href="/dashboard/reports/subscribers"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    Subscription report
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total", value: rows.length, tone: "text-slate-900" },
                    { label: "Active", value: active, tone: "text-emerald-700" },
                    { label: "Grace", value: grace, tone: "text-amber-700" },
                    { label: "Expired", value: expired, tone: "text-red-600" },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                    >
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {stat.label}
                        </p>
                        <p
                            className={`text-2xl font-semibold tabular-nums mt-1 ${stat.tone}`}
                        >
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {rows.length > 0 ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
                    {rows.map((subscription) => {
                        const parent = normalizeRelation(subscription.parent);
                        const student = normalizeRelation(subscription.student);
                        const badge = subscriptionStatusBadge(
                            subscription.status,
                        );

                        return (
                            <Link
                                key={subscription.id}
                                href={`/dashboard/subscriptions/${subscription.id}`}
                                className="group flex items-center gap-4 p-5 hover:bg-slate-50/80 transition-colors"
                            >
                                <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-6">
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-400 uppercase tracking-wide">
                                            Parent
                                        </p>
                                        <p className="font-semibold text-slate-900 truncate">
                                            {parent?.full_name ||
                                                parent?.email ||
                                                "Unknown"}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {parent?.email ?? "—"}
                                        </p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-400 uppercase tracking-wide">
                                            Student
                                        </p>
                                        <p className="font-medium text-slate-800 truncate">
                                            {student?.full_name || "Unassigned"}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {student?.student_id || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide">
                                            Plan
                                        </p>
                                        <p className="font-medium text-slate-800">
                                            {formatPlanLabel(subscription.plan)}
                                        </p>
                                        <span
                                            className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.className}`}
                                        >
                                            {badge.label}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide">
                                            Expires
                                        </p>
                                        <p className="font-medium text-slate-800">
                                            {fmtSubscriptionDate(
                                                subscription.expires_at,
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500 text-sm">
                    No subscriptions found yet.
                </div>
            )}
        </div>
    );
}
