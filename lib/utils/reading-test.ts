const READING_PASSAGE_TYPES = new Set(["passage_mcq", "poem_mcq"]);

export function isReadingPassageQuestion(question: {
    question_type: string;
    passage_ids?: unknown;
}): boolean {
    if (READING_PASSAGE_TYPES.has(question.question_type)) return true;
    if (Array.isArray(question.passage_ids) && question.passage_ids.length > 0) {
        return true;
    }
    if (typeof question.passage_ids === "string") {
        try {
            const parsed = JSON.parse(question.passage_ids);
            return Array.isArray(parsed) && parsed.length > 0;
        } catch {
            return false;
        }
    }
    return false;
}

export function hasReadingPassageQuestions(
    questions: Array<{ question_type: string; passage_ids?: unknown }>,
): boolean {
    return questions.some(isReadingPassageQuestion);
}
