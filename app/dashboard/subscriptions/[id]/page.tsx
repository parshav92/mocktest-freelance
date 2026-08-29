import Link from "next/link";
import { ArrowLeft, CreditCard, User, GraduationCap } from "lucide-react";
import { requireAdminAccess } from "@/lib/auth/rbac";
import { formatPlanLabel } from "@/lib/stripe-plans";
import {
    fmtSubscriptionDate,
    normalizeRelation,
    subscriptionStatusBadge,
} from "@/lib/utils/subscription-ui";

export default async function AdminSubscriptionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
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
            created_at,
            parent:profiles(id, email, full_name),
            student:students(id, full_name, student_id, is_active)
        `,
        )
        .eq("id", id)
        .single();

    if (error || !subscription) {
        return (
            <div className="px-6 py-10 max-w-5xl mx-auto space-y-4">
                <h1 className="text-2xl font-bold text-zinc-900">
                    Subscription not found
                </h1>
                <p className="text-sm text-slate-600">
                    This subscription may have been removed or the link is invalid.
                </p>
                <Link
                    href="/dashboard/subscriptions"
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to subscriptions
                </Link>
            </div>
        );
    }

    const parent = normalizeRelation(subscription.parent);
    const student = normalizeRelation(subscription.student);
    const status = subscriptionStatusBadge(subscription.status);

    return (
        <div className="px-6 py-10 max-w-5xl mx-auto space-y-8">
            <div>
                <Link
                    href="/dashboard/subscriptions"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    All subscriptions
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-zinc-900">
                        {formatPlanLabel(subscription.plan)}
                    </h1>
                    <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}
                    >
                        {status.label}
                    </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                    Subscription ID · {subscription.id.slice(0, 8)}…
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-800">
                            Plan & dates
                        </h2>
                    </div>
                    <dl className="space-y-3 text-sm">
                        <Row label="Plan" value={formatPlanLabel(subscription.plan)} />
                        <Row label="Started" value={fmtSubscriptionDate(subscription.starts_at)} />
                        <Row label="Expires" value={fmtSubscriptionDate(subscription.expires_at)} />
                        <Row
                            label="Grace ends"
                            value={fmtSubscriptionDate(subscription.grace_period_ends_at)}
                        />
                        <Row label="Created" value={fmtSubscriptionDate(subscription.created_at)} />
                    </dl>
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <User className="h-4 w-4 text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-800">
                            Parent
                        </h2>
                    </div>
                    <dl className="space-y-3 text-sm">
                        <Row label="Name" value={parent?.full_name ?? "—"} />
                        <Row label="Email" value={parent?.email ?? "—"} />
                    </dl>
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <GraduationCap className="h-4 w-4 text-slate-400" />
                        <h2 className="text-sm font-semibold text-slate-800">
                            Student
                        </h2>
                    </div>
                    {student ? (
                        <>
                            <dl className="space-y-3 text-sm">
                                <Row label="Name" value={student.full_name} />
                                <Row label="Student ID" value={student.student_id} />
                                <Row
                                    label="Account"
                                    value={student.is_active ? "Active" : "Inactive"}
                                />
                            </dl>
                            <Link
                                href={`/dashboard/students/${student.id}/report?studentId=${student.id}&name=${encodeURIComponent(student.full_name)}`}
                                className="inline-flex mt-4 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                            >
                                View student report →
                            </Link>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">
                            No student assigned to this subscription.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-slate-500 shrink-0">{label}</dt>
            <dd className="text-slate-900 text-right font-medium">{value}</dd>
        </div>
    );
}
