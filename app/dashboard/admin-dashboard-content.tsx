import Link from "next/link";

interface AdminDashboardContentProps {
    stats: {
        parentCount: number;
        studentCount: number;
        totalSubscriptions: number;
        activeSubscriptions: number;
        expiredSubscriptions: number;
        graceSubscriptions: number;
    };
}

export function AdminDashboardContent({ stats }: AdminDashboardContentProps) {
    const statCards = [
        { label: "Total Parents", value: stats.parentCount },
        { label: "Total Students", value: stats.studentCount },
        { label: "Total Subscriptions", value: stats.totalSubscriptions },
        { label: "Active Subscriptions", value: stats.activeSubscriptions },
        { label: "Expired Subscriptions", value: stats.expiredSubscriptions },
        { label: "Grace Period", value: stats.graceSubscriptions },
    ];

    return (
        <div className="px-6 py-16">
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex-1">
                        <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-emerald-600 text-[10px] font-bold tracking-[0.2em] uppercase">
                            Admin
                        </span>
                        <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 heading-tight mt-4">
                            Admin Dashboard
                        </h1>
                        <p className="text-zinc-600 max-w-xl mt-4">
                            System-wide overview of parents, students, and
                            subscriptions. MFA verification is required for
                            access.
                        </p>
                    </div>
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
                        href="/dashboard/subscriptions"
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
                            Upload, manage, and review questions for all
                            subjects. Supports CSV bulk upload.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/dashboard/upload"
                            className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                            Upload Questions
                        </Link>
                        <Link
                            href="/dashboard/questions"
                            className="inline-flex items-center justify-center rounded-full border border-zinc-300 text-zinc-900 px-5 py-2 text-sm font-medium hover:bg-zinc-100 transition-colors"
                        >
                            View Questions
                        </Link>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200/70 bg-zinc-50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900">
                            Passage Bank
                        </h2>
                        <p className="text-sm text-zinc-600 mt-1">
                            Browse, manage, and review passages used in
                            reading comprehension and poem-based questions.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/passage"
                        className="inline-flex items-center justify-center rounded-full bg-zinc-900 text-white px-5 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors"
                    >
                        View Passages
                    </Link>
                </section>

                <section className="rounded-3xl border border-slate-200/70 bg-zinc-50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900">
                            Custom Tests
                        </h2>
                        <p className="text-sm text-zinc-600 mt-1">
                            Create and manage hand-picked tests with custom
                            visibility (admin only, subscribers, free trial).
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/dashboard/custom-tests/create"
                            className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-5 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                            Create Test
                        </Link>
                        <Link
                            href="/dashboard/custom-tests"
                            className="inline-flex items-center justify-center rounded-full border border-zinc-300 text-zinc-900 px-5 py-2 text-sm font-medium hover:bg-zinc-100 transition-colors"
                        >
                            View Tests
                        </Link>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200/70 bg-zinc-50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-900">
                            Manage Subjects
                        </h2>
                        <p className="text-sm text-zinc-600 mt-1">
                            Add and configure test subjects. Set up question
                            distribution and test instructions.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/subjects"
                        className="inline-flex items-center justify-center rounded-full bg-zinc-900 text-white px-5 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors"
                    >
                        Manage Subjects
                    </Link>
                </section>
            </div>
        </div>
    );
}
