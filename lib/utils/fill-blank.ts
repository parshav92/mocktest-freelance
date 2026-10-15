/**
 * Fill-in-the-blank option/answer helpers shared by CSV parse, upload, and grading.
 */

export function parseFillBlankOptions(optionsStr: string): string[] {
    return optionsStr
        .split("|")
        .map((option) => option.trim())
        .filter(Boolean);
}

export function findFillBlankOptionIndex(
    options: string[],
    answer: string,
): number {
    const needle = answer.trim().toLowerCase();
    if (!needle) return -1;
    const exact = options.findIndex((option) => option === answer.trim());
    if (exact >= 0) return exact;
    return options.findIndex((option) => option.trim().toLowerCase() === needle);
}

/**
 * Parse `1-night, 2-bare` (or unnumbered `night, bare`) into a position → word map.
 */
export function parseFillBlankAnswersColumn(
    answersRaw: string | undefined,
): Map<number, string> {
    const byPosition = new Map<number, string>();
    if (!answersRaw?.trim()) return byPosition;

    const parts = answersRaw
        .split(/[,;]/)
        .map((part) => part.trim())
        .filter(Boolean);

    parts.forEach((part, index) => {
        const numbered = part.match(/^(\d+)\s*[-.:)]\s*(.+)$/);
        if (numbered) {
            byPosition.set(parseInt(numbered[1], 10), numbered[2].trim());
            return;
        }
        byPosition.set(index + 1, part);
    });

    return byPosition;
}

function indexesFromBlanksField(blanks: unknown): number[] | null {
    if (!Array.isArray(blanks) || blanks.length === 0) return null;

    const indexes: number[] = [];
    for (const blank of blanks) {
        if (typeof blank === "number" && Number.isInteger(blank) && blank >= 0) {
            indexes.push(blank);
            continue;
        }
        if (blank && typeof blank === "object") {
            const row = blank as { correct_index?: unknown };
            if (
                typeof row.correct_index === "number" &&
                Number.isInteger(row.correct_index) &&
                row.correct_index >= 0
            ) {
                indexes.push(row.correct_index);
                continue;
            }
        }
        return null;
    }
    return indexes;
}

/**
 * Resolve the correct option index for each blank from stored `correct_answer`.
 * Prefers `{ answers: number[] }`; also reads `{ blanks: [{ correct_index }] }`.
 */
export function resolveFillBlankCorrectIndexes(
    correctAnswer: unknown,
): number[] | null {
    if (!correctAnswer || typeof correctAnswer !== "object") return null;
    const record = correctAnswer as { answers?: unknown; blanks?: unknown };

    if (
        Array.isArray(record.answers) &&
        record.answers.length > 0 &&
        record.answers.every(
            (value) => typeof value === "number" && Number.isInteger(value),
        )
    ) {
        return record.answers as number[];
    }

    return indexesFromBlanksField(record.blanks);
}
