import Link from "next/link";
import { requireAdminAccess } from "@/lib/auth/rbac";
import { formatPlanLabel } from "@/lib/stripe-plans";

const formatDate = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString();
};

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
            parent:profiles(id, email, full_name),
            student:students(id, full_name, student_id)
        `,
        )
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <div className="min-h-screen bg-white px-6 py-16">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-semibold text-zinc-900">
                        Subscriptions
                    </h1>
                    <p className="text-red-600 mt-4">
                        Failed to load subscriptions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white px-6 py-16">
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase">
                        Admin
                    </span>
                    <h1 className="text-4xl font-bold text-zinc-900 mt-4">
                        Subscriptions
                    </h1>
                    <p className="text-zinc-600 mt-2">
                        Review all subscriptions and drill into details.
                    </p>
                </div>

                {subscriptions && subscriptions.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200/70">
                        <div className="grid grid-cols-1 divide-y divide-slate-200/70">
                            {subscriptions.map((subscription) => {
                                // Handle Supabase returning arrays for joined relations
                                const parent = Array.isArray(
                                    subscription.parent,
                                )
                                    ? subscription.parent[0]
                                    : subscription.parent;
                                const student = Array.isArray(
                                    subscription.student,
                                )
                                    ? subscription.student[0]
                                    : subscription.student;

                                return (
                                    <Link
                                        key={subscription.id}
                                        href={`/dashboard/subscriptions/${subscription.id}`}
                                        className="group p-6 bg-white hover:bg-zinc-50 transition-colors"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <p className="text-sm text-zinc-500">
                                                    Parent
                                                </p>
                                                <p className="text-lg font-semibold text-zinc-900">
                                                    {parent?.full_name ||
                                                        parent?.email ||
                                                        "Unknown"}
                                                </p>
                                                <p className="text-sm text-zinc-500">
                                                    {parent?.email ||
                                                        "No email"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-500">
                                                    Student
                                                </p>
                                                <p className="text-lg font-semibold text-zinc-900">
                                                    {student?.full_name ||
                                                        "Unassigned"}
                                                </p>
                                                <p className="text-sm text-zinc-500">
                                                    {student?.student_id || "—"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-500">
                                                    Plan / Status
                                                </p>
                                                <p className="text-lg font-semibold text-zinc-900">
                                                    {formatPlanLabel(
                                                        subscription.plan,
                                                    )}
                                                </p>
                                                <p className="text-sm text-zinc-500 capitalize">
                                                    {subscription.status.replace(
                                                        "_",
                                                        " ",
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-zinc-500">
                                                    Expires
                                                </p>
                                                <p className="text-lg font-semibold text-zinc-900">
                                                    {formatDate(
                                                        subscription.expires_at,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-zinc-600">
                        No subscriptions found yet.
                    </div>
                )}
            </div>
        </div>
    );
}
