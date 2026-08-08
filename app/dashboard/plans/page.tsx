"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AnalyticsLevel, PlanEntitlements } from "@/lib/plans/entitlements";

type Draft = {
    name: string;
    maxFullMocks: string; // "" = unlimited
    analyticsLevel: AnalyticsLevel;
    peerCompare: boolean;
    tips: boolean;
    isActive: boolean;
};

function toDraft(plan: PlanEntitlements): Draft {
    return {
        name: plan.name,
        maxFullMocks:
            plan.maxFullMocks === null ? "" : String(plan.maxFullMocks),
        analyticsLevel: plan.analyticsLevel,
        peerCompare: plan.peerCompare,
        tips: plan.tips,
        isActive: plan.isActive,
    };
}

export default function AdminPlansPage() {
    const [plans, setPlans] = useState<PlanEntitlements[]>([]);
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/plans");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load plans");
            const list = (data.plans as PlanEntitlements[]) ?? [];
            setPlans(list);
            const next: Record<string, Draft> = {};
            for (const p of list) next[p.key] = toDraft(p);
            setDrafts(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const updateDraft = (key: string, patch: Partial<Draft>) => {
        setDrafts((prev) => ({
            ...prev,
            [key]: { ...prev[key], ...patch },
        }));
        setMessage(null);
    };

    const save = async (key: string) => {
        const draft = drafts[key];
        if (!draft) return;

        let maxFullMocks: number | null = null;
        if (draft.maxFullMocks.trim() !== "") {
            const n = Number(draft.maxFullMocks);
            if (!Number.isInteger(n) || n < 0) {
                setError("Max mocks must be a non-negative integer or empty (unlimited)");
                return;
            }
            maxFullMocks = n;
        }

        setSavingKey(key);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/plans", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key,
                    name: draft.name,
                    maxFullMocks,
                    analyticsLevel: draft.analyticsLevel,
                    peerCompare: draft.peerCompare,
                    tips: draft.tips,
                    isActive: draft.isActive,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");

            const updated = data.plan as PlanEntitlements;
            setPlans((prev) =>
                prev.map((p) => (p.key === key ? { ...p, ...updated } : p)),
            );
            setDrafts((prev) => ({
                ...prev,
                [key]: toDraft(updated),
            }));
            setMessage(`Saved ${updated.name}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <div className="px-6 py-10">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-4"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-zinc-900">
                        Plan rules
                    </h1>
                    <p className="text-zinc-500 mt-2 max-w-2xl text-sm">
                        Edit entitlement rules for each plan. Access duration and
                        Stripe prices stay in env/code and are not editable here.
                    </p>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {message}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center gap-2 text-zinc-500 py-16 justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading plans…
                    </div>
                ) : plans.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-zinc-500 text-sm">
                        No plans found. Run the plans migration in Supabase first.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {plans.map((plan) => {
                            const draft = drafts[plan.key];
                            if (!draft) return null;
                            return (
                                <section
                                    key={plan.key}
                                    className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                                plan_key
                                            </p>
                                            <p className="font-mono text-sm text-zinc-700">
                                                {plan.key}
                                            </p>
                                        </div>
                                        <label className="flex items-center gap-2 text-sm text-zinc-600">
                                            <input
                                                type="checkbox"
                                                checked={draft.isActive}
                                                onChange={(e) =>
                                                    updateDraft(plan.key, {
                                                        isActive: e.target.checked,
                                                    })
                                                }
                                                className="rounded border-zinc-300"
                                            />
                                            Active
                                        </label>
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor={`name-${plan.key}`}>
                                                Display name
                                            </Label>
                                            <Input
                                                id={`name-${plan.key}`}
                                                value={draft.name}
                                                onChange={(e) =>
                                                    updateDraft(plan.key, {
                                                        name: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor={`mocks-${plan.key}`}
                                            >
                                                Max full mocks (empty =
                                                unlimited)
                                            </Label>
                                            <Input
                                                id={`mocks-${plan.key}`}
                                                inputMode="numeric"
                                                placeholder="Unlimited"
                                                value={draft.maxFullMocks}
                                                onChange={(e) =>
                                                    updateDraft(plan.key, {
                                                        maxFullMocks:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label
                                                htmlFor={`analytics-${plan.key}`}
                                            >
                                                Analytics level
                                            </Label>
                                            <select
                                                id={`analytics-${plan.key}`}
                                                value={draft.analyticsLevel}
                                                onChange={(e) =>
                                                    updateDraft(plan.key, {
                                                        analyticsLevel: e.target
                                                            .value as AnalyticsLevel,
                                                    })
                                                }
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            >
                                                <option value="none">none</option>
                                                <option value="basic">
                                                    basic
                                                </option>
                                                <option value="full">full</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-6">
                                        <label className="flex items-center gap-2 text-sm text-zinc-700">
                                            <input
                                                type="checkbox"
                                                checked={draft.peerCompare}
                                                onChange={(e) =>
                                                    updateDraft(plan.key, {
                                                        peerCompare:
                                                            e.target.checked,
                                                    })
                                                }
                                                className="rounded border-zinc-300"
                                            />
                                            Peer compare
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-zinc-700">
                                            <input
                                                type="checkbox"
                                                checked={draft.tips}
                                                onChange={(e) =>
                                                    updateDraft(plan.key, {
                                                        tips: e.target.checked,
                                                    })
                                                }
                                                className="rounded border-zinc-300"
                                            />
                                            Tips &amp; tricks
                                        </label>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            onClick={() => save(plan.key)}
                                            disabled={savingKey === plan.key}
                                            className="gap-2"
                                        >
                                            {savingKey === plan.key ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                            Save {plan.key}
                                        </Button>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
