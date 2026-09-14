"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

interface CriterionDescriptions {
    high: string;
    satisfactory: string;
}

interface Criterion {
    name: string;
    descriptions: CriterionDescriptions;
}

interface SubtopicRow {
    id: string;
    sub_topic: string;
    key_focus: string | null;
    criteria: Criterion[];
}

interface StyleGroup {
    main_topic: string;
    criteria: Criterion[];
    subtopics: SubtopicRow[];
}

interface CriteriaPayload {
    general: { criteria: Criterion[] };
    styles: StyleGroup[];
}

function CriteriaList({ criteria }: { criteria: Criterion[] }) {
    if (criteria.length === 0) {
        return (
            <p className="text-xs text-zinc-400 italic">
                No criteria defined at this level.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {criteria.map((c) => (
                <div
                    key={c.name}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3"
                >
                    <p className="text-sm font-medium text-zinc-900 mb-2">
                        {c.name}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700 mb-1">
                                Level 5 — High
                            </p>
                            <p className="text-xs text-zinc-600 leading-relaxed">
                                {c.descriptions.high}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700 mb-1">
                                Level 3 — Satisfactory
                            </p>
                            <p className="text-xs text-zinc-600 leading-relaxed">
                                {c.descriptions.satisfactory}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CollapsibleBlock({
    title,
    badge,
    defaultOpen = false,
    children,
}: {
    title: string;
    badge?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors"
            >
                {open ? (
                    <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                )}
                <span className="text-sm font-medium text-zinc-800 flex-1">
                    {title}
                </span>
                {badge && (
                    <Badge
                        variant="outline"
                        className="text-[10px] font-normal text-zinc-500 border-zinc-200"
                    >
                        {badge}
                    </Badge>
                )}
            </button>
            {open && (
                <div className="px-3 pb-3 pt-1 border-t border-zinc-100">
                    {children}
                </div>
            )}
        </div>
    );
}

export function WritingMarkingCriteriaSection() {
    const [data, setData] = useState<CriteriaPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/admin/writing-marking-criteria");
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || "Failed to load marking criteria");
            }
            setData(json);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load criteria",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    Writing Marking Criteria
                </CardTitle>
                <CardDescription>
                    Topics, subtopics, focus areas, and rubric levels used when
                    evaluating essay responses. Criteria are applied from the
                    style (topic) plus General; subtopic supplies the focus
                    area.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {loading && (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                    </div>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {!loading && !error && data && (
                    <>
                        <CollapsibleBlock
                            title="General (applied to all styles)"
                            badge={`${data.general.criteria.length} criteria`}
                            defaultOpen
                        >
                            <CriteriaList criteria={data.general.criteria} />
                        </CollapsibleBlock>

                        {data.styles.map((style) => (
                            <div key={style.main_topic} className="space-y-3">
                                <div className="flex items-center gap-2 pt-1">
                                    <h3 className="text-sm font-semibold text-zinc-900">
                                        {style.main_topic}
                                    </h3>
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] border-zinc-200 text-zinc-500"
                                    >
                                        {style.subtopics.length} subtopic
                                        {style.subtopics.length !== 1 ? "s" : ""}
                                    </Badge>
                                </div>

                                <CollapsibleBlock
                                    title={`${style.main_topic} style criteria`}
                                    badge={`${style.criteria.length} criteria`}
                                >
                                    <CriteriaList criteria={style.criteria} />
                                </CollapsibleBlock>

                                <div className="rounded-lg border border-zinc-200 overflow-hidden">
                                    <div className="bg-zinc-50 px-3 py-2 border-b border-zinc-200">
                                        <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide">
                                            Subtopics &amp; focus areas
                                        </p>
                                    </div>
                                    {style.subtopics.length === 0 ? (
                                        <p className="text-xs text-zinc-400 italic px-3 py-4">
                                            No subtopics configured.
                                        </p>
                                    ) : (
                                        <div className="divide-y divide-zinc-100">
                                            {style.subtopics.map((sub) => (
                                                <div
                                                    key={sub.id}
                                                    className="px-3 py-3"
                                                >
                                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
                                                        <p className="text-sm font-medium text-zinc-900">
                                                            {sub.sub_topic}
                                                        </p>
                                                        <p className="text-xs text-zinc-500 sm:text-right sm:max-w-md">
                                                            {sub.key_focus ? (
                                                                <>
                                                                    <span className="font-medium text-zinc-600">
                                                                        Focus:{" "}
                                                                    </span>
                                                                    {
                                                                        sub.key_focus
                                                                    }
                                                                </>
                                                            ) : (
                                                                <span className="italic text-zinc-400">
                                                                    No focus
                                                                    area set
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    {sub.criteria.length >
                                                        0 && (
                                                        <div className="mt-3">
                                                            <CriteriaList
                                                                criteria={
                                                                    sub.criteria
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
