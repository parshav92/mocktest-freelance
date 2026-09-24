import { repairMojibakeText } from "@/lib/utils/text-encoding";

export function parseQuestionContent(
    content: unknown,
): Record<string, unknown> {
    if (!content) return {};
    if (typeof content === "string") {
        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return repairContentStrings(parsed as Record<string, unknown>);
            }
        } catch {
            return { question: repairMojibakeText(content) };
        }
        return { question: repairMojibakeText(content) };
    }
    if (typeof content === "object" && !Array.isArray(content)) {
        return repairContentStrings(content as Record<string, unknown>);
    }
    return {};
}

function repairContentStrings(
    record: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = { ...record };
    for (const [key, value] of Object.entries(out)) {
        if (typeof value === "string") {
            out[key] = repairMojibakeText(value);
        } else if (Array.isArray(value)) {
            out[key] = value.map((item) => {
                if (typeof item === "string") return repairMojibakeText(item);
                if (item && typeof item === "object") {
                    return repairContentStrings(item as Record<string, unknown>);
                }
                return item;
            });
        }
    }
    return out;
}

export function getContentTextField(questionType: string): string {
    if (questionType === "essay") return "prompt";
    if (questionType === "fill_missing_sentence") return "passage_with_gaps";
    if (questionType === "fill_blank_dropdown") return "passage_text";
    return "question";
}

export function getQuestionText(content: unknown): string {
    const parsed = parseQuestionContent(content);
    const fields = [
        "question",
        "prompt",
        "passage_text",
        "passage_with_gaps",
        "text",
        "stem",
    ];
    for (const field of fields) {
        if (typeof parsed[field] === "string" && parsed[field]) {
            return parsed[field] as string;
        }
    }
    return "—";
}

export interface ParsedOption {
    label: string;
    text?: string;
}

export function getOptions(content: unknown): ParsedOption[] | null {
    const parsed = parseQuestionContent(content);
    if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
        return null;
    }

    return parsed.options.map((opt, index) => {
        const fallbackLabel = String.fromCharCode(65 + index);
        if (typeof opt === "string") {
            return { label: fallbackLabel, text: repairMojibakeText(opt) };
        }
        if (typeof opt === "object" && opt !== null) {
            const row = opt as Record<string, unknown>;
            const label = String(row.label ?? row.key ?? fallbackLabel).toUpperCase();
            const text = row.text ?? row.value ?? row.option;
            return {
                label,
                text: typeof text === "string" ? repairMojibakeText(text) : undefined,
            };
        }
        return { label: fallbackLabel, text: "—" };
    });
}

export function getMcqCorrectLabel(
    correctAnswer: Record<string, unknown> | null,
): string {
    if (!correctAnswer) return "";
    const label = correctAnswer.label ?? correctAnswer.answer;
    return typeof label === "string" ? label.toUpperCase() : "";
}

export function isMcqType(questionType: string): boolean {
    return ["mcq", "passage_mcq", "poem_mcq"].includes(questionType);
}
