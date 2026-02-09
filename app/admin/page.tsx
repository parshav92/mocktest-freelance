import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/admin";

async function signOutAdmin() {
    "use server";
    const supabase = await requireAdminSession();
    await supabase.auth.signOut();
    redirect("/admin-login");
}

export default async function AdminDashboardPage() {
    const supabase = await requireAdminSession();

    const [{ count: parentCount }, { count: studentCount }] = await Promise.all(
        [
            supabase
                .from("profiles")
                .select("id", { count: "exact", head: true })
                .eq("role", "parent"),
            supabase
                .from("students")
                .select("id", { count: "exact", head: true }),
        ]
    );

    const [
        { count: totalSubscriptions },
        { count: activeSubscriptions },
        { count: expiredSubscriptions },
        { count: graceSubscriptions },
    ] = await Promise.all([
        supabase
            .from("subscriptions")
            .select("id", { count: "exact", head: true }),
        supabase
            .from("subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
        supabase
            .from("subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("status", "expired"),
        supabase
            .from("subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("status", "grace_period"),
    ]);

    const statCards = [
        { label: "Total Parents", value: parentCount ?? 0 },
        { label: "Total Students", value: studentCount ?? 0 },
        { label: "Total Subscriptions", value: totalSubscriptions ?? 0 },
        { label: "Active Subscriptions", value: activeSubscriptions ?? 0 },
        { label: "Expired Subscriptions", value: expiredSubscriptions ?? 0 },
        { label: "Grace Period", value: graceSubscriptions ?? 0 },
    ];

    return (
        <div className="min-h-screen bg-white px-6 py-16">
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase">
                        Admin
                    </span>
                    <div className="flex-1">
                        <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 heading-tight mt-4">
                            Admin Dashboard
                        </h1>
                        <p className="text-zinc-600 max-w-xl mt-4">
                            System-wide overview of parents, students, and
                            subscriptions. MFA verification is required for access.
                        </p>
                    </div>
                    <form action={signOutAdmin}>
                        <button
                            type="submit"
                            className="rounded-full px-5 py-2.5 text-sm text-zinc-900 font-medium border border-zinc-200 hover:bg-zinc-50 transition-colors"
                        >
                            Sign out
                        </button>
                    </form>
                </div>

                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {statCards.map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6"
                        >
                            <p className="text-sm text-zinc-500 mb-2">
                                {stat.label}
                            </p>
                            <p className="text-3xl font-semibold text-zinc-900">
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </section>

                <section className="rounded-3xl border border-slate-200/70 bg-zinc-50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900">
                            Manage Subscriptions
                        </h2>
                        <p className="text-sm text-zinc-600 mt-1">
                            Review all subscriptions, view parent and student
                            details, and monitor status changes.
                        </p>
                    </div>
                    <Link
                        href="/admin/subscriptions"
                        className="inline-flex items-center justify-center rounded-full bg-zinc-900 text-white px-5 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors"
                    >
                        View Subscriptions
                    </Link>
                </section>

                <section className="rounded-3xl border border-slate-200/70 bg-zinc-50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900">
                            Question Bank
                        </h2>
                        <p className="text-sm text-zinc-600 mt-1">
                            Upload, manage, and review questions for all subjects.
                            Supports CSV bulk upload.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/admin/upload"
                            className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                            Upload Questions
                        </Link>
                        <Link
                            href="/admin/questions"
                            className="inline-flex items-center justify-center rounded-full border border-zinc-300 text-zinc-900 px-5 py-2 text-sm font-medium hover:bg-zinc-100 transition-colors"
                        >
                            View Questions
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
