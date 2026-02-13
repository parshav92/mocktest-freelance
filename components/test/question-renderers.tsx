"use client";

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
// MCQ QUESTION RENDERER
// ============================================

interface MCQRendererProps {
  content: MCQContent;
  selected: string | null;
  onSelect: (key: string) => void;
}

export function MCQRenderer({ content, selected, onSelect }: MCQRendererProps) {
  return (
    <div className="space-y-4">
      {/* Question text */}
      <div className="text-base leading-relaxed text-gray-800">
        {content.question_text}
      </div>

      {/* Question image */}
      {content.question_image && (
        <div className="my-4">
          <StorageImage
            src={content.question_image}
            alt="Question image"
            className="max-w-full rounded-lg"
          />
        </div>
      )}

      {/* Options */}
      <div className="space-y-3 mt-6">
        {content.options.map((option: MCQOption) => {
          const isSelected = selected === option.key;
          return (
            <button
              key={option.key}
              onClick={() => onSelect(option.key)}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? "border-[#2563eb] bg-blue-50/50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  isSelected
                    ? "bg-[#2563eb] text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {option.key}
              </span>
              <div className="flex-1 pt-1">
                {option.text && (
                  <span className="text-gray-700">{option.text}</span>
                )}
                {option.image && (
                  <StorageImage
                    src={option.image}
                    alt={`Option ${option.key}`}
                    className="max-w-xs rounded mt-1"
                    width={300}
                    height={200}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// FILL BLANK DROPDOWN RENDERER
// ============================================

interface FillBlankRendererProps {
  content: FillBlankContent;
  selected: number[] | null;
  onSelect: (answers: number[]) => void;
}

export function FillBlankRenderer({
  content,
  selected,
  onSelect,
}: FillBlankRendererProps) {
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
      <div className="text-base leading-relaxed text-gray-800">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < content.blanks.length && (
              <select
                value={answers[index] ?? -1}
                onChange={(e) =>
                  handleSelect(index, parseInt(e.target.value))
                }
                className="mx-1 px-3 py-1.5 border-2 border-gray-300 rounded-md bg-white
                  text-gray-800 focus:border-[#2563eb] focus:outline-none transition-colors
                  hover:border-gray-400 cursor-pointer"
              >
                <option value={-1}>Select...</option>
                {content.blanks[index]?.options.map((opt, optIdx) => (
                  <option key={optIdx} value={optIdx}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================
// FILL MISSING SENTENCE RENDERER
// ============================================

interface FillMissingSentenceRendererProps {
  content: FillMissingSentenceContent;
  selected: Record<string, number> | null;
  onSelect: (mapping: Record<string, number>) => void;
}

export function FillMissingSentenceRenderer({
  content,
  selected,
  onSelect,
}: FillMissingSentenceRendererProps) {
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
        value: content.passage_with_gaps.slice(lastIndex, match.index),
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
      <div className="text-base leading-relaxed text-gray-800">
        {parts.map((part, i) => {
          if (part.type === "text") {
            return <span key={i}>{part.value}</span>;
          }
          return (
            <select
              key={i}
              value={mapping[part.value] ?? -1}
              onChange={(e) =>
                handleSelect(part.value, parseInt(e.target.value))
              }
              className="mx-1 px-3 py-1.5 border-2 border-gray-300 rounded-md bg-white
                text-gray-800 focus:border-[#2563eb] focus:outline-none transition-colors
                hover:border-gray-400 cursor-pointer min-w-[200px]"
            >
              <option value={-1}>Select a sentence...</option>
              {content.sentences.map((sentence, idx) => (
                <option
                  key={idx}
                  value={idx}
                  disabled={usedIndices.has(idx) && mapping[part.value] !== idx}
                >
                  {sentence}
                </option>
              ))}
            </select>
          );
        })}
      </div>

      {/* Available sentences reference */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-gray-600 mb-2">
          Available Sentences:
        </h4>
        <div className="space-y-2">
          {content.sentences.map((sentence, idx) => (
            <div
              key={idx}
              className={`text-sm px-3 py-2 rounded ${
                usedIndices.has(idx)
                  ? "bg-blue-50 text-blue-700 line-through opacity-60"
                  : "bg-gray-50 text-gray-700"
              }`}
            >
              {String.fromCharCode(65 + idx)}. {sentence}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// ESSAY RENDERER
// ============================================

interface EssayRendererProps {
  content: EssayContent;
  selected: string | null;
  onSelect: (text: string) => void;
}

export function EssayRenderer({
  content,
  selected,
  onSelect,
}: EssayRendererProps) {
  return (
    <div className="space-y-4">
      <div className="text-base leading-relaxed text-gray-800">
        {content.prompt}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>Word limit: {content.word_limit}</span>
        <span>Time: {content.time_limit_mins} min</span>
      </div>

      <div className="mt-4">
        <textarea
          value={selected || ""}
          onChange={(e) => onSelect(e.target.value)}
          placeholder="Write your essay here..."
          rows={15}
          className="w-full p-4 border-2 border-gray-200 rounded-lg text-gray-800 
            focus:border-[#2563eb] focus:outline-none resize-y leading-relaxed"
        />
        <div className="text-sm text-gray-500 mt-2 text-right">
          Words: {(selected || "").split(/\s+/).filter(Boolean).length} /{" "}
          {content.word_limit}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN QUESTION RENDERER DISPATCHER
// ============================================

interface QuestionRendererProps {
  question: QuestionForTest;
  answer: string | number[] | Record<string, number> | null;
  onAnswer: (value: string | number[] | Record<string, number>) => void;
}

export function QuestionRenderer({
  question,
  answer,
  onAnswer,
}: QuestionRendererProps) {
  switch (question.question_type) {
    case "mcq":
    case "passage_mcq":
    case "poem_mcq":
      return (
        <MCQRenderer
          content={question.content as MCQContent}
          selected={(answer as string) || null}
          onSelect={onAnswer}
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
        />
      );

    default:
      return (
        <div className="p-8 text-center text-gray-500">
          Question type &ldquo;{question.question_type}&rdquo; is not supported
          yet.
        </div>
      );
  }
}
