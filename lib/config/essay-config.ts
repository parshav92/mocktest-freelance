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
        /** Default rubric if none provided (ensures some scoring criteria) */
        default: {
            "Content & Ideas": 10,
            Organization: 5,
            "Language & Style": 5,
        } as Record<string, number>,
        /** Minimum total rubric score */
        minTotalScore: 5,
        /** Maximum total rubric score */
        maxTotalScore: 100,
    },

    // ============================================
    // LLM EVALUATION SETTINGS
    // ============================================
    evaluation: {
        /** Gemini model to use for evaluation */
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        /** Temperature for LLM responses (lower = more consistent) */
        temperature: 0.3,
        /** Max output tokens for evaluation response (increased for rubrics with many categories) */
        maxOutputTokens: 2048,
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
