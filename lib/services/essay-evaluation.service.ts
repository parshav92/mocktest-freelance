import { SupabaseClient } from "@supabase/supabase-js";

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

const MAX_ATTEMPTS = 3;

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
            console.error("Failed to queue essay evaluation:", error);
            throw new Error(`Failed to queue essay evaluation: ${error.message}`);
        }

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
            return { processed: 0, succeeded: 0, failed: 0 };
        }

        let succeeded = 0;
        let failed = 0;

        for (const row of pending as EssayEvalRow[]) {
            try {
                // Mark as processing
                await this.supabase
                    .from("essay_evaluations")
                    .update({
                        status: "processing",
                        started_processing_at: new Date().toISOString(),
                        attempts: row.attempts + 1,
                    })
                    .eq("id", row.id);

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
                await this.updateTestEssayEvaluation(row.test_id, row.question_id, result);

                succeeded++;
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Unknown error";
                console.error(`Essay evaluation failed for ${row.id}:`, errorMsg);

                const newStatus = row.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending";

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
    async getEvaluationsForTest(testId: string): Promise<Array<{
        id: string;
        question_id: string;
        status: string;
        rubric_scores: Record<string, number> | null;
        score: number | null;
        max_score: number | null;
        feedback: string | null;
        completed_at: string | null;
    }>> {
        const { data, error } = await this.supabase
            .from("essay_evaluations")
            .select("id, question_id, status, rubric_scores, score, max_score, feedback, completed_at")
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
        console.log("thiss")
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
    private async evaluateWithGemini(row: EssayEvalRow): Promise<EssayEvaluationResult> {
        console.log("Gemini started")
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not set");
        }

        const rubricEntries = Object.entries(row.rubric);
        const maxScore = rubricEntries.reduce((sum, [, points]) => sum + points, 0);

        const rubricDescription = rubricEntries
            .map(([category, points]) => `- ${category}: ${points} points`)
            .join("\n");

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

${row.word_limit ? `WORD LIMIT: ${row.word_limit} words` : ""}

STUDENT'S ESSAY:
"""
${row.student_answer}
"""

Evaluate this essay against each rubric criterion and provide scores and feedback.`;

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024,
                        responseMimeType: "application/json",
                    },
                }),
            },
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const geminiResponse = await response.json();

        // Extract the text from Gemini response
        const textContent =
            geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textContent) {
            throw new Error("Empty response from Gemini API");
        }
        console.log("textContext", textContent)
        // Parse the JSON response
        let parsed: { scores: Record<string, number>; feedback: string };
        try {
            parsed = JSON.parse(textContent);
            console.log("parsed", parsed)
        } catch {
            // Try to extract JSON from the response if it has extra text
            const jsonMatch = textContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error(`Failed to parse Gemini response as JSON: ${textContent.substring(0, 200)}`);
            }
        }

        // Validate and clamp scores to rubric maximums
        const validatedScores: Record<string, number> = {};
        for (const [category, maxPoints] of rubricEntries) {
            const score = parsed.scores?.[category];
            if (typeof score === "number") {
                validatedScores[category] = Math.max(0, Math.min(score, maxPoints));
            } else {
                validatedScores[category] = 0;
            }
        }

        const totalScore = Object.values(validatedScores).reduce((sum, s) => sum + s, 0);

        return {
            rubric_scores: validatedScores,
            score: totalScore,
            max_score: maxScore,
            feedback: parsed.feedback || "Evaluation completed.",
        };
    }
}
