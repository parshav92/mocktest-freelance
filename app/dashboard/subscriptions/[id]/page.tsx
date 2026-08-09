import Link from "next/link";
import { requireAdminAccess } from "@/lib/auth/rbac";
import { formatPlanLabel } from "@/lib/stripe-plans";

const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleString();
};

export default async function AdminSubscriptionDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const { supabase } = await requireAdminAccess();

    const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select(
            `
            id,
            plan,
            status,
            starts_at,
            expires_at,
            grace_period_ends_at,
            parent:profiles(id, email, full_name),
            student:students(id, full_name, student_id, is_active)
        `,
        )
        .eq("id", params.id)
        .single();

    if (error || !subscription) {
        return (
            <div className="min-h-screen bg-white px-6 py-16">
                <div className="max-w-5xl mx-auto space-y-4">
                    <h1 className="text-3xl font-semibold text-zinc-900">
                        Subscription Details
                    </h1>
                    <p className="text-red-600">
                        Subscription not found or access denied.
                    </p>
                    <Link
                        href="/dashboard/subscriptions"
                        className="text-emerald-600 hover:underline text-sm"
                    >
                        Back to subscriptions
                    </Link>
                </div>
            </div>
        );
    }

    // Handle Supabase returning arrays for joined relations
    const parent = Array.isArray(subscription.parent)
        ? subscription.parent[0]
        : subscription.parent;
    const student = Array.isArray(subscription.student)
        ? subscription.student[0]
        : subscription.student;

    return (
        <div className="min-h-screen bg-white px-6 py-16">
            <div className="max-w-5xl mx-auto space-y-10">
                <div>
                    <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase">
                        Admin
                    </span>
                    <h1 className="text-4xl font-bold text-zinc-900 mt-4">
                        Subscription Details
                    </h1>
                    <p className="text-zinc-600 mt-2">
                        Read-only overview of subscription, parent, and student
                        information.
                    </p>
                </div>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                            Subscription
                        </h2>
                        <div className="space-y-3 text-sm text-zinc-600">
                            <div className="flex justify-between">
                                <span>Plan</span>
                                <span className="text-zinc-900 capitalize">
                                    {formatPlanLabel(subscription.plan)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Status</span>
                                <span className="text-zinc-900 capitalize">
                                    {subscription.status.replace("_", " ")}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Starts at</span>
                                <span className="text-zinc-900">
                                    {formatDateTime(subscription.starts_at)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Expires at</span>
                                <span className="text-zinc-900">
                                    {formatDateTime(subscription.expires_at)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Grace period end</span>
                                <span className="text-zinc-900">
                                    {formatDateTime(
                                        subscription.grace_period_ends_at,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                            Parent
                        </h2>
                        <div className="space-y-3 text-sm text-zinc-600">
                            <div className="flex justify-between">
                                <span>Name</span>
                                <span className="text-zinc-900">
                                    {parent?.full_name || "—"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Email</span>
                                <span className="text-zinc-900">
                                    {parent?.email || "—"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                            Student
                        </h2>
                        {student ? (
                            <div className="space-y-3 text-sm text-zinc-600">
                                <div className="flex justify-between">
                                    <span>Student ID</span>
                                    <span className="text-zinc-900">
                                        {student.student_id}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Name</span>
                                    <span className="text-zinc-900">
                                        {student.full_name}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Status</span>
                                    <span className="text-zinc-900">
                                        {student.is_active
                                            ? "Active"
                                            : "Inactive"}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-600">
                                No student assigned to this subscription.
                            </p>
                        )}
                    </div>
                </section>

                <Link
                    href="/dashboard/subscriptions"
                    className="inline-flex items-center text-emerald-600 hover:underline text-sm"
                >
                    Back to subscriptions
                </Link>
            </div>
        </div>
    );
}
