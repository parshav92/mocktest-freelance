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
            </div>
        </div>
    );
}
