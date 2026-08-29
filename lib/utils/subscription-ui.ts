export function fmtSubscriptionDate(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function subscriptionStatusBadge(status: string) {
    const styles: Record<string, string> = {
        active: "bg-emerald-100 text-emerald-700",
        expired: "bg-red-100 text-red-700",
        grace_period: "bg-amber-100 text-amber-800",
    };
    const labels: Record<string, string> = {
        active: "Active",
        expired: "Expired",
        grace_period: "Grace period",
    };
    return {
        className: styles[status] ?? "bg-slate-100 text-slate-600",
        label: labels[status] ?? status.replace("_", " "),
    };
}

export function expiringUrgency(days: number) {
    if (days <= 3) return { className: "bg-red-100 text-red-700 border-red-200", label: "Critical" };
    if (days <= 7) return { className: "bg-orange-100 text-orange-800 border-orange-200", label: "Soon" };
    return { className: "bg-amber-100 text-amber-800 border-amber-200", label: "Upcoming" };
}

export function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    return Array.isArray(value) ? value[0] ?? null : value;
}
