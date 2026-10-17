"use client";

import { memo, useMemo, useState } from "react";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import { cn, countWords } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StorageImage } from "@/components/ui/storage-image";
import { SafeRichTextEditor } from "@/components/ui/rich-text-editor";
import { ESSAY_CONFIG, isWithinWordLimit } from "@/lib/config/essay-config";
import {
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    X,
    XCircle,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type {
    QuestionForTest,
    MCQContent,
    FillBlankContent,
    FillMissingSentenceContent,
    EssayContent,
    MCQOption,
} from "@/types/test";
import { MathText } from "@/components/ui/math-text";
import { ImageEnhancedText } from "@/components/ui/image-enhanced-text";
import {
    getEssayPromptImages,
    getUnreferencedImages,
} from "@/lib/utils/question-content";
import { extractPassageTitleAndText } from "@/lib/utils/passage";

// ============================================
// SEEDED SHUFFLE UTILITY
// ============================================

/** Simple numeric hash from a string (djb2). */
function hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/**
 * Return a shuffled copy of `indices` using a deterministic seed.
 * Same seed always produces the same permutation.
 */
function seededShuffle(indices: number[], seed: number): number[] {
    const arr = [...indices];
    let s = seed;
    for (let i = arr.length - 1; i > 0; i--) {
        // Simple LCG-style PRNG
        s = (s * 1664525 + 1013904223) | 0;
        const j = Math.abs(s) % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ============================================
// LAYOUT TYPE
// ============================================

type RendererLayout = "split" | "stacked";

// ============================================
// MCQ: QUESTION STEM
// ============================================

const MCQQuestionStem = memo(({ content }: { content: MCQContent }) => {
    // Normalize all legacy field variants into a single images array
    // Priority: question_images (new) > question_image / question_image_url (old single-URL fields)
    const images: string[] | undefined =
        content.question_images ??
        (content.question_image
            ? [content.question_image]
            : content.question_image_url
              ? [content.question_image_url]
              : undefined);

    // Find which image indices are referenced via [img:N] syntax
    const imagePattern = /\[img:(\d+)\]/g;
    const referencedIndices = new Set<number>();
    let match;
    while ((match = imagePattern.exec(content.question)) !== null) {
        const index = parseInt(match[1], 10) - 1; // Convert to 0-based
        referencedIndices.add(index);
    }

    // Separate referenced vs unreferenced images
    const unreferencedImages: string[] = [];
    if (images) {
        images.forEach((img, idx) => {
            if (!referencedIndices.has(idx)) {
                unreferencedImages.push(img);
            }
        });
    }

    return (
        <div className="space-y-4">
            <div className="text-base leading-relaxed text-foreground whitespace-pre-line">
                <ImageEnhancedText content={content.question} images={images} />
            </div>
            {unreferencedImages.length > 0 && (
                <div
                    className={`grid gap-3 ${
                        unreferencedImages.length > 1
                            ? "grid-cols-1 sm:grid-cols-2"
                            : ""
                    }`}
                >
                    {unreferencedImages.map((imgUrl, idx) => (
                        <img
                            key={`unreferenced-img-${idx}`}
                            src={imgUrl}
                            alt={`Question image ${idx + 1}`}
                            className="max-w-full rounded-lg border border-gray-200"
                        />
                    ))}
                </div>
            )}
        </div>
    );
});
MCQQuestionStem.displayName = "MCQQuestionStem";

// ============================================
// MCQ: OPTIONS LIST
// ============================================

const MCQOptionsList = memo(
    ({
        options,
        selected,
        onSelect,
    }: {
        options: MCQOption[];
        selected: string | null;
        onSelect: (key: string) => void;
    }) => {
        // Normalize selected value for comparison
        const normalizedSelected =
            selected?.toString().trim().toUpperCase() || null;

        return (
            <div
                className="space-y-3"
                role="radiogroup"
                aria-label="Answer options"
            >
                {options.map((option, index) => {
                    const optionLabel = option.label;
                    const optionText = option.text;
                    const optionImage = option.image_url;

                    // Skip if label is missing
                    if (!optionLabel) {
                        console.error(
                            "Invalid option at index",
                            index,
                            ":",
                            option,
                        );
                        return null;
                    }

                    const normalizedLabel = optionLabel
                        .toString()
                        .trim()
                        .toUpperCase();
                    const isSelected = normalizedSelected === normalizedLabel;
                    return (
                        <button
                            key={`mcq-opt-${index}`}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => onSelect(optionLabel)}
                            className={cn(
                                "w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left cursor-pointer",
                                isSelected
                                    ? "border-[#2563eb] bg-blue-50/80 shadow-sm"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50",
                            )}
                        >
                            <span
                                className={cn(
                                    "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                                    isSelected
                                        ? "bg-[#2563eb] text-white"
                                        : "bg-gray-100 text-gray-600",
                                )}
                            >
                                {optionLabel}
                            </span>
                            <div className="flex-1 pt-1">
                                {optionText && (
                                    <span
                                        className={cn(
                                            "text-sm leading-relaxed",
                                            isSelected
                                                ? "text-gray-900 font-medium"
                                                : "text-gray-700",
                                        )}
                                    >
                                        <MathText content={optionText} />
                                    </span>
                                )}
                                {optionImage && (
                                    <StorageImage
                                        src={optionImage}
                                        alt={`Option ${optionLabel}`}
                                        className="max-w-xs rounded mt-2"
                                        width={300}
                                        height={200}
                                    />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    },
);
MCQOptionsList.displayName = "MCQOptionsList";

// ============================================
// MCQ RENDERER
// ============================================

interface MCQRendererProps {
    content: MCQContent;
    selected: string | null;
    onSelect: (key: string) => void;
    layout: RendererLayout;
}

export const MCQRenderer = memo(
    ({ content, selected, onSelect, layout }: MCQRendererProps) => {
        const [optionsCollapsed, setOptionsCollapsed] = useState(false);

        if (layout === "split") {
            return (
                <div id="split" className="flex h-full min-h-0 relative">
                    {/* Left column: Question stem — independent scroll */}
                    <div className="flex-1 min-h-0 overflow-y-auto pr-4 transition-all duration-300 ease-in-out">
                        <MCQQuestionStem content={content} />
                    </div>

                    {/* Divider gutter — keeps toggle clear of pane scrollbars */}
                    <div className="relative w-8 shrink-0 self-stretch">
                        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-200" />
                        <button
                            onClick={() =>
                                setOptionsCollapsed(!optionsCollapsed)
                            }
                            className={cn(
                                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                                "w-6 h-12 flex items-center justify-center",
                                "bg-white border border-gray-300 rounded-full shadow-sm",
                                "hover:bg-gray-50 hover:border-gray-400 transition-colors",
                                "z-10 cursor-pointer",
                            )}
                            title={
                                optionsCollapsed
                                    ? "Show options"
                                    : "Hide options"
                            }
                        >
                            {optionsCollapsed ? (
                                <ChevronLeft className="h-4 w-4 text-gray-600" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                            )}
                        </button>
                    </div>

                    {/* Right column: Options — independent scroll */}
                    <div
                        className={cn(
                            "transition-[width] duration-300 ease-in-out overflow-y-auto min-h-0",
                            optionsCollapsed
                                ? "w-0 overflow-hidden"
                                : "flex-1 pl-4",
                        )}
                    >
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                            Choose your answer
                        </p>
                        <MCQOptionsList
                            options={content.options}
                            selected={selected}
                            onSelect={onSelect}
                        />
                    </div>
                </div>
            );
        }
        // Stacked layout (used when passage panel is already visible)
        return (
            <div id="stacked" className="space-y-6">
                <MCQQuestionStem content={content} />
                <Separator />
                <MCQOptionsList
                    options={content.options}
                    selected={selected}
                    onSelect={onSelect}
                />
            </div>
        );
    },
);
MCQRenderer.displayName = "MCQRenderer";

// ============================================
// FILL BLANK DROPDOWN RENDERER
// ============================================

interface FillBlankRendererProps {
    content: FillBlankContent;
    selected: number[] | null;
    onSelect: (answers: number[]) => void;
}

export const FillBlankRenderer = memo(
    ({ content, selected, onSelect }: FillBlankRendererProps) => {
        const answers = selected || new Array(content.blanks.length).fill(-1);

        // Stable shuffled index maps per blank (deterministic per option set)
        const shuffledMaps = useMemo(() => {
            return content.blanks.map((blank, blankIdx) => {
                const seed = hashString(
                    `fb-${blankIdx}-${blank.options.join("|")}`,
                );
                const indices = blank.options.map((_, i) => i);
                return seededShuffle(indices, seed);
            });
        }, [content.blanks]);

        const handleSelect = (blankIndex: number, optionIndex: number) => {
            const newAnswers = [...answers];
            newAnswers[blankIndex] = optionIndex;
            onSelect(newAnswers);
        };

        const { title: passageTitle, text: passageText } = useMemo(
            () =>
                extractPassageTitleAndText(
                    content.passage_text,
                    (
                        content as unknown as {
                            title?: string;
                            passage_title?: string;
                        }
                    ).title ||
                        (
                            content as unknown as {
                                title?: string;
                                passage_title?: string;
                            }
                        ).passage_title,
                ),
            [content],
        );

        // Split passage at blank markers
        const parts = passageText.split(/___+|\[\d+\]|\{blank\}/gi);

        return (
            <div className="space-y-6">
                {passageTitle && (
                    <h3 className="text-lg font-bold text-[#1a2744] mb-4 text-center">
                        {passageTitle}
                    </h3>
                )}
                <div className="text-base leading-relaxed text-foreground whitespace-pre-line">
                    {parts.map((part, index) => (
                        <span key={`fb-part-${index}`}>
                            <ImageEnhancedText
                                content={part}
                                images={content.passage_images}
                            />
                            {index < content.blanks.length && (
                                <Select
                                    value={
                                        answers[index] !== undefined &&
                                        answers[index] !== -1
                                            ? String(answers[index])
                                            : ""
                                    }
                                    onValueChange={(val) =>
                                        handleSelect(index, parseInt(val))
                                    }
                                >
                                    <SelectTrigger
                                        className={cn(
                                            "mx-1 inline-flex h-8 w-auto min-w-32 text-sm",
                                            answers[index] !== undefined &&
                                                answers[index] !== -1 &&
                                                "border-[#2563eb]/60 bg-blue-50/50",
                                        )}
                                    >
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(
                                            shuffledMaps[index] ??
                                            content.blanks[index]?.options.map(
                                                (_, i) => i,
                                            ) ??
                                            []
                                        ).map((origIdx) => (
                                            <SelectItem
                                                key={`fb-${index}-opt-${origIdx}`}
                                                value={String(origIdx)}
                                            >
                                                <MathText
                                                    content={
                                                        content.blanks[index]
                                                            .options[origIdx]
                                                    }
                                                />
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </span>
                    ))}
                </div>
            </div>
        );
    },
);
FillBlankRenderer.displayName = "FillBlankRenderer";

// ============================================
// FILL MISSING SENTENCE RENDERER
// ============================================

interface FillMissingSentenceRendererProps {
    content: FillMissingSentenceContent;
    selected: Record<string, number> | null;
    onSelect: (mapping: Record<string, number>) => void;
}

function FmsSentenceCard({
    index,
    displayIndex,
    sentence,
    isUsed,
}: {
    index: number;
    displayIndex: number;
    sentence: string;
    isUsed: boolean;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `fms-sentence-${index}`,
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "flex items-start gap-2 rounded-lg border p-3 text-sm cursor-grab touch-none transition-shadow",
                isDragging
                    ? "border-blue-500 bg-blue-50 opacity-40"
                    : isUsed
                      ? "border-blue-200 bg-blue-50/60 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:shadow-sm",
            )}
        >
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <Badge
                variant={isUsed ? "default" : "outline"}
                className={cn(
                    "h-5 w-5 shrink-0 rounded-full p-0 text-xs font-semibold",
                    isUsed && "bg-[#2563eb]",
                )}
            >
                {String.fromCharCode(65 + displayIndex)}
            </Badge>
            <span className="flex-1">
                <MathText content={sentence} />
            </span>
        </div>
    );
}

function FmsGapRow({
    gapKey,
    sentence,
    onClear,
}: {
    gapKey: string;
    sentence?: string;
    onClear: () => void;
}) {
    const { isOver, setNodeRef } = useDroppable({ id: `fms-gap-${gapKey}` });
    const gapLabel = gapKey.replace("GAP_", "");

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex min-h-14 items-stretch overflow-hidden rounded-lg border border-[#6d86bb] bg-white transition-colors",
                isOver ? "ring-2 ring-blue-400" : "shadow-sm",
            )}
        >
            <div className="flex w-24 shrink-0 items-center justify-center bg-[#6d86bb] px-3 text-sm font-medium text-white sm:w-32">
                Gap {gapLabel}
            </div>
            {sentence ? (
                <button
                    type="button"
                    onClick={onClear}
                    className="group relative flex min-w-0 flex-1 items-center gap-2 bg-white px-3 py-2 pr-10 text-left text-sm text-slate-700"
                    title="Click to remove this sentence"
                >
                    <span className="min-w-0">
                        <MathText content={sentence} />
                    </span>
                    <span
                        aria-hidden="true"
                        className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition-colors group-hover:bg-slate-300 group-hover:text-slate-700"
                    >
                        <X className="h-3 w-3" />
                    </span>
                </button>
            ) : (
                <span className="flex min-w-0 flex-1 items-center px-3 text-sm italic text-slate-400">
                    Drag a sentence here
                </span>
            )}
        </div>
    );
}

function FmsSentenceDragOverlay({ sentence }: { sentence: string }) {
    return (
        <div className="flex max-w-md items-start gap-2 rounded-lg border-2 border-[#6d86bb] bg-white p-3 text-sm text-slate-700 shadow-xl">
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span className="flex-1">
                <MathText content={sentence} />
            </span>
        </div>
    );
}

export function FmsSolutionPanel({
    sentences,
    studentMapping,
    correctMapping,
}: {
    sentences: string[];
    studentMapping: Record<string, number>;
    correctMapping: Record<string, number>;
}) {
    const usedSentenceIndices = new Set(Object.values(studentMapping));
    const gapEntries = Object.keys(correctMapping).sort(
        (a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")),
    );

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Unselected sentences
                </p>
                <div className="space-y-2">
                    {sentences.map((sentence, sentenceIdx) => {
                        if (usedSentenceIndices.has(sentenceIdx)) return null;
                        return (
                            <div
                                key={`fms-solution-unused-${sentenceIdx}`}
                                className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700"
                            >
                                <Badge
                                    variant="outline"
                                    className="h-5 w-5 shrink-0 rounded-full p-0 text-xs"
                                >
                                    {String.fromCharCode(65 + sentenceIdx)}
                                </Badge>
                                <span className="flex-1">
                                    <MathText content={sentence} />
                                </span>
                            </div>
                        );
                    })}
                    {sentences.every((_, sentenceIdx) =>
                        usedSentenceIndices.has(sentenceIdx),
                    ) && (
                        <p className="py-3 text-center text-sm italic text-slate-400">
                            All sentences have been placed.
                        </p>
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Dropped answers
                </p>
                <div className="space-y-2">
                    {gapEntries.map((gapKey) => {
                        const studentIdx = studentMapping[gapKey];
                        const correctIdx = correctMapping[gapKey];
                        const isCorrect = studentIdx === correctIdx;
                        return (
                            <div
                                key={`fms-solution-drop-${gapKey}`}
                                className="flex min-h-14 items-stretch overflow-hidden rounded-lg border border-[#6d86bb] bg-white"
                            >
                                <div className="flex w-24 shrink-0 items-center justify-center bg-[#6d86bb] px-3 text-sm font-medium text-white sm:w-32">
                                    {gapKey.replace("GAP_", "Gap ")}
                                </div>
                                <div
                                    className={cn(
                                        "flex min-w-0 flex-1 items-center gap-2 px-3 py-2 pr-10 text-sm",
                                        isCorrect
                                            ? "text-emerald-700"
                                            : "text-rose-700",
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        {studentIdx !== undefined ? (
                                            <MathText
                                                content={sentences[studentIdx]}
                                            />
                                        ) : (
                                            <span className="italic text-slate-400">
                                                Not answered
                                            </span>
                                        )}
                                    </span>
                                    {isCorrect ? (
                                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                                    ) : (
                                        <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Correct answers
                </p>
                <div className="space-y-2">
                    {gapEntries.map((gapKey) => (
                        <div
                            key={`fms-solution-correct-${gapKey}`}
                            className="flex min-h-14 items-stretch overflow-hidden rounded-lg border border-[#6d86bb] bg-white"
                        >
                            <div className="flex w-24 shrink-0 items-center justify-center bg-[#6d86bb] px-3 text-sm font-medium text-white sm:w-32">
                                {gapKey.replace("GAP_", "Gap ")}
                            </div>
                            <div className="flex min-w-0 flex-1 items-center px-3 py-2 text-sm text-slate-700">
                                <MathText
                                    content={sentences[correctMapping[gapKey]]}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export const FillMissingSentenceRenderer = memo(
    ({ content, selected, onSelect }: FillMissingSentenceRendererProps) => {
        const mapping = selected || {};
        const [activeSentenceIndex, setActiveSentenceIndex] = useState<
            number | null
        >(null);

        // Stable shuffled sentence order (deterministic per sentence set)
        const shuffledSentenceIndices = useMemo(() => {
            const seed = hashString(`fms-${content.sentences.join("|")}`);
            const indices = content.sentences.map((_, i) => i);
            return seededShuffle(indices, seed);
        }, [content.sentences]);

        const { title: passageTitle, text: passageWithGaps } = useMemo(
            () =>
                extractPassageTitleAndText(
                    content.passage_with_gaps,
                    (
                        content as unknown as {
                            title?: string;
                            passage_title?: string;
                        }
                    ).title ||
                        (
                            content as unknown as {
                                title?: string;
                                passage_title?: string;
                            }
                        ).passage_title,
                ),
            [content],
        );

        // Find gap markers in passage
        const gapPattern = /\{(GAP_\d+)\}/g;
        const parts: Array<{ type: "text" | "gap"; value: string }> = [];
        let lastIndex = 0;
        let match;

        while ((match = gapPattern.exec(passageWithGaps)) !== null) {
            if (match.index > lastIndex) {
                parts.push({
                    type: "text",
                    value: passageWithGaps.slice(lastIndex, match.index),
                });
            }
            parts.push({ type: "gap", value: match[1] });
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < passageWithGaps.length) {
            parts.push({
                type: "text",
                value: passageWithGaps.slice(lastIndex),
            });
        }

        // Get used sentence indices
        const usedIndices = new Set(Object.values(mapping));

        const handleSelect = (gapKey: string, sentenceIndex: number) => {
            const newMapping = { ...mapping };
            if (sentenceIndex === -1) {
                delete newMapping[gapKey];
            } else {
                for (const [key, value] of Object.entries(newMapping)) {
                    if (key !== gapKey && value === sentenceIndex) {
                        delete newMapping[key];
                    }
                }
                newMapping[gapKey] = sentenceIndex;
            }
            onSelect(newMapping);
        };

        const sensors = useSensors(
            useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        );

        const handleDragEnd = ({ active, over }: DragEndEvent) => {
            setActiveSentenceIndex(null);
            if (
                !over ||
                typeof active.id !== "string" ||
                typeof over.id !== "string"
            )
                return;
            const sentenceMatch = active.id.match(/^fms-sentence-(\d+)$/);
            const gapMatch = over.id.match(/^fms-gap-(GAP_\d+)$/);
            if (!sentenceMatch || !gapMatch) return;
            handleSelect(gapMatch[1], Number(sentenceMatch[1]));
        };

        const handleDragStart = ({
            active,
        }: {
            active: { id: string | number };
        }) => {
            const sentenceMatch = String(active.id).match(
                /^fms-sentence-(\d+)$/,
            );
            setActiveSentenceIndex(
                sentenceMatch ? Number(sentenceMatch[1]) : null,
            );
        };

        const gapKeys = parts
            .filter((part) => part.type === "gap")
            .map((part) => part.value);

        return (
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveSentenceIndex(null)}
            >
                <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]">
                    <div className="min-h-0 min-w-0 overflow-y-auto pr-2">
                        {passageTitle && (
                            <h3 className="text-lg font-bold text-[#1a2744] text-center">
                                {passageTitle}
                            </h3>
                        )}
                        <div className="text-base leading-relaxed text-foreground whitespace-pre-line">
                            {parts.map((part, i) => {
                                if (part.type === "text") {
                                    return (
                                        <span key={`fms-text-${i}`}>
                                            <ImageEnhancedText
                                                content={part.value}
                                                images={content.passage_images}
                                            />
                                        </span>
                                    );
                                }

                                const gapIndex = gapKeys.indexOf(part.value);
                                return (
                                    <span
                                        key={`fms-gap-marker-${i}`}
                                        className="mx-1 whitespace-nowrap text-sm font-extrabold text-slate-700"
                                    >
                                        ({String.fromCharCode(65 + gapIndex)}
                                        )......
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-col overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                        <div className="min-h-[50%] shrink-0 p-4">
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Sentences
                            </h4>
                            <div className="space-y-2">
                                {shuffledSentenceIndices.filter(
                                    (origIdx) => !usedIndices.has(origIdx),
                                ).length === 0 ? (
                                    <p className="py-4 text-center text-sm italic text-slate-400">
                                        All sentences have been placed.
                                    </p>
                                ) : (
                                    shuffledSentenceIndices
                                        .filter(
                                            (origIdx) =>
                                                !usedIndices.has(origIdx),
                                        )
                                        .map((origIdx, displayIdx) => (
                                            <FmsSentenceCard
                                                key={`fms-sentence-${origIdx}`}
                                                index={origIdx}
                                                displayIndex={displayIdx}
                                                sentence={
                                                    content.sentences[origIdx]
                                                }
                                                isUsed={false}
                                            />
                                        ))
                                )}
                            </div>
                        </div>
                        <div className="min-h-[50%] shrink-0 border-t border-slate-200 bg-white p-4">
                            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Drop answers
                            </h4>
                            <div className="space-y-2">
                                {gapKeys.map((gapKey) => (
                                    <FmsGapRow
                                        key={gapKey}
                                        gapKey={gapKey}
                                        sentence={
                                            mapping[gapKey] !== undefined
                                                ? content.sentences[
                                                      mapping[gapKey]
                                                  ]
                                                : undefined
                                        }
                                        onClear={() => handleSelect(gapKey, -1)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <DragOverlay>
                    {activeSentenceIndex !== null ? (
                        <FmsSentenceDragOverlay
                            sentence={content.sentences[activeSentenceIndex]}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        );
    },
);
FillMissingSentenceRenderer.displayName = "FillMissingSentenceRenderer";

// ============================================
// ESSAY RENDERER
// ============================================

interface EssayRendererProps {
    content: EssayContent;
    selected: string | null;
    onSelect: (text: string) => void;
    layout: RendererLayout;
    /** Unique question ID - forces editor remount when switching questions */
    questionId: string;
}

export const EssayRenderer = memo(
    ({
        content,
        selected,
        onSelect,
        layout,
        questionId,
    }: EssayRendererProps) => {
        const [editorCollapsed, setEditorCollapsed] = useState(false);
        const wordCount = countWords(selected || "");

        // Use config helper for word limit status
        const { isOver: isOverLimit, isApproaching: isApproachingLimit } =
            isWithinWordLimit(wordCount, content.word_limit);

        // Word limit is now enforced at the editor level via WordLimitExtension
        const handleChange = (val: string) => {
            onSelect(val);
        };

        // Get editor height from config
        const editorHeight =
            layout === "split"
                ? ESSAY_CONFIG.editor.heightSplit
                : ESSAY_CONFIG.editor.heightStacked;

        const promptImages = getEssayPromptImages(
            content as unknown as Record<string, unknown>,
        );
        const unreferencedPromptImages = getUnreferencedImages(
            content.prompt || "",
            promptImages,
        );

        const promptSection = (
            <div className="space-y-4">
                <div className="text-base leading-relaxed text-foreground whitespace-pre-line">
                    <ImageEnhancedText
                        content={content.prompt}
                        images={promptImages}
                    />
                </div>
                {unreferencedPromptImages.length > 0 && (
                    <div
                        className={`grid gap-3 ${
                            unreferencedPromptImages.length > 1
                                ? "grid-cols-1 sm:grid-cols-2"
                                : ""
                        }`}
                    >
                        {unreferencedPromptImages.map((imgUrl, idx) => (
                            <img
                                key={`essay-prompt-img-${idx}`}
                                src={imgUrl}
                                alt={`Prompt image ${idx + 1}`}
                                className="max-w-full rounded-lg border border-gray-200"
                            />
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-xs gap-1">
                        Word limit: {content.word_limit}
                    </Badge>
                    {content.time_mins ? (
                        <Badge variant="outline" className="text-xs gap-1">
                            Time: {content.time_mins} min
                        </Badge>
                    ) : null}
                </div>
            </div>
        );

        const editorSection = (
            <div className="space-y-2">
                <SafeRichTextEditor
                    value={selected || ""}
                    onChange={handleChange}
                    placeholder={ESSAY_CONFIG.editor.placeholder}
                    height={editorHeight}
                    wordLimit={content.word_limit}
                    editorKey={questionId}
                />
                <div className="flex items-center justify-end gap-2">
                    {isOverLimit && (
                        <span className="text-xs font-medium text-red-600">
                            Word limit exceeded — please shorten your response.
                        </span>
                    )}
                    {!isOverLimit && isApproachingLimit && (
                        <span className="text-xs font-medium text-amber-600">
                            Approaching word limit
                        </span>
                    )}
                    <span
                        className={cn(
                            "text-xs font-medium tabular-nums",
                            isOverLimit
                                ? "text-red-600 font-bold"
                                : isApproachingLimit
                                  ? "text-amber-600"
                                  : "text-muted-foreground",
                        )}
                    >
                        {wordCount} / {content.word_limit} words
                    </span>
                </div>
            </div>
        );

        if (layout === "split") {
            return (
                <div className="flex h-full min-h-0 relative">
                    {/* Left column: Prompt — independent scroll */}
                    <div className="flex-1 min-h-0 overflow-y-auto pr-4 transition-all duration-300 ease-in-out">
                        {promptSection}
                    </div>

                    {/* Divider gutter — keeps toggle clear of pane scrollbars */}
                    <div className="relative w-8 shrink-0 self-stretch">
                        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-200" />
                        <button
                            onClick={() => setEditorCollapsed(!editorCollapsed)}
                            className={cn(
                                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                                "w-6 h-12 flex items-center justify-center",
                                "bg-white border border-gray-300 rounded-full shadow-sm",
                                "hover:bg-gray-50 hover:border-gray-400 transition-colors",
                                "z-10 cursor-pointer",
                            )}
                            title={
                                editorCollapsed ? "Show editor" : "Hide editor"
                            }
                        >
                            {editorCollapsed ? (
                                <ChevronLeft className="h-4 w-4 text-gray-600" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                            )}
                        </button>
                    </div>

                    {/* Right column: Editor — independent scroll */}
                    <div
                        className={cn(
                            "transition-[width] duration-300 ease-in-out min-h-0",
                            editorCollapsed
                                ? "w-0 overflow-hidden"
                                : "flex-1 overflow-y-auto pl-4",
                        )}
                    >
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                            Your response
                        </p>
                        {editorSection}
                    </div>
                </div>
            );
        }

        // Stacked layout
        return (
            <div className="space-y-6">
                {promptSection}
                <Separator />
                {editorSection}
            </div>
        );
    },
);
EssayRenderer.displayName = "EssayRenderer";

// ============================================
// MAIN QUESTION RENDERER DISPATCHER
// ============================================

interface QuestionRendererProps {
    question: QuestionForTest;
    answer: string | number[] | Record<string, number> | null;
    onAnswer: (value: string | number[] | Record<string, number>) => void;
    layout?: RendererLayout;
}

export function QuestionRenderer({
    question,
    answer,
    onAnswer,
    layout = "stacked",
}: QuestionRendererProps) {
    switch (question.question_type) {
        case "mcq":
        case "passage_mcq":
            return (
                <MCQRenderer
                    content={question.content as MCQContent}
                    selected={(answer as string) ?? null}
                    onSelect={onAnswer}
                    layout={layout}
                />
            );

        case "fill_blank_dropdown":
            return (
                <FillBlankRenderer
                    content={question.content as FillBlankContent}
                    selected={(answer as number[]) || null}
                    onSelect={onAnswer}
                />
            );

        case "fill_missing_sentence":
            return (
                <FillMissingSentenceRenderer
                    content={question.content as FillMissingSentenceContent}
                    selected={(answer as Record<string, number>) || null}
                    onSelect={onAnswer}
                />
            );

        case "essay":
            return (
                <EssayRenderer
                    content={question.content as EssayContent}
                    selected={(answer as string) || null}
                    onSelect={onAnswer}
                    layout={layout}
                    questionId={question.id}
                />
            );

        default:
            return (
                <div className="p-8 text-center text-muted-foreground">
                    Question type &ldquo;{question.question_type}&rdquo; is not
                    supported yet.
                </div>
            );
    }
}
