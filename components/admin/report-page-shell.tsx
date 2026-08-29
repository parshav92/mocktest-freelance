import type { ReactNode } from "react";

interface ReportPageShellProps {
    badge: string;
    title: string;
    description: string;
    children: ReactNode;
    actions?: ReactNode;
}

export function ReportPageShell({
    badge,
    title,
    description,
    children,
    actions,
}: ReportPageShellProps) {
    return (
        <div className="px-6 py-10 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase border border-slate-200 bg-white text-slate-600">
                        {badge}
                    </span>
                    <h1 className="text-3xl font-bold text-zinc-900 mt-3">
                        {title}
                    </h1>
                    <p className="text-zinc-500 mt-1 text-sm max-w-2xl">
                        {description}
                    </p>
                </div>
                {actions}
            </div>
            {children}
        </div>
    );
}

export function ReportStatCard({
    label,
    value,
    tone = "neutral",
}: {
    label: string;
    value: number | string;
    tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
    const tones = {
        neutral: "text-slate-900",
        success: "text-emerald-700",
        warning: "text-amber-700",
        danger: "text-red-600",
        info: "text-sky-700",
    };

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {label}
            </p>
            <p
                className={`text-2xl font-semibold tabular-nums mt-1 ${tones[tone]}`}
            >
                {value}
            </p>
        </div>
    );
}

export function ReportTabs({
    tabs,
    active,
    onChange,
}: {
    tabs: { id: string; label: string; count?: number }[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
                        active === tab.id
                            ? "border-emerald-600 text-emerald-700 bg-white"
                            : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                >
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className="ml-1.5 text-xs text-slate-400 tabular-nums">
                            ({tab.count})
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
