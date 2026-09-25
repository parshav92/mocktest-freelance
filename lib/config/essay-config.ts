// ============================================
// ESSAY QUESTION CONFIGURATION
// ============================================
// Centralized configuration for essay-type questions
// including editor settings, word limits, and scoring.
// ============================================

export const ESSAY_CONFIG = {
    // ============================================
    // WORD LIMIT SETTINGS
    // ============================================
    wordLimit: {
        /** Default word limit if not specified in question */
        default: 500,
        /** Minimum allowed word limit for a question */
        min: 50,
        /** Maximum allowed word limit for a question */
        max: 5000,
        /** Threshold (0-1) at which "approaching limit" warning shows */
        approachingThreshold: 0.9,
        /** Allow a small buffer above limit before hard-blocking (0 = strict) */
        bufferPercent: 0,
    },

    // ============================================
    // EDITOR UI SETTINGS
    // ============================================
    editor: {
        /** Editor height in pixels for split layout */
        heightSplit: 450,
        /** Editor height in pixels for stacked layout */
        heightStacked: 350,
        /** Default placeholder text */
        placeholder: "Write your essay here...",
        /** Minimum editor height */
        minHeight: 200,
    },

    // ============================================
    // TIME SETTINGS
    // ============================================
    time: {
        /** Default time allocation in minutes if not specified */
        defaultMins: 30,
        /** Minimum time for an essay question */
        minMins: 5,
        /** Maximum time for an essay question */
        maxMins: 120,
    },

    // ============================================
    // RUBRIC SETTINGS
    // ============================================
    rubric: {
        /**
         * Standard persuasive essay rubric.
         * Audience(5) + Text Structure(5) + Ideas(5) + Persuasive techniques(5)
         * + Vocabulary(5) + Cohesion(4) + Paragraphing(3)
         * + Sentence Structure(5) + Punctuation(5) + Spelling(5) + Heading(3)
         * Total: 50 marks
         */
        default: {
            "Audience":              5,
            "Text Structure":        5,
            "Ideas":                 5,
            "Persuasive techniques": 5,
            "Vocabulary":            5,
            "Cohesion":              4,
            "Paragraphing":          3,
            "Sentence Structure":    5,
            "Punctuation":           5,
            "Spelling":              5,
            "Heading":               3,
        } as Record<string, number>,
        /** Total rubric score is always 50 */
        minTotalScore: 50,
        maxTotalScore: 50,
    },

    // ============================================
    // LLM EVALUATION SETTINGS
    // ============================================
    evaluation: {
        /** Gemini model to use for evaluation */
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        /** Temperature for LLM responses (lower = more consistent) */
        temperature: 0.3,
        /** Max output tokens for the JSON score/feedback response */
        maxOutputTokens: 1024,
        /**
         * Disable Gemini 2.5 thinking tokens so the full output budget
         * is available for the JSON response (prevents MAX_TOKENS truncation).
         */
        thinkingBudget: 0,
        /** Maximum retry attempts for failed evaluations */
        maxAttempts: 3,
        /** Batch size for queue processing */
        defaultBatchSize: 5,
        /** Maximum batch size allowed */
        maxBatchSize: 20,
    },
} as const;

// ============================================
// RUBRIC VALIDATION HELPERS
// ============================================

/**
 * Validates a rubric object and returns a normalized version.
 * Falls back to default rubric if invalid.
 */
export function validateRubric(
    rubric: Record<string, number> | null | undefined,
): Record<string, number> {
    if (!rubric || typeof rubric !== "object") {
        return { ...ESSAY_CONFIG.rubric.default };
    }

    const entries = Object.entries(rubric);

    // Must have at least one criterion
    if (entries.length === 0) {
        return { ...ESSAY_CONFIG.rubric.default };
    }

    // Filter out invalid entries and ensure positive scores
    const validEntries = entries.filter(
        ([key, value]) =>
            typeof key === "string" &&
            key.trim().length > 0 &&
            typeof value === "number" &&
            value > 0 &&
            Number.isFinite(value),
    );

    if (validEntries.length === 0) {
        return { ...ESSAY_CONFIG.rubric.default };
    }

    const totalScore = validEntries.reduce((sum, [, v]) => sum + v, 0);

    // Validate total score is within bounds
    if (
        totalScore < ESSAY_CONFIG.rubric.minTotalScore ||
        totalScore > ESSAY_CONFIG.rubric.maxTotalScore
    ) {
        console.warn(
            `Rubric total score ${totalScore} is outside bounds [${ESSAY_CONFIG.rubric.minTotalScore}, ${ESSAY_CONFIG.rubric.maxTotalScore}]. Using default rubric.`,
        );
        return { ...ESSAY_CONFIG.rubric.default };
    }

    return Object.fromEntries(validEntries);
}

/**
 * Calculate the maximum possible score from a rubric
 */
export function getRubricMaxScore(rubric: Record<string, number>): number {
    return Object.values(rubric).reduce((sum, score) => sum + score, 0);
}

/**
 * Check if a word count is within acceptable limits
 */
export function isWithinWordLimit(
    wordCount: number,
    limit: number,
): { isValid: boolean; isApproaching: boolean; isOver: boolean } {
    const threshold = limit * ESSAY_CONFIG.wordLimit.approachingThreshold;
    const hardLimit = limit * (1 + ESSAY_CONFIG.wordLimit.bufferPercent);

    return {
        isValid: wordCount <= hardLimit,
        isApproaching: wordCount >= threshold && wordCount <= limit,
        isOver: wordCount > limit,
    };
}

export function clampEssayTimeMins(timeMins: number): number {
    return Math.min(
        ESSAY_CONFIG.time.maxMins,
        Math.max(ESSAY_CONFIG.time.minMins, Math.round(timeMins)),
    );
}

export function resolveEssayTimeMins(content: unknown): number | null {
    if (!content || typeof content !== "object") return null;
    const raw = (content as { time_mins?: unknown }).time_mins;
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return clampEssayTimeMins(parsed);
}

/**
 * Essay-only tests (Writing) use the question's time_mins for the timer.
 * Mixed tests keep the subject / custom-test duration.
 */
export function resolveTestDurationFromQuestions(
    questions: Array<{ question_type: string; content: unknown }>,
    fallbackMins: number,
): number {
    if (questions.length === 0) return fallbackMins;

    const allEssays = questions.every((q) => q.question_type === "essay");
    if (!allEssays) return fallbackMins;

    const times = questions
        .map((q) => resolveEssayTimeMins(q.content))
        .filter((t): t is number => t !== null);

    if (times.length === 0) {
        return clampEssayTimeMins(ESSAY_CONFIG.time.defaultMins);
    }

    return Math.max(...times);
}
