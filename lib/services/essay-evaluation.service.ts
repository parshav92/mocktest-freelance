import { SupabaseClient } from "@supabase/supabase-js";
import { ESSAY_CONFIG } from "@/lib/config/essay-config";
import {
    formatMarkingCriteriaForPrompt,
    getMergedMarkingCriteria,
} from "@/lib/services/writing-marking-criteria.service";
import { WRITING_TOTAL_MARKS } from "@/lib/types/writing-marking-criteria";
import { stripHtmlToText, countWords } from "@/lib/utils";

export interface EssayEvaluationInput {
    test_id: string;
    question_id: string;
    student_id: string;
    essay_prompt: string;
    student_answer: string;
    word_limit?: number;
}

export interface EssayEvaluationResult {
    rubric_scores: Record<string, number> | null;
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
    word_limit: number | null;
    status: string;
    attempts: number;
}

const MAX_ATTEMPTS = ESSAY_CONFIG.evaluation.maxAttempts;

const GEMINI_EVALUATION_RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        score: { type: "integer" },
        feedback: { type: "string" },
    },
    required: ["score", "feedback"],
};

function parseGeminiEvaluationResponse(
    textContent: string,
    questionId: string,
): { score: number; feedback: string } {
    try {
        const parsed = JSON.parse(textContent) as {
            score?: number | string;
            feedback?: string;
        };
        if (parsed.score !== undefined) {
            return {
                score:
                    typeof parsed.score === "number"
                        ? parsed.score
                        : Number(parsed.score),
                feedback: parsed.feedback || "Evaluation completed.",
            };
        }
    } catch {
        // Fall through to salvage parsing below.
    }

    const scoreMatch = textContent.match(/"score"\s*:\s*(\d+)/);
    const feedbackMatch = textContent.match(
        /"feedback"\s*:\s*"((?:[^"\\]|\\.)*)/,
    );

    if (scoreMatch) {
        const salvagedFeedback =
            feedbackMatch?.[1]
                ?.replace(/\\"/g, '"')
                .replace(/\\n/g, " ")
                .trim() || "Evaluation completed (response was truncated).";

        console.warn(
            `[EssayEval] Salvaged truncated Gemini response for question ${questionId}`,
        );

        return {
            score: Number(scoreMatch[1]),
            feedback: salvagedFeedback,
        };
    }

    throw new Error(
        `Failed to parse Gemini response as JSON: ${textContent.substring(0, 300)}`,
    );
}

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
                    rubric: null,
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

                if (updateError || !updated) {
                    console.log(
                        `[EssayEval] Skipping ${row.id} - already being processed by another worker`,
                    );
                    continue;
                }

                const result = await this.evaluateWithGemini(row);

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

                const attemptNumber = row.attempts + 1;
                const newStatus =
                    attemptNumber >= MAX_ATTEMPTS ? "failed" : "pending";

                console.error(
                    `[EssayEval] Evaluation failed for ${row.id} (attempt ${attemptNumber}/${MAX_ATTEMPTS}): ${errorMsg}`,
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

    private async updateTestEssayEvaluation(
        testId: string,
        questionId: string,
        result: EssayEvaluationResult,
    ): Promise<void> {
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

        const answers = test.answers || [];
        const answerIdx = answers.findIndex(
            (a: { question_id: string }) => a.question_id === questionId,
        );
        if (answerIdx >= 0) {
            answers[answerIdx].marks_earned = result.score;
            answers[answerIdx].is_correct = result.score > 0;
        }

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

    private async evaluateWithGemini(
        row: EssayEvalRow,
    ): Promise<EssayEvaluationResult> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not set");
        }

        const { data: question, error: questionError } = await this.supabase
            .from("questions")
            .select("topic, subtopic")
            .eq("id", row.question_id)
            .single();

        if (questionError || !question?.topic || !question?.subtopic) {
            throw new Error(
                `Question ${row.question_id} is missing topic/subtopic required for writing evaluation`,
            );
        }

        const mergedCriteria = await getMergedMarkingCriteria(
            this.supabase,
            question.topic,
            question.subtopic,
        );
        const criteriaText = formatMarkingCriteriaForPrompt(mergedCriteria);

        const plainTextAnswer = stripHtmlToText(row.student_answer);
        const actualWordCount = countWords(row.student_answer);

        const systemPrompt = `You are an expert NSW Selective Schools writing test evaluator.
Evaluate the student's response using the marking criteria below. Each criterion includes Level 5 (High Achievement) and Level 3 (Satisfactory) descriptors to calibrate your judgement.

IMPORTANT RULES:
1. Be fair but constructive in your evaluation
2. Consider the student's age/level (these are school-level assessments)
3. Use the style-specific and general criteria together to form a holistic judgement
4. Provide specific, actionable feedback in at most 3 short sentences (under 400 characters total)
5. If the response is off-topic or nonsensical, award a very low score with clear feedback
6. If the response is empty or near-empty, award 0
7. Keep feedback concise — complete the JSON response fully

You MUST respond with ONLY valid JSON in this exact format:
{
  "score": <integer from 0 to ${WRITING_TOTAL_MARKS}>,
  "feedback": "<brief constructive feedback>"
}

Do not include any text outside the JSON.`;

        const keyFocusLine = mergedCriteria.keyFocus
            ? `KEY FOCUS: ${mergedCriteria.keyFocus}\n\n`
            : "";

        const userPrompt = `WRITING STYLE: ${mergedCriteria.mainTopic}
SUB-STYLE: ${mergedCriteria.subTopic}

${keyFocusLine}ESSAY PROMPT:
"""
${row.essay_prompt}
"""

MARKING CRITERIA:
${criteriaText}

${row.word_limit ? `WORD LIMIT: ${row.word_limit} words (Student used: ${actualWordCount} words)\n` : ""}
STUDENT'S RESPONSE:
"""
${plainTextAnswer}
"""

Award a single overall score out of ${WRITING_TOTAL_MARKS} based on how well the response meets the criteria above.`;

        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        console.log("[EssayEval] Gemini prompt context", {
            evaluationId: row.id,
            testId: row.test_id,
            questionId: row.question_id,
            topic: mergedCriteria.mainTopic,
            subTopic: mergedCriteria.subTopic,
            keyFocus: mergedCriteria.keyFocus,
            essayPrompt: row.essay_prompt,
            wordLimit: row.word_limit,
            wordCount: actualWordCount,
            maxScore: WRITING_TOTAL_MARKS,
            criteriaCount: mergedCriteria.criteria.length,
            criteria: mergedCriteria.criteria,
        });
        console.log("[EssayEval] Gemini marking criteria text:\n", criteriaText);
        console.log("[EssayEval] Gemini student answer:\n", plainTextAnswer);
        console.log("[EssayEval] Gemini full prompt:\n", fullPrompt);

        const model = ESSAY_CONFIG.evaluation.model;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: fullPrompt }],
                        },
                    ],
                    generationConfig: {
                        temperature: ESSAY_CONFIG.evaluation.temperature,
                        maxOutputTokens:
                            ESSAY_CONFIG.evaluation.maxOutputTokens,
                        responseMimeType: "application/json",
                        responseSchema: GEMINI_EVALUATION_RESPONSE_SCHEMA,
                        thinkingConfig: {
                            thinkingBudget: ESSAY_CONFIG.evaluation.thinkingBudget,
                        },
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
        const textContent =
            geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

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

        const parsed = parseGeminiEvaluationResponse(
            textContent,
            row.question_id,
        );

        const rawScore = parsed.score;
        const score = Number.isFinite(rawScore)
            ? Math.max(0, Math.min(Math.round(rawScore), WRITING_TOTAL_MARKS))
            : 0;

        return {
            rubric_scores: null,
            score,
            max_score: WRITING_TOTAL_MARKS,
            feedback: parsed.feedback || "Evaluation completed.",
        };
    }
}
