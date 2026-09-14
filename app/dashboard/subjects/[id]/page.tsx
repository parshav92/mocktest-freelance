"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Save,
} from "lucide-react";
import type { TypeQuotas } from "@/types/test";
import { WritingMarkingCriteriaSection } from "@/components/admin/writing-marking-criteria-section";

// All valid question type keys (including passage group controls)
const QUESTION_TYPE_OPTIONS = [
    { value: "passage", label: "Passage (count of passages)" },
    { value: "passage_mcq", label: "Passage MCQ (questions per passage)" },
    { value: "passage_poem", label: "Poem Passage (count of poem passages)" },
    { value: "poem_mcq", label: "Poem MCQ (questions per poem passage)" },
    { value: "mcq", label: "MCQ (standalone)" },
    { value: "fill_blank_dropdown", label: "Fill Blank — Dropdown" },
    { value: "fill_missing_sentence", label: "Fill Missing Sentence" },
    { value: "essay", label: "Essay" },
] as const;

interface QuotaRow {
    key: string;
    count: number;
}

interface SubjectDetail {
    id: string;
    name: string;
    slug: string;
    duration_mins: number;
    total_questions: number;
    default_template: {
        id: string;
        easy_count: number;
        medium_count: number;
        hard_count: number;
        type_quotas: TypeQuotas | null;
    } | null;
}

function quotasToRows(quotas: TypeQuotas | null): QuotaRow[] {
    if (!quotas) return [];
    return Object.entries(quotas).map(([key, count]) => ({ key, count }));
}

function rowsToQuotas(rows: QuotaRow[]): TypeQuotas {
    const result: TypeQuotas = {};
    for (const row of rows) {
        if (row.key) result[row.key] = row.count;
    }
    return result;
}

export default function ManageSubjectPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const subjectId = params.id;

    const [subject, setSubject] = useState<SubjectDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Editable fields
    const [durationMins, setDurationMins] = useState(45);
    const [easyCount, setEasyCount] = useState(25);
    const [mediumCount, setMediumCount] = useState(10);
    const [hardCount, setHardCount] = useState(5);
    const [useTypeQuotas, setUseTypeQuotas] = useState(false);
    const [quotaRows, setQuotaRows] = useState<QuotaRow[]>([]);

    const fetchSubject = useCallback(async () => {
        try {
            setIsLoading(true);
            setFetchError(null);
            const res = await fetch(`/api/admin/subjects/${subjectId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load subject");

            const s: SubjectDetail = data.subject;
            setSubject(s);
            setDurationMins(s.duration_mins);

            if (s.default_template) {
                setEasyCount(s.default_template.easy_count);
                setMediumCount(s.default_template.medium_count);
                setHardCount(s.default_template.hard_count);
                const hasQuotas =
                    s.default_template.type_quotas !== null &&
                    Object.keys(s.default_template.type_quotas).length > 0;
                setUseTypeQuotas(hasQuotas);
                setQuotaRows(quotasToRows(s.default_template.type_quotas));
            }
        } catch (err) {
            setFetchError(err instanceof Error ? err.message : "Failed to load subject");
        } finally {
            setIsLoading(false);
        }
    }, [subjectId]);

    useEffect(() => {
        fetchSubject();
    }, [fetchSubject]);

    const addQuotaRow = () => {
        setQuotaRows((prev) => [...prev, { key: "", count: 1 }]);
    };

    const removeQuotaRow = (index: number) => {
        setQuotaRows((prev) => prev.filter((_, i) => i !== index));
    };

    const updateQuotaRow = (index: number, field: "key" | "count", value: string | number) => {
        setQuotaRows((prev) =>
            prev.map((row, i) =>
                i === index ? { ...row, [field]: value } : row
            )
        );
    };

    const quotaTotal = quotaRows.reduce((sum, r) => sum + (r.count || 0), 0);
    const diffTotal = easyCount + mediumCount + hardCount;

    const handleSave = async () => {
        setSaveResult(null);
        setIsSaving(true);

        try {
            const typeQuotas: TypeQuotas | null = useTypeQuotas
                ? rowsToQuotas(quotaRows)
                : null;

            const body = {
                duration_mins: durationMins,
                template: {
                    easy_count: easyCount,
                    medium_count: mediumCount,
                    hard_count: hardCount,
                    type_quotas: typeQuotas,
                },
            };

            const res = await fetch(`/api/admin/subjects/${subjectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");

            setSaveResult({ success: true, message: "Subject saved successfully." });
            // Re-fetch to confirm
            await fetchSubject();
        } catch (err) {
            setSaveResult({
                success: false,
                message: err instanceof Error ? err.message : "Save failed",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (fetchError || !subject) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
                    <p className="text-zinc-600">{fetchError || "Subject not found"}</p>
                    <Button variant="outline" onClick={() => router.push("/dashboard/subjects")}>
                        Back to Subjects
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link
                        href="/dashboard/subjects"
                        className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-zinc-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-zinc-900">
                            {subject.name}
                        </h1>
                        <p className="text-sm text-zinc-500">Manage subject settings</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                {/* Save result */}
                {saveResult && (
                    <Alert variant={saveResult.success ? "default" : "destructive"}>
                        {saveResult.success ? (
                            <CheckCircle2 className="h-4 w-4" />
                        ) : (
                            <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>{saveResult.message}</AlertDescription>
                    </Alert>
                )}

                {/* Duration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Test Duration</CardTitle>
                        <CardDescription>
                            How long students have to complete a test for this subject.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            <div className="w-32">
                                <Input
                                    type="number"
                                    min={1}
                                    max={180}
                                    value={durationMins}
                                    onChange={(e) =>
                                        setDurationMins(parseInt(e.target.value) || 1)
                                    }
                                />
                            </div>
                            <span className="text-sm text-zinc-500">minutes</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Difficulty Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Difficulty Distribution</CardTitle>
                        <CardDescription>
                            How many easy, medium, and hard questions are selected per test.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-green-600 font-medium">Easy</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={easyCount}
                                    onChange={(e) =>
                                        setEasyCount(parseInt(e.target.value) || 0)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-amber-600 font-medium">Medium</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={mediumCount}
                                    onChange={(e) =>
                                        setMediumCount(parseInt(e.target.value) || 0)
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-red-600 font-medium">Hard</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={hardCount}
                                    onChange={(e) =>
                                        setHardCount(parseInt(e.target.value) || 0)
                                    }
                                />
                            </div>
                        </div>
                        <p className="text-sm text-zinc-500">
                            Total: <span className="font-medium text-zinc-700">{diffTotal}</span> questions
                            {subject.total_questions !== diffTotal && (
                                <span className="text-amber-600 ml-2">
                                    (subject total is {subject.total_questions})
                                </span>
                            )}
                        </p>
                    </CardContent>
                </Card>

                {/* Type Quotas */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-base">Type Quotas</CardTitle>
                                <CardDescription>
                                    Override how many questions of each type are selected. When
                                    enabled, replaces the difficulty-based distribution.
                                </CardDescription>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={useTypeQuotas}
                                onClick={() => setUseTypeQuotas((v) => !v)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    useTypeQuotas ? "bg-emerald-600" : "bg-zinc-300"
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                                        useTypeQuotas ? "translate-x-5" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>
                    </CardHeader>

                    {useTypeQuotas && (
                        <CardContent className="space-y-4">
                            <Separator />

                            {/* Rows */}
                            <div className="space-y-3">
                                {quotaRows.length === 0 && (
                                    <p className="text-sm text-zinc-400 italic">
                                        No quotas defined. Add a row below.
                                    </p>
                                )}

                                {quotaRows.map((row, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        {/* Type dropdown */}
                                        <div className="flex-1">
                                            <Select
                                                value={row.key}
                                                onValueChange={(v) =>
                                                    updateQuotaRow(index, "key", v)
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select question type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {QUESTION_TYPE_OPTIONS.map((opt) => (
                                                        <SelectItem
                                                            key={opt.value}
                                                            value={opt.value}
                                                        >
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Count input */}
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={row.count}
                                                onChange={(e) =>
                                                    updateQuotaRow(
                                                        index,
                                                        "count",
                                                        parseInt(e.target.value) || 0
                                                    )
                                                }
                                                placeholder="0"
                                            />
                                        </div>

                                        {/* Remove */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeQuotaRow(index)}
                                            className="text-zinc-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Add row */}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addQuotaRow}
                                className="w-full border-dashed"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Type
                            </Button>

                            {/* Total */}
                            {quotaRows.length > 0 && (
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <span className="text-sm text-zinc-500">Total quota count</span>
                                    <span className="font-semibold text-zinc-800">
                                        {quotaTotal}
                                    </span>
                                </div>
                            )}

                            {/* Helper note */}
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                <strong>passage</strong> = number of extract passages to include.{" "}
                                <strong>passage_mcq</strong> = MCQ questions per passage.{" "}
                                <strong>passage_poem</strong> = number of poem passages.{" "}
                                <strong>poem_mcq</strong> = MCQ questions per poem passage.
                                All other keys select standalone questions of that type.
                            </p>
                        </CardContent>
                    )}
                </Card>

                {/* Save */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 min-w-30"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>

                {/* Writing-only: marking criteria reference */}
                {subject.slug === "writing" && (
                    <WritingMarkingCriteriaSection />
                )}
            </div>
        </div>
    );
}
