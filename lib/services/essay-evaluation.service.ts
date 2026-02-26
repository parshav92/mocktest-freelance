import { SupabaseClient } from "@supabase/supabase-js";
import {
    ESSAY_CONFIG,
    validateRubric,
    getRubricMaxScore,
} from "@/lib/config/essay-config";
import { stripHtmlToText, countWords } from "@/lib/utils";

export interface EssayEvaluationInput {
    test_id: string;
    question_id: string;
    student_id: string;
    essay_prompt: string;
    student_answer: string;
    rubric: Record<string, number>;
    word_limit?: number;
}

export interface EssayEvaluationResult {
    rubric_scores: Record<string, number>;
    score: number;
    max_score: number;
    feedback: string;
}

interface EssayEvalRow {
    id: string;
    test_id: string;
    question_id: string;
    student_id: string;
    essay_prompt: string;
    student_answer: string;
    rubric: Record<string, number>;
    word_limit: number | null;
    status: string;
    attempts: number;
}

const MAX_ATTEMPTS = ESSAY_CONFIG.evaluation.maxAttempts;

/**
 * Service for LLM-based essay evaluation using Gemini AI.
 *
 * Uses the essay_evaluations table as a queue:
 * 1. On test submit → queueEssayEvaluation() inserts a 'pending' row
 * 2. processQueue() polls for pending rows, calls Gemini, writes scores
 * 3. Review page reads completed evaluations
 */
export class EssayEvaluationService {
    constructor(private supabase: SupabaseClient) {}

    /**
     * Queue an essay for evaluation (called on test submit)
     */
    async queueEssayEvaluation(input: EssayEvaluationInput): Promise<string> {
        console.log(
            `[EssayEval] Queueing evaluation for test=${input.test_id}, question=${input.question_id}`,
        );
        const { data, error } = await this.supabase
            .from("essay_evaluations")
            .upsert(
                {
                    test_id: input.test_id,
                    question_id: input.question_id,
                    student_id: input.student_id,
                    essay_prompt: input.essay_prompt,
                    student_answer: input.student_answer,
                    rubric: input.rubric,
                    word_limit: input.word_limit || null,
                    status: "pending",
                    attempts: 0,
                    score: null,
                    max_score: null,
                    rubric_scores: null,
                    feedback: null,
                    last_error: null,
                },
                { onConflict: "test_id,question_id" },
            )
            .select("id")
            .single();

        if (error) {
            console.error(
                "[EssayEval] Failed to queue essay evaluation:",
                error,
            );
            throw new Error(
                `Failed to queue essay evaluation: ${error.message}`,
            );
        }

        console.log(`[EssayEval] Queued successfully, id=${data.id}`);
        return data.id;
    }

    /**
     * Process pending evaluations from the queue.
     * Called by the cron/worker API route.
     */
    async processQueue(batchSize: number = 5): Promise<{
        processed: number;
        succeeded: number;
        failed: number;
    }> {
        // Fetch pending evaluations (oldest first)
        console.log(`[EssayEval] processQueue called, batchSize=${batchSize}`);
        const { data: pending, error: fetchError } = await this.supabase
            .from("essay_evaluations")
            .select("*")
            .in("status", ["pending", "failed"])
            .lt("attempts", MAX_ATTEMPTS)
            .order("created_at", { ascending: true })
            .limit(batchSize);

        if (fetchError) {
            console.error("Failed to fetch pending evaluations:", fetchError);
            throw new Error("Failed to fetch pending evaluations");
        }

        if (!pending || pending.length === 0) {
            console.log(`[EssayEval] No pending evaluations found in queue`);
            return { processed: 0, succeeded: 0, failed: 0 };
        }

        console.log(
            `[EssayEval] Found ${pending.length} pending evaluation(s) to process`,
        );

        let succeeded = 0;
        let failed = 0;

        for (const row of pending as EssayEvalRow[]) {
            try {
                // Mark as processing with optimistic locking to prevent race conditions
                // Only update if status is still pending/failed (not already being processed)
                const { data: updated, error: updateError } =
                    await this.supabase
                        .from("essay_evaluations")
                        .update({
                            status: "processing",
                            started_processing_at: new Date().toISOString(),
                            attempts: row.attempts + 1,
                        })
                        .eq("id", row.id)
                        .in("status", ["pending", "failed"])
                        .select("id")
                        .maybeSingle();

                // If no rows updated, another process is already handling this
                if (updateError || !updated) {
                    console.log(
                        `[EssayEval] Skipping ${row.id} - already being processed by another worker`,
                    );
                    continue;
                }

                // Call Gemini for evaluation
                const result = await this.evaluateWithGemini(row);

                // Write results
                await this.supabase
                    .from("essay_evaluations")
                    .update({
                        status: "completed",
                        score: result.score,
                        max_score: result.max_score,
                        rubric_scores: result.rubric_scores,
                        feedback: result.feedback,
                        completed_at: new Date().toISOString(),
                        last_error: null,
                    })
                    .eq("id", row.id);

                // Also update the test's essay_evaluation field
                await this.updateTestEssayEvaluation(
                    row.test_id,
                    row.question_id,
                    result,
                );

                console.log(
                    `[EssayEval] Successfully evaluated ${row.id} - score: ${result.score}/${result.max_score}`,
                );
                succeeded++;
            } catch (err) {
                const errorMsg =
                    err instanceof Error ? err.message : "Unknown error";

                // Calculate the actual attempt number (we already incremented in the DB)
                const attemptNumber = row.attempts + 1;
                const newStatus =
                    attemptNumber >= MAX_ATTEMPTS ? "failed" : "pending";

                console.error(
                    `[EssayEval] Evaluation failed for ${row.id} (attempt ${attemptNumber}/${MAX_ATTEMPTS}): ${errorMsg}`,
                );
                console.log(
                    `[EssayEval] Setting status to '${newStatus}' for ${row.id}`,
                );

                await this.supabase
                    .from("essay_evaluations")
                    .update({
                        status: newStatus,
                        last_error: errorMsg,
                    })
                    .eq("id", row.id);

                failed++;
            }
        }

        return { processed: pending.length, succeeded, failed };
    }

    /**
     * Get evaluation status for a test's essay questions
     */
    async getEvaluationsForTest(testId: string): Promise<
        Array<{
            id: string;
            question_id: string;
            status: string;
            rubric_scores: Record<string, number> | null;
            score: number | null;
            max_score: number | null;
            feedback: string | null;
            completed_at: string | null;
        }>
    > {
        const { data, error } = await this.supabase
            .from("essay_evaluations")
            .select(
                "id, question_id, status, rubric_scores, score, max_score, feedback, completed_at",
            )
            .eq("test_id", testId);

        if (error) {
            console.error("Failed to fetch evaluations:", error);
            return [];
        }

        return data || [];
    }

    /**
     * Update the test record with essay evaluation data
     */
    private async updateTestEssayEvaluation(
        testId: string,
        questionId: string,
        result: EssayEvaluationResult,
    ): Promise<void> {
        // Fetch current test to merge essay evaluation
        const { data: test } = await this.supabase
            .from("tests")
            .select("essay_evaluation, answers, marks_obtained, total_marks")
            .eq("id", testId)
            .single();

        if (!test) return;

        const essayEval = {
            question_id: questionId,
            score: result.score,
            max_score: result.max_score,
            feedback: result.feedback,
            rubric_scores: result.rubric_scores,
            evaluated_at: new Date().toISOString(),
        };

        // Update the essay answer's marks in the answers array
        const answers = test.answers || [];
        const answerIdx = answers.findIndex(
            (a: { question_id: string }) => a.question_id === questionId,
        );
        if (answerIdx >= 0) {
            answers[answerIdx].marks_earned = result.score;
            // Essay marking: partial credit based on rubric
            answers[answerIdx].is_correct = result.score > 0;
        }

        // Recalculate total marks obtained
        const marksObtained = answers.reduce(
            (sum: number, a: { marks_earned?: number | null }) =>
                sum + (a.marks_earned || 0),
            0,
        );

        const percentage = test.total_marks
            ? Math.round((marksObtained / test.total_marks) * 100 * 100) / 100
            : 0;

        await this.supabase
            .from("tests")
            .update({
                essay_evaluation: essayEval,
                answers,
                marks_obtained: marksObtained,
                percentage,
            })
            .eq("id", testId);
    }

    /**
     * Call Gemini AI to evaluate an essay
     */
    private async evaluateWithGemini(
        row: EssayEvalRow,
    ): Promise<EssayEvaluationResult> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not set");
        }

        // Validate and normalize rubric, using defaults if invalid
        const validatedRubric = validateRubric(row.rubric);
        const rubricEntries = Object.entries(validatedRubric);
        const maxScore = getRubricMaxScore(validatedRubric);

        const rubricDescription = rubricEntries
            .map(([category, points]) => `- ${category}: ${points} points`)
            .join("\n");

        // Strip HTML from student answer to save tokens and improve evaluation
        const plainTextAnswer = stripHtmlToText(row.student_answer);
        const actualWordCount = countWords(row.student_answer);

        const systemPrompt = `You are an expert essay evaluator for student assessments. 
You must evaluate the student's essay based on the provided rubric criteria and return a structured JSON response.

IMPORTANT RULES:
1. Be fair but constructive in your evaluation
2. Consider the student's age/level (these are school-level assessments)
3. Score each rubric category independently
4. Provide specific, actionable feedback
5. If the essay is off-topic or nonsensical, give minimal scores with clear feedback
6. If the essay is empty or near-empty, give 0 scores

You MUST respond with ONLY valid JSON in this exact format:
{
  "scores": { <rubric_category>: <score_number>, ... },
  "feedback": "<2-4 sentences of constructive feedback>"
}

Do not include any text outside the JSON.`;

        const userPrompt = `ESSAY PROMPT: "${row.essay_prompt}"

RUBRIC CRITERIA:
${rubricDescription}

${row.word_limit ? `WORD LIMIT: ${row.word_limit} words (Student used: ${actualWordCount} words)` : ""}

STUDENT'S ESSAY:
"""
${plainTextAnswer}
"""

Evaluate this essay against each rubric criterion and provide scores and feedback.`;

        // Get model from config
        const model = ESSAY_CONFIG.evaluation.model;

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { text: `${systemPrompt}\n\n${userPrompt}` },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: ESSAY_CONFIG.evaluation.temperature,
                        maxOutputTokens:
                            ESSAY_CONFIG.evaluation.maxOutputTokens,
                        responseMimeType: "application/json",
                    },
                }),
            },
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Gemini API error (${response.status}): ${errorText}`,
            );
        }

        const geminiResponse = await response.json();

        // Extract the text from Gemini response
        const textContent =
            geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        // Check for finish reason - if stopped due to max tokens, we have truncated output
        const finishReason = geminiResponse.candidates?.[0]?.finishReason;
        if (finishReason === "MAX_TOKENS") {
            console.warn(
                `[EssayEval] Response truncated due to MAX_TOKENS for question ${row.question_id}`,
            );
        }

        if (!textContent) {
            throw new Error("Empty response from Gemini API");
        }

        console.log(
            `[EssayEval] Raw response for ${row.question_id}: ${textContent.substring(0, 500)}`,
        );

        // Parse the JSON response
        let parsed: { scores: Record<string, number>; feedback: string };
        try {
            parsed = JSON.parse(textContent);
        } catch {
            // Try to extract JSON from the response if it has extra text
            const jsonMatch = textContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0]);
                } catch {
                    throw new Error(
                        `Failed to parse Gemini response as JSON (truncated?): ${textContent.substring(0, 300)}`,
                    );
                }
            } else {
                throw new Error(
                    `Failed to parse Gemini response as JSON: ${textContent.substring(0, 300)}`,
                );
            }
        }

        // Validate and clamp scores to rubric maximums
        const validatedScores: Record<string, number> = {};
        for (const [category, maxPoints] of rubricEntries) {
            const score = parsed.scores?.[category];
            if (typeof score === "number") {
                validatedScores[category] = Math.max(
                    0,
                    Math.min(score, maxPoints),
                );
            } else {
                validatedScores[category] = 0;
            }
        }

        const totalScore = Object.values(validatedScores).reduce(
            (sum, s) => sum + s,
            0,
        );

        return {
            rubric_scores: validatedScores,
            score: totalScore,
            max_score: maxScore,
            feedback: parsed.feedback || "Evaluation completed.",
        };
    }
}
