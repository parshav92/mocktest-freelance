"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flag, Grid3X3, X } from "lucide-react";
import { TEST_CONFIG } from "@/lib/config/test-rules";

type FilterCategory =
    | "all"
    | "answered"
    | "notAnswered"
    | "notRead"
    | "flagged";

interface ProgressSummaryProps {
    totalQuestions: number;
    currentIndex: number;
    answeredSet: Set<string>;
    visitedSet: Set<string>;
    flaggedSet: Set<string>;
    questionsOrder: string[];
    onJumpTo: (index: number) => void;
}

export function ProgressSummary({
    totalQuestions,
    currentIndex,
    answeredSet,
    visitedSet,
    flaggedSet,
    questionsOrder,
    onJumpTo,
}: ProgressSummaryProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

    const config = TEST_CONFIG.progressSummary;

    // Compute counts
    const answeredCount = answeredSet.size;
    const notAnswered = totalQuestions - answeredCount;
    const notRead = questionsOrder.filter((qId) => !visitedSet.has(qId)).length;
    const flaggedCount = flaggedSet.size;

    // Filter the question indices
    const getFilteredIndices = (): number[] => {
        return questionsOrder
            .map((qId, idx) => ({ qId, idx }))
            .filter(({ qId }) => {
                switch (activeFilter) {
                    case "answered":
                        return answeredSet.has(qId);
                    case "notAnswered":
                        return !answeredSet.has(qId);
                    case "notRead":
                        return !visitedSet.has(qId);
                    case "flagged":
                        return flaggedSet.has(qId);
                    default:
                        return true;
                }
            })
            .map(({ idx }) => idx);
    };

    const filteredIndices = getFilteredIndices();

    const filters: {
        key: FilterCategory;
        label: string;
        count: number;
        show: boolean;
    }[] = [
        {
            key: "all",
            label: "Show All",
            count: totalQuestions,
            show: config.categories.showAll,
        },
        {
            key: "answered",
            label: "Answered",
            count: answeredCount,
            show: config.categories.answered,
        },
        {
            key: "notAnswered",
            label: "Not Answered",
            count: notAnswered,
            show: config.categories.notAnswered,
        },
        {
            key: "notRead",
            label: "Not Read",
            count: notRead,
            show: config.categories.notRead,
        },
        {
            key: "flagged",
            label: "Flagged",
            count: flaggedCount,
            show: config.categories.flagged,
        },
    ];

    // Trigger button for the header
    const triggerButton = (
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
            title="Progress Summary"
        >
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden md:inline">
                {answeredCount}/{totalQuestions}
            </span>
            {flaggedCount > 0 && (
                <Badge
                    variant="outline"
                    className="border-amber-400 text-amber-400 px-1.5 py-0 text-xs"
                >
                    <Flag className="h-3 w-3 mr-1" />
                    {flaggedCount}
                </Badge>
            )}
        </button>
    );

    return (
        <div className="relative">
            {triggerButton}

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/30 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-xl flex flex-col">
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-6 py-3 border-b bg-[#1a2744] text-white">
                            <h2 className="font-semibold text-lg">
                                Progress Summary
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded hover:bg-white/10"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-2 px-6 py-4 border-b bg-gray-50">
                            {filters
                                .filter((f) => f.show)
                                .map((filter) => (
                                    <button
                                        key={filter.key}
                                        onClick={() =>
                                            setActiveFilter(filter.key)
                                        }
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                            activeFilter === filter.key
                                                ? "bg-[#1a2744] text-white"
                                                : "bg-white text-gray-600 border hover:bg-gray-100"
                                        }`}
                                    >
                                        {filter.label} ({filter.count})
                                    </button>
                                ))}
                        </div>

                        {/* Question Grid */}
                        <ScrollArea className="flex-1 p-6">
                            <div className="grid grid-cols-6 gap-2 p-2">
                                {filteredIndices.map((idx) => {
                                    const qId = questionsOrder[idx];
                                    const isAnswered = answeredSet.has(qId);
                                    const isFlagged = flaggedSet.has(qId);
                                    const isCurrent = idx === currentIndex;
                                    const isVisited = visitedSet.has(qId);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                onJumpTo(idx);
                                                setIsOpen(false);
                                            }}
                                            className={`relative w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                        ${isCurrent ? "ring-2 ring-[#2563eb] ring-offset-1" : ""}
                        ${isAnswered ? "bg-green-100 text-green-800 border border-green-300" : ""}
                        ${!isAnswered && isVisited ? "bg-amber-50 text-amber-700 border border-amber-200" : ""}
                        ${!isAnswered && !isVisited ? "bg-gray-100 text-gray-500 border border-gray-200" : ""}
                        hover:shadow-md hover:scale-105
                      `}
                                        >
                                            {idx + 1}
                                            {isFlagged && (
                                                <Flag className="absolute -top-1 -right-1 h-3 w-3 text-amber-500 fill-amber-500" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {filteredIndices.length === 0 && (
                                <div className="text-center text-gray-400 py-10">
                                    No questions match this filter.
                                </div>
                            )}
                        </ScrollArea>

                        {/* Legend */}
                        <div className="px-6 py-3 border-t bg-gray-50 flex flex-wrap gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                                Answered
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
                                Visited
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
                                Not Visited
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Flag className="h-3 w-3 text-amber-500 fill-amber-500" />
                                Flagged
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================
// PRE-SUBMIT SUMMARY (shown before final submission)
// ============================================

interface PreSubmitSummaryProps {
    totalQuestions: number;
    answeredSet: Set<string>;
    flaggedSet: Set<string>;
    questionsOrder: string[];
    hasDualEssay?: boolean;
    essayQuestionIds?: string[];
    onGoBack: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function PreSubmitSummary({
    totalQuestions,
    answeredSet,
    flaggedSet,
    questionsOrder,
    hasDualEssay = false,
    essayQuestionIds = [],
    onGoBack,
    onSubmit,
    isSubmitting,
}: PreSubmitSummaryProps) {
    // For dual-essay tests, count each essay pair as requiring only 1 answer.
    // If at least 1 of the 2 essays is answered, the essay slot is "done".
    const essayAnswered = essayQuestionIds.filter((id) =>
        answeredSet.has(id),
    ).length;
    const essaySlotAnswered = hasDualEssay
        ? Math.min(1, essayAnswered) // at most 1 slot for 2 essays
        : essayAnswered;
    const nonEssayTotal = hasDualEssay
        ? totalQuestions - 2 // subtract both essay questions
        : totalQuestions;
    const nonEssayAnswered = hasDualEssay
        ? answeredSet.size - essayAnswered
        : answeredSet.size;

    const displayTotal = hasDualEssay ? nonEssayTotal + 1 : totalQuestions;
    const displayAnswered = hasDualEssay
        ? nonEssayAnswered + essaySlotAnswered
        : answeredSet.size;
    const unanswered = displayTotal - displayAnswered;
    const flaggedCount = flaggedSet.size;

    return (
        <div className="min-h-screen bg-[#e8eef3] flex flex-col font-[family-name:var(--font-inter)]">
            <div className="bg-[#1a2744] text-white py-4 px-6">
                <h1 className="text-lg font-semibold">Test Summary</h1>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border p-8 space-y-6">
                    <h2 className="text-2xl font-bold text-[#1a2744] text-center">
                        Ready to Submit?
                    </h2>

                    {hasDualEssay && (
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                            <span className="font-semibold">Note:</span> This test has 2 essay questions you only need to attempt <span className="font-semibold">1</span>. You will be asked to select which essay to submit for evaluation.
                        </div>
                    )}

                    <div className="space-y-4">
                        <SummaryRow
                            label="Total Questions"
                            value={displayTotal}
                            color="text-neutral-800"
                        />
                        <SummaryRow
                            label="Answered"
                            value={displayAnswered}
                            color="text-blue-600"
                        />
                        {unanswered > 0 && (
                            <SummaryRow
                                label="Unanswered"
                                value={unanswered}
                                color="text-gray-500"
                            />
                        )}
                        {flaggedCount > 0 && (
                            <SummaryRow
                                label="Flagged for Review"
                                value={flaggedCount}
                                color="text-amber-600"
                            />
                        )}
                    </div>

                    {(unanswered > 0 || flaggedCount > 0) && (
                        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-sm text-amber-800">
                                {unanswered > 0 &&
                                    `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. `}
                                {flaggedCount > 0 &&
                                    `You have ${flaggedCount} flagged question${flaggedCount > 1 ? "s" : ""} for review. `}
                                Are you sure you want to submit?
                            </p>
                        </div>
                    )}

                    {/* Question grid mini-view */}
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">
                            Question Overview
                        </h3>
                        <div className="grid grid-cols-10 gap-1.5">
                            {questionsOrder.map((qId, idx) => {
                                const isEssay = essayQuestionIds.includes(qId);
                                const isAnswered = answeredSet.has(qId);
                                const isFlagged = flaggedSet.has(qId);
                                return (
                                    <div
                                        key={idx}
                                        title={
                                            hasDualEssay && isEssay
                                                ? "Essay (attempt any 1 of 2)"
                                                : undefined
                                        }
                                        className={`relative w-full aspect-square rounded flex items-center justify-center text-xs font-medium
                      ${isAnswered ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}
                      ${hasDualEssay && isEssay ? "ring-2 ring-amber-400" : ""}
                    `}
                                    >
                                        {idx + 1}
                                        {isFlagged && (
                                            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {hasDualEssay && (
                            <p className="text-xs text-amber-700 mt-2">
                                <span className="inline-block w-3 h-3 rounded border-2 border-amber-400 mr-1 align-middle" />
                                Question marked in blue is answered.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={onGoBack}
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            Go Back
                        </Button>
                        <Button
                            onClick={onSubmit}
                            className="flex-1 bg-[#1a2744] hover:bg-[#1a2744]/90"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : "Submit Test"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryRow({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">{label}</span>
            <span className={`text-lg font-semibold ${color}`}>{value}</span>
        </div>
    );
}
