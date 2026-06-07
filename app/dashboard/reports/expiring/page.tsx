import { requireAdminAccess } from "@/lib/auth/rbac";

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

interface ExpiringSubscription {
    id: string;
    plan: string;
    status: string;
    starts_at: string;
    expires_at: string;
    created_at: string;
    parent: Parent | null;
    student: Student | null;
    days_remaining: number;
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

function urgencyColor(days: number): string {
    if (days <= 3) return "bg-red-100 text-red-700 border-red-300";
    if (days <= 7) return "bg-orange-100 text-orange-700 border-orange-300";
    return "bg-amber-100 text-amber-700 border-amber-300";
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ExpiringSubscriptionsPage() {
    const { supabase } = await requireAdminAccess();

    const now = new Date();
    const cutoff = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
        .from("subscriptions")
        .select(
            `id, plan, status, starts_at, expires_at, created_at,
             parent:profiles(id, email, full_name),
             student:students(id, full_name, student_id, is_active)`,
        )
        .eq("status", "active")
        .lte("expires_at", cutoff.toISOString())
        .gte("expires_at", now.toISOString())
        .order("expires_at", { ascending: true });

    if (error) {
        return (
            <div className="px-6 py-10 max-w-5xl mx-auto">
                <p className="text-red-600 text-sm">
                    Failed to load data: {error.message}
                </p>
            </div>
        );
    }

    const subscriptions: ExpiringSubscription[] = (data ?? []).map((s) => ({
        ...s,
        parent: Array.isArray(s.parent) ? s.parent[0] : s.parent,
        student: Array.isArray(s.student) ? s.student[0] : s.student,
        days_remaining: Math.ceil(
            (new Date(s.expires_at).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
        ),
    }));

    return (
        <div className="px-6 py-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-orange-700 bg-orange-50 text-xs font-bold tracking-wider uppercase border border-orange-200">
                    Admin · Reports
                </span>
                <h1 className="text-3xl font-bold text-zinc-900 mt-3">
                    Expiring Subscriptions
                </h1>
                <p className="text-zinc-500 mt-1 text-sm">
                    Active subscriptions expiring within the next{" "}
                    <strong>15 days</strong>.
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs text-red-600 font-medium">
                        Expiring in ≤ 3 days
                    </p>
                    <p className="text-2xl font-bold text-red-700 tabular-nums mt-1">
                        {subscriptions.filter((s) => s.days_remaining <= 3).length}
                    </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-xs text-orange-600 font-medium">
                        Expiring in 4–7 days
                    </p>
                    <p className="text-2xl font-bold text-orange-700 tabular-nums mt-1">
                        {
                            subscriptions.filter(
                                (s) =>
                                    s.days_remaining > 3 &&
                                    s.days_remaining <= 7,
                            ).length
                        }
                    </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-amber-600 font-medium">
                        Expiring in 8–15 days
                    </p>
                    <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">
                        {subscriptions.filter((s) => s.days_remaining > 7).length}
                    </p>
                </div>
            </div>

            {/* Table */}
            {subscriptions.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
                    <p className="text-slate-500 text-sm">
                        No subscriptions expiring in the next 15 days.
                    </p>
                </div>
            ) : (
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
                                        Expires
                                    </th>
                                    <th className="text-left py-3 px-4 font-medium text-slate-600">
                                        Days Left
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.map((sub) => (
                                    <tr
                                        key={sub.id}
                                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
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
                                        <td className="py-3 px-4 capitalize text-slate-700">
                                            {sub.plan.replace("_", " ")}
                                        </td>
                                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                                            {fmtDate(sub.expires_at)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${urgencyColor(sub.days_remaining)}`}
                                            >
                                                {sub.days_remaining}{" "}
                                                {sub.days_remaining === 1
                                                    ? "day"
                                                    : "days"}
                                            </span>
                                        </td>
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
