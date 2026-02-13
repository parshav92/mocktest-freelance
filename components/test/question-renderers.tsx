"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StorageImage } from "@/components/ui/storage-image";
import type {
    QuestionForTest,
    MCQContent,
    FillBlankContent,
    FillMissingSentenceContent,
    EssayContent,
    MCQOption,
} from "@/types/test";

// ============================================
// LAYOUT TYPE
// ============================================

type RendererLayout = "split" | "stacked";

// ============================================
// MCQ: QUESTION STEM
// ============================================

const MCQQuestionStem = memo(({ content }: { content: MCQContent }) => {
    return (
        <div className="space-y-4">
            <p className="text-base leading-relaxed text-foreground whitespace-pre-line">
                {content.question}
            </p>
            {content.question_image && (
                <StorageImage
                    src={content.question_image}
                    alt="Question image"
                    className="max-w-full rounded-lg border"
                />
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
                                        {optionText}
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
        if (layout === "split") {
            return (
                <div className="grid grid-cols-2 gap-0 min-h-0">
                    {/* Left column: Question stem */}
                    <div className="pr-8 border-r border-gray-200">
                        <MCQQuestionStem content={content} />
                    </div>

                    {/* Right column: Options */}
                    <div className="pl-8">
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
            <div className="space-y-6">
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

        const handleSelect = (blankIndex: number, optionIndex: number) => {
            const newAnswers = [...answers];
            newAnswers[blankIndex] = optionIndex;
            onSelect(newAnswers);
        };

        // Split passage at blank markers
        const parts = content.passage_text.split(/___+|\[\d+\]|\{blank\}/gi);

        return (
            <div className="space-y-6">
                <div className="text-base leading-relaxed text-foreground">
                    {parts.map((part, index) => (
                        <span key={`fb-part-${index}`}>
                            {part}
                            {index < content.blanks.length && (
                                <select
                                    value={answers[index] ?? -1}
                                    onChange={(e) =>
                                        handleSelect(
                                            index,
                                            parseInt(e.target.value),
                                        )
                                    }
                                    className={cn(
                                        "mx-1 px-3 py-1.5 rounded-md bg-white text-sm transition-colors cursor-pointer",
                                        "border-2 border-gray-300 text-gray-800",
                                        "focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20",
                                        "hover:border-gray-400",
                                        answers[index] !== undefined &&
                                            answers[index] !== -1 &&
                                            "border-[#2563eb]/50 bg-blue-50/50",
                                    )}
                                >
                                    <option value={-1}>Select...</option>
                                    {content.blanks[index]?.options.map(
                                        (opt, optIdx) => (
                                            <option
                                                key={`fb-${index}-opt-${optIdx}`}
                                                value={optIdx}
                                            >
                                                {opt}
                                            </option>
                                        ),
                                    )}
                                </select>
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

export const FillMissingSentenceRenderer = memo(
    ({ content, selected, onSelect }: FillMissingSentenceRendererProps) => {
        const mapping = selected || {};

        // Find gap markers in passage
        const gapPattern = /\{(GAP_\d+)\}/g;
        const parts: Array<{ type: "text" | "gap"; value: string }> = [];
        let lastIndex = 0;
        let match;

        while ((match = gapPattern.exec(content.passage_with_gaps)) !== null) {
            if (match.index > lastIndex) {
                parts.push({
                    type: "text",
                    value: content.passage_with_gaps.slice(
                        lastIndex,
                        match.index,
                    ),
                });
            }
            parts.push({ type: "gap", value: match[1] });
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < content.passage_with_gaps.length) {
            parts.push({
                type: "text",
                value: content.passage_with_gaps.slice(lastIndex),
            });
        }

        // Get used sentence indices
        const usedIndices = new Set(Object.values(mapping));

        const handleSelect = (gapKey: string, sentenceIndex: number) => {
            const newMapping = { ...mapping };
            if (sentenceIndex === -1) {
                delete newMapping[gapKey];
            } else {
                newMapping[gapKey] = sentenceIndex;
            }
            onSelect(newMapping);
        };

        return (
            <div className="space-y-6">
                {/* Passage with gaps */}
                <div className="text-base leading-relaxed text-foreground">
                    {parts.map((part, i) => {
                        if (part.type === "text") {
                            return (
                                <span key={`fms-text-${i}`}>{part.value}</span>
                            );
                        }
                        const hasSelection =
                            mapping[part.value] !== undefined &&
                            mapping[part.value] !== -1;
                        return (
                            <select
                                key={`fms-gap-${i}`}
                                value={mapping[part.value] ?? -1}
                                onChange={(e) =>
                                    handleSelect(
                                        part.value,
                                        parseInt(e.target.value),
                                    )
                                }
                                className={cn(
                                    "mx-1 px-3 py-1.5 rounded-md bg-white text-sm transition-colors cursor-pointer min-w-50",
                                    "border-2 border-gray-300 text-gray-800",
                                    "focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20",
                                    "hover:border-gray-400",
                                    hasSelection &&
                                        "border-[#2563eb]/50 bg-blue-50/50",
                                )}
                            >
                                <option value={-1}>Select a sentence...</option>
                                {content.sentences.map((sentence, idx) => (
                                    <option
                                        key={`fms-sentence-${idx}`}
                                        value={idx}
                                        disabled={
                                            usedIndices.has(idx) &&
                                            mapping[part.value] !== idx
                                        }
                                    >
                                        {sentence}
                                    </option>
                                ))}
                            </select>
                        );
                    })}
                </div>

                <Separator />

                {/* Available sentences reference */}
                <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Available Sentences
                    </h4>
                    <div className="space-y-2">
                        {content.sentences.map((sentence, idx) => {
                            const isUsed = usedIndices.has(idx);
                            return (
                                <div
                                    key={`fms-ref-${idx}`}
                                    className={cn(
                                        "text-sm px-3 py-2.5 rounded-lg flex items-start gap-2.5 transition-all",
                                        isUsed
                                            ? "bg-blue-50 text-blue-600/60 line-through"
                                            : "bg-gray-50 text-gray-700 border border-gray-200",
                                    )}
                                >
                                    <Badge
                                        variant={isUsed ? "default" : "outline"}
                                        className={cn(
                                            "shrink-0 text-xs h-5 w-5 flex items-center justify-center p-0 rounded-full font-semibold",
                                            isUsed
                                                ? "bg-[#2563eb]/80"
                                                : "text-gray-500",
                                        )}
                                    >
                                        {String.fromCharCode(65 + idx)}
                                    </Badge>
                                    <span className="flex-1">{sentence}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
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
}

export const EssayRenderer = memo(
    ({ content, selected, onSelect, layout }: EssayRendererProps) => {
        const wordCount = (selected || "").split(/\s+/).filter(Boolean).length;
        const isOverLimit = wordCount > content.word_limit;

        const promptSection = (
            <div className="space-y-4">
                <p className="text-base leading-relaxed text-foreground whitespace-pre-line">
                    {content.prompt}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-xs gap-1">
                        Word limit: {content.word_limit}
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                        Time: {content.time_limit_mins} min
                    </Badge>
                </div>
            </div>
        );

        const editorSection = (
            <div className="space-y-2">
                <textarea
                    value={selected || ""}
                    onChange={(e) => onSelect(e.target.value)}
                    placeholder="Write your essay here..."
                    rows={layout === "split" ? 20 : 15}
                    className={cn(
                        "w-full p-4 rounded-lg text-sm text-foreground leading-relaxed resize-y transition-colors",
                        "border-2 border-gray-200 bg-white",
                        "focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20",
                        "placeholder:text-muted-foreground",
                    )}
                />
                <div className="flex items-center justify-end">
                    <span
                        className={cn(
                            "text-xs font-medium tabular-nums",
                            isOverLimit
                                ? "text-red-600"
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
                <div className="grid grid-cols-2 gap-0 min-h-0">
                    {/* Left column: Prompt */}
                    <div className="pr-8 border-r border-gray-200">
                        {promptSection}
                    </div>

                    {/* Right column: Editor */}
                    <div className="pl-8">
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
        case "poem_mcq":
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
