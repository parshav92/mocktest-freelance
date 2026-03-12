import { SupabaseClient } from "@supabase/supabase-js";
import type {
    Test,
    TestStatus,
    QuestionForTest,
    TestAnswer,
    DifficultyLevel,
    ScoreBreakdown,
    CorrectAnswer,
    MCQAnswer,
    FillBlankAnswer,
    FillMissingSentenceAnswer,
    EssayContent,
    Passage,
} from "@/types/test";
import { EssayEvaluationService } from "@/lib/services/essay-evaluation.service";
import { countWords, stripHtmlToText } from "@/lib/utils";
import { validateRubric } from "@/lib/config/essay-config";

// Internal type for questions with answers during grading
interface GradableQuestion {
    id: string;
    question_type: string;
    difficulty: DifficultyLevel;
    marks: number;
    correct_answer: CorrectAnswer;
}

/**
 * Service class for test-related operations
 * Encapsulates business logic and database interactions
 */
export class TestService {
    constructor(private supabase: SupabaseClient) {}

    // ============================================
    // TEST CREATION
    // ============================================

    /**
     * Check if student can start a new test
     */
    async canStudentTakeTest(studentId: string): Promise<boolean> {
        const { data, error } = await this.supabase.rpc(
            "can_student_take_test",
            {
                p_student_id: studentId,
            },
        );

        if (error) {
            console.error("Error checking test eligibility:", error);
            return false;
        }

        return data === true;
    }

    /**
     * Get adaptive difficulty distribution for a student
     */
    async getAdaptiveDistribution(
        studentId: string,
        subjectId: string,
    ): Promise<{ easy: number; medium: number; hard: number }> {
        const { data, error } = await this.supabase.rpc(
            "get_adaptive_distribution",
            {
                p_student_id: studentId,
                p_subject_id: subjectId,
                p_total_questions: 40,
            },
        );

        if (error || !data?.[0]) {
            // Default distribution for first tests
            return { easy: 25, medium: 10, hard: 5 };
        }

        return {
            easy: data[0].easy_count,
            medium: data[0].medium_count,
            hard: data[0].hard_count,
        };
    }

    /**
     * Get questions for a new test using adaptive algorithm
     */
    async getTestQuestions(
        studentId: string,
        subjectId: string,
        distribution: { easy: number; medium: number; hard: number },
    ): Promise<string[]> {
        const { data, error } = await this.supabase.rpc("get_test_questions", {
            p_student_id: studentId,
            p_subject_id: subjectId,
            p_easy_count: distribution.easy,
            p_medium_count: distribution.medium,
            p_hard_count: distribution.hard,
        });

        if (error) {
            console.error("Error getting test questions:", error);
            throw new Error("Failed to select questions for test");
        }

        const questionIds = (data || []).map(
            (row: { question_id: string }) => row.question_id,
        );

        // Group questions by passage to keep related questions together
        return this.groupAndShuffleQuestions(questionIds);
    }

    /**
     * Group questions by passage and shuffle groups while keeping passage questions together.
     * Order: All passage-based questions first (grouped by primary passage), then standalone questions.
     * This ensures reading comprehension questions appear before fill-in-the-blanks, etc.
     */
    private async groupAndShuffleQuestions(
        questionIds: string[],
    ): Promise<string[]> {
        if (questionIds.length === 0) return [];

        // Fetch passage_ids for each question
        const { data: questionsWithPassage, error } = await this.supabase
            .from("questions")
            .select("id, passage_ids, question_type")
            .in("id", questionIds);

        if (error || !questionsWithPassage) {
            // Fallback to simple shuffle if we can't get passage info
            return this.shuffleArray(questionIds);
        }

        // Create maps for question info
        const questionInfoMap = new Map<
            string,
            { passage_ids: string[]; question_type: string }
        >();
        for (const q of questionsWithPassage) {
            questionInfoMap.set(q.id, {
                passage_ids: (q.passage_ids as string[]) || [],
                question_type: q.question_type,
            });
        }

        // Group questions: passage questions grouped by primary passage (first in array), standalone separate
        const passageGroups = new Map<string, string[]>(); // primary_passage_id -> question_ids
        const standaloneQuestions: string[] = [];

        for (const qId of questionIds) {
            const info = questionInfoMap.get(qId);
            const primaryPassageId = info?.passage_ids?.[0];
            if (primaryPassageId) {
                if (!passageGroups.has(primaryPassageId)) {
                    passageGroups.set(primaryPassageId, []);
                }
                passageGroups.get(primaryPassageId)!.push(qId);
            } else {
                standaloneQuestions.push(qId);
            }
        }

        // Shuffle questions within each passage group
        const shuffledPassageGroups: string[][] = [];
        for (const [, groupQuestions] of passageGroups) {
            shuffledPassageGroups.push(this.shuffleArray(groupQuestions));
        }

        // Shuffle the passage groups themselves (but keep them as a block)
        const shuffledGroups = this.shuffleArray(shuffledPassageGroups);

        // Shuffle standalone questions
        const shuffledStandalone = this.shuffleArray(standaloneQuestions);

        // Final order: ALL passage-based questions first, THEN standalone questions
        // This ensures reading comprehension comes before fill-in-the-blanks
        return [
            ...shuffledGroups.flat(), // All passage questions (grouped by passage)
            ...shuffledStandalone, // All standalone questions (fill blanks, etc.)
        ];
    }

    /**
     * Create a new test for a student
     */
    async createTest(
        studentId: string,
        subjectId: string,
    ): Promise<{ test: Test; questions: QuestionForTest[] }> {
        // 1. Verify subject exists and get duration
        const { data: subject, error: subjectError } = await this.supabase
            .from("subjects")
            .select("id, name, duration_mins, total_questions")
            .eq("id", subjectId)
            .eq("is_active", true)
            .single();

        if (subjectError || !subject) {
            throw new Error("Subject not found or inactive");
        }

        // 2. Check for existing in-progress test for this subject
        const { data: existingTest } = await this.supabase
            .from("tests")
            .select("id, status")
            .eq("student_id", studentId)
            .eq("subject_id", subjectId)
            .in("status", ["not_started", "in_progress"])
            .single();

        if (existingTest) {
            throw new Error(
                `You have an existing ${existingTest.status === "in_progress" ? "in-progress" : "unstarted"} test for this subject. Please complete it first.`,
            );
        }

        // 3. Get adaptive distribution
        const distribution = await this.getAdaptiveDistribution(
            studentId,
            subjectId,
        );

        // 4. Select questions using adaptive algorithm
        const questionIds = await this.getTestQuestions(
            studentId,
            subjectId,
            distribution,
        );

        if (questionIds.length === 0) {
            throw new Error("No questions available for this subject");
        }

        // 5. Get default template
        const { data: template } = await this.supabase
            .from("subject_templates")
            .select("id")
            .eq("subject_id", subjectId)
            .eq("is_default", true)
            .single();

        // 6. Calculate total marks
        const { data: questionsData } = await this.supabase
            .from("questions")
            .select("marks")
            .in("id", questionIds);

        const totalMarks =
            questionsData?.reduce((sum, q) => sum + q.marks, 0) ||
            questionIds.length;

        // 7. Create the test record
        const { data: test, error: testError } = await this.supabase
            .from("tests")
            .insert({
                student_id: studentId,
                subject_id: subjectId,
                template_id: template?.id || null,
                status: "not_started" as TestStatus,
                duration_mins: subject.duration_mins,
                questions_order: questionIds,
                answers: [],
                total_marks: totalMarks,
            })
            .select()
            .single();

        if (testError) {
            // Check if it's a subscription error from the trigger
            if (testError.code === "P0001") {
                throw new Error(
                    "Cannot create test: You need an active subscription to start new tests.",
                );
            }
            console.error("Error creating test:", testError);
            throw new Error("Failed to create test");
        }

        // 8. Fetch questions for the test (without correct answers)
        const questions = await this.getQuestionsForTest(questionIds);

        return { test, questions };
    }

    // ============================================
    // TEST RETRIEVAL
    // ============================================

    /**
     * Get a test by ID with access check
     */
    async getTest(
        testId: string,
        studentId: string,
    ): Promise<{
        test: Test;
        can_access: boolean;
        is_read_only: boolean;
        reason: string;
    }> {
        // Check access using database function
        const { data: accessData, error: accessError } =
            await this.supabase.rpc("can_student_access_test", {
                p_student_id: studentId,
                p_test_id: testId,
            });

        if (accessError) {
            console.error("Error checking test access:", accessError);
            throw new Error("Failed to verify test access");
        }

        const access = accessData?.[0] || {
            can_access: false,
            is_read_only: false,
            reason: "Access check failed",
        };

        if (!access.can_access) {
            return {
                test: null as unknown as Test,
                can_access: false,
                is_read_only: access.is_read_only,
                reason: access.reason,
            };
        }

        // Fetch the test
        const { data: test, error: testError } = await this.supabase
            .from("tests")
            .select(
                `
        *,
        subject:subjects(id, name, slug, icon, duration_mins, instructions)
      `,
            )
            .eq("id", testId)
            .single();

        if (testError || !test) {
            throw new Error("Test not found");
        }

        return {
            test,
            can_access: access.can_access,
            is_read_only: access.is_read_only,
            reason: access.reason,
        };
    }

    /**
     * Get all tests for a student with optional filters
     */
    async getStudentTests(
        studentId: string,
        filters?: {
            subjectId?: string;
            status?: TestStatus | TestStatus[];
            limit?: number;
            offset?: number;
        },
    ): Promise<{ tests: Test[]; total: number }> {
        let query = this.supabase
            .from("tests")
            .select(
                `
        *,
        subject:subjects(id, name, slug, icon)
      `,
                { count: "exact" },
            )
            .eq("student_id", studentId)
            .order("created_at", { ascending: false });

        if (filters?.subjectId) {
            query = query.eq("subject_id", filters.subjectId);
        }

        if (filters?.status) {
            if (Array.isArray(filters.status)) {
                query = query.in("status", filters.status);
            } else {
                query = query.eq("status", filters.status);
            }
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        if (filters?.offset) {
            query = query.range(
                filters.offset,
                filters.offset + (filters.limit || 10) - 1,
            );
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("Error fetching tests:", error);
            throw new Error("Failed to fetch tests");
        }

        return { tests: data || [], total: count || 0 };
    }

    /**
     * Get questions for a test (without correct answers for in-progress tests)
     * Fetches passage data separately based on passage_ids JSONB array
     */
    async getQuestionsForTest(
        questionIds: string[],
        includeAnswers = false,
    ): Promise<QuestionForTest[]> {
        // Build select query
        const baseSelect =
            "id, code, question_type, difficulty, content, marks, passage_ids";

        let query;
        if (includeAnswers) {
            query = this.supabase
                .from("questions")
                .select(
                    `${baseSelect}, correct_answer, solution_text, solution_images`,
                )
                .in("id", questionIds);
        } else {
            query = this.supabase
                .from("questions")
                .select(baseSelect)
                .in("id", questionIds);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching questions:", error);
            throw new Error("Failed to fetch questions");
        }

        // Safely parse passage_ids from JSONB (may come as string or array)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsePassageIds = (raw: any): string[] => {
            if (!raw) return [];
            if (Array.isArray(raw)) return raw;
            if (typeof raw === "string") {
                try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
            }
            return [];
        };

        // Collect all unique passage IDs from all questions
        const allPassageIds = new Set<string>();
        for (const q of data || []) {
            const pids = parsePassageIds(q.passage_ids);
            for (const pid of pids) {
                allPassageIds.add(pid);
            }
        }

        // Fetch all passages in one query
        let passageMap = new Map<string, Passage>();
        if (allPassageIds.size > 0) {
            const { data: passages } = await this.supabase
                .from("passages")
                .select("id, code, passage_type, title, content, image_url")
                .in("id", Array.from(allPassageIds));

            if (passages) {
                passageMap = new Map(passages.map((p) => [p.id, p as unknown as Passage]));
            }
        }

        // Sort questions and attach passages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const questionMap = new Map((data || []).map((q: any) => [q.id, q]));
        const sortedQuestions = questionIds
            .map((id) => {
                const q = questionMap.get(id);
                if (!q) return null;
                // Map passage_ids to passage objects, preserving order
                const pids = parsePassageIds(q.passage_ids);
                const passages = pids
                    .map((pid: string) => passageMap.get(pid))
                    .filter(Boolean) as Passage[];
                return {
                    ...q,
                    passages: passages.length > 0 ? passages : undefined,
                    passage_ids: undefined, // Don't leak raw IDs to client
                };
            })
            .filter(Boolean) as unknown as QuestionForTest[];

        return sortedQuestions;
    }

    // ============================================
    // TEST STATE TRANSITIONS
    // ============================================

    /**
     * Start a test (transition from not_started to in_progress)
     */
    async startTest(testId: string, studentId: string): Promise<Test> {
        // First verify access
        const { test, can_access, reason } = await this.getTest(
            testId,
            studentId,
        );

        if (!can_access) {
            throw new Error(reason || "Cannot access this test");
        }

        if (test.status !== "not_started") {
            throw new Error(`Test is already ${test.status}`);
        }

        // Update status to in_progress
        const { data: updatedTest, error } = await this.supabase
            .from("tests")
            .update({
                status: "in_progress" as TestStatus,
                started_at: new Date().toISOString(),
            })
            .eq("id", testId)
            .select()
            .single();

        if (error) {
            // Check for subscription trigger error
            if (error.code === "P0001") {
                throw new Error(
                    "Cannot start test: Your subscription does not allow starting new tests.",
                );
            }
            console.error("Error starting test:", error);
            throw new Error("Failed to start test");
        }

        return updatedTest;
    }

    /**
     * End test early (within grace period)
     */
    async endTestEarly(testId: string, studentId: string): Promise<Test> {
        const { test, can_access, reason } = await this.getTest(
            testId,
            studentId,
        );

        if (!can_access) {
            throw new Error(reason || "Cannot access this test");
        }

        if (test.status !== "in_progress") {
            throw new Error("Can only end a test that is in progress");
        }

        // Check if within grace period (first 2-3 minutes)
        const startedAt = new Date(test.started_at!);
        const now = new Date();
        const elapsedMinutes =
            (now.getTime() - startedAt.getTime()) / (1000 * 60);

        if (elapsedMinutes > 3) {
            throw new Error(
                "Grace period has expired. You must complete or submit the test.",
            );
        }

        // Calculate time spent
        const timeSpentSecs = Math.floor(
            (now.getTime() - startedAt.getTime()) / 1000,
        );

        // Set empty score breakdown for ended early tests
        const scoreBreakdown = {
            easy: { total: 0, correct: 0, percentage: 0 },
            medium: { total: 0, correct: 0, percentage: 0 },
            hard: { total: 0, correct: 0, percentage: 0 },
        };

        const { data: updatedTest, error } = await this.supabase
            .from("tests")
            .update({
                status: "ended_early" as TestStatus,
                ended_at: now.toISOString(),
                time_spent_secs: timeSpentSecs,
                marks_obtained: 0,
                percentage: 0,
                score_breakdown: scoreBreakdown,
            })
            .eq("id", testId)
            .select()
            .single();

        if (error) {
            console.error("Error ending test early:", error);
            throw new Error("Failed to end test");
        }

        return updatedTest;
    }

    // ============================================
    // ANSWER MANAGEMENT
    // ============================================

    /**
     * Save answer for a question (auto-save during test)
     */
    async saveAnswer(
        testId: string,
        studentId: string,
        questionId: string,
        selected: TestAnswer["selected"],
        timeSpentSecs: number,
    ): Promise<void> {
        const { test, can_access, is_read_only, reason } = await this.getTest(
            testId,
            studentId,
        );

        if (!can_access) {
            throw new Error(reason || "Cannot access this test");
        }

        if (is_read_only) {
            throw new Error("This test is in read-only mode");
        }

        if (test.status !== "in_progress") {
            throw new Error("Can only save answers for an in-progress test");
        }

        // Verify question is part of this test
        if (!test.questions_order.includes(questionId)) {
            throw new Error("Question is not part of this test");
        }

        // Validate word limit for essay questions
        if (typeof selected === "string" && selected.length > 0) {
            await this.validateEssayWordLimit(questionId, selected);
        }

        // Get current answers
        const currentAnswers: TestAnswer[] = test.answers || [];

        // Find or create answer entry
        const existingIndex = currentAnswers.findIndex(
            (a) => a.question_id === questionId,
        );

        const answerEntry: TestAnswer = {
            question_id: questionId,
            selected,
            is_correct: null, // Will be evaluated on submit
            marks_earned: null,
            time_spent_secs: timeSpentSecs,
        };

        if (existingIndex >= 0) {
            currentAnswers[existingIndex] = answerEntry;
        } else {
            currentAnswers.push(answerEntry);
        }

        // Update test with new answers
        const { error } = await this.supabase
            .from("tests")
            .update({ answers: currentAnswers })
            .eq("id", testId);

        if (error) {
            console.error("Error saving answer:", error);
            throw new Error("Failed to save answer");
        }
    }

    // ============================================
    // TEST SUBMISSION
    // ============================================

    /**
     * Submit a test for grading
     */
    async submitTest(
        testId: string,
        studentId: string,
    ): Promise<{ test: Test; questions: QuestionForTest[] }> {
        const { test, can_access, reason } = await this.getTest(
            testId,
            studentId,
        );

        if (!can_access) {
            throw new Error(reason || "Cannot access this test");
        }

        if (test.status !== "in_progress") {
            throw new Error("Can only submit a test that is in progress");
        }

        // Calculate time spent
        const startedAt = new Date(test.started_at!);
        const now = new Date();
        const timeSpentSecs = Math.floor(
            (now.getTime() - startedAt.getTime()) / 1000,
        );

        // Fetch questions with correct answers for grading
        const questions = await this.getQuestionsForTest(
            test.questions_order,
            true,
        );

        // Validate word limits for all essay answers before grading
        const essayQuestions = questions.filter(
            (q) => q.question_type === "essay",
        );
        for (const eq of essayQuestions) {
            const answer = (test.answers || []).find(
                (a) => a.question_id === eq.id,
            );
            if (answer?.selected && typeof answer.selected === "string") {
                const essayContent = eq.content as EssayContent;
                const wc = countWords(answer.selected);
                if (wc > essayContent.word_limit) {
                    throw new Error(
                        `Essay for question ${eq.code} exceeds the word limit of ${essayContent.word_limit} words (${wc} words submitted). Please shorten your response before submitting.`,
                    );
                }
            }
        }

        // Grade the answers (cast to GradableQuestion since we included answers)
        const { gradedAnswers, scoreBreakdown, marksObtained } =
            this.gradeAnswers(
                test.answers || [],
                questions as unknown as GradableQuestion[],
            );

        // Calculate percentage
        const percentage = test.total_marks
            ? Math.round((marksObtained / test.total_marks) * 100 * 100) / 100
            : 0;

        // Update test with grading results
        const { data: updatedTest, error } = await this.supabase
            .from("tests")
            .update({
                status: "submitted" as TestStatus,
                ended_at: now.toISOString(),
                time_spent_secs: timeSpentSecs,
                answers: gradedAnswers,
                marks_obtained: marksObtained,
                percentage,
                score_breakdown: scoreBreakdown,
            })
            .eq("id", testId)
            .select()
            .single();

        if (error) {
            console.error("Error submitting test:", error);
            throw new Error("Failed to submit test");
        }

        // Queue essay questions for LLM evaluation
        await this.queueEssayEvaluations(
            testId,
            studentId,
            questions,
            gradedAnswers,
        );

        return { test: updatedTest, questions };
    }

    /**
     * Queue any essay questions from a submitted test for LLM evaluation.
     * Only inserts rows into essay_evaluations table — actual processing
     * is triggered by the Supabase database webhook and Vercel cron.
     */
    private async queueEssayEvaluations(
        testId: string,
        studentId: string,
        questions: QuestionForTest[],
        answers: TestAnswer[],
    ): Promise<void> {
        const essayQuestions = questions.filter(
            (q) => q.question_type === "essay",
        );

        if (essayQuestions.length === 0) return;

        const essayService = new EssayEvaluationService(this.supabase);

        let queuedCount = 0;
        for (const question of essayQuestions) {
            const answer = answers.find((a) => a.question_id === question.id);
            if (!answer || !answer.selected) continue;

            // Skip empty essays (just whitespace or empty HTML tags like <p></p>)
            const plainText = stripHtmlToText(String(answer.selected));
            if (!plainText.trim()) {
                console.log(
                    `[EssayEval] Skipping empty essay for question ${question.id}`,
                );
                continue;
            }

            const content = question.content as EssayContent;

            try {
                await essayService.queueEssayEvaluation({
                    test_id: testId,
                    question_id: question.id,
                    student_id: studentId,
                    essay_prompt: content.prompt,
                    student_answer: String(answer.selected),
                    rubric: validateRubric(content.rubric),
                    word_limit: content.word_limit,
                });
                queuedCount++;
            } catch (err) {
                // Don't fail the entire submission if queuing fails
                console.error(
                    `Failed to queue essay evaluation for question ${question.id}:`,
                    err,
                );
            }
        }

        // Only trigger background processing if we actually queued any essays
        if (queuedCount === 0) {
            console.log(
                `[EssayEval] No essays to process for test ${testId} (all empty or skipped)`,
            );
            return;
        }

        // Process evaluations in background (non-blocking).
        // Don't await — let the response return immediately.
        // Cron job will retry if this fails.
        console.log(
            `[EssayEval] Triggering background processing for ${queuedCount} essay(s) on test ${testId}`,
        );
        void essayService.processQueue(queuedCount).then(
            (result) =>
                console.log(
                    `[EssayEval] Background processing completed:`,
                    result,
                ),
            (err) =>
                console.error(
                    `[EssayEval] Background processing failed for test ${testId}:`,
                    err,
                ),
        );
    }

    /**
     * Grade answers against correct answers
     */
    private gradeAnswers(
        answers: TestAnswer[],
        questions: GradableQuestion[],
    ): {
        gradedAnswers: TestAnswer[];
        scoreBreakdown: ScoreBreakdown;
        marksObtained: number;
    } {
        const questionMap = new Map(questions.map((q) => [q.id, q]));

        const breakdown: ScoreBreakdown = {
            easy: { total: 0, correct: 0, percentage: 0 },
            medium: { total: 0, correct: 0, percentage: 0 },
            hard: { total: 0, correct: 0, percentage: 0 },
        };

        let marksObtained = 0;

        // Initialize breakdown totals
        for (const q of questions) {
            breakdown[q.difficulty].total++;
        }

        // Filter out empty essay answers (treat as unattempted)
        const filteredAnswers = answers.filter((answer) => {
            const question = questionMap.get(answer.question_id);
            if (question?.question_type === "essay") {
                const plainText = stripHtmlToText(
                    String(answer.selected || ""),
                );
                if (!plainText.trim()) {
                    // Empty essay - treat as unattempted (don't include in answers)
                    return false;
                }
            }
            return true;
        });

        const gradedAnswers: TestAnswer[] = filteredAnswers.map((answer) => {
            const question = questionMap.get(answer.question_id);

            if (!question) {
                console.error(
                    `Question ${answer.question_id} not found in question map during grading`,
                );
                return { ...answer, is_correct: false, marks_earned: 0 };
            }

            // Essays are evaluated by LLM — mark as pending (null)
            if (question.question_type === "essay") {
                // Don't include essays in score breakdown — they're async evaluated
                // Marks earned stays null until LLM evaluation completes
                return {
                    ...answer,
                    is_correct: null,
                    marks_earned: null,
                };
            }

            // Validate question has required fields
            if (!question.correct_answer) {
                console.error(
                    `Question ${question.id} (type: ${question.question_type}) has no correct_answer field`,
                );
                return { ...answer, is_correct: false, marks_earned: 0 };
            }

            const isCorrect = this.checkAnswer(
                answer.selected,
                question.correct_answer,
                question.question_type,
            );

            // Handle null (shouldn't happen for non-essays, but be safe)
            if (isCorrect === null) {
                return { ...answer, is_correct: null, marks_earned: null };
            }

            const marksEarned = isCorrect ? question.marks : 0;

            if (isCorrect) {
                marksObtained += marksEarned;
                breakdown[question.difficulty].correct++;
            }

            return {
                ...answer,
                is_correct: isCorrect,
                marks_earned: marksEarned,
            };
        });

        // Calculate percentages for breakdown
        for (const level of ["easy", "medium", "hard"] as DifficultyLevel[]) {
            if (breakdown[level].total > 0) {
                breakdown[level].percentage = Math.round(
                    (breakdown[level].correct / breakdown[level].total) * 100,
                );
            }
        }

        return { gradedAnswers, scoreBreakdown: breakdown, marksObtained };
    }

    /**
     * Check if an answer is correct based on question type
     * Returns: true = correct, false = incorrect, null = pending evaluation (essays)
     */
    private checkAnswer(
        selected: TestAnswer["selected"],
        correctAnswer: CorrectAnswer,
        questionType: string,
    ): boolean | null {
        if (selected === null || selected === undefined) {
            return false;
        }

        // Validate that correctAnswer exists
        if (!correctAnswer || typeof correctAnswer !== "object") {
            console.error(
                `Invalid correct_answer for question type ${questionType}:`,
                correctAnswer,
            );
            return false;
        }

        switch (questionType) {
            case "mcq":
            case "passage_mcq":
            case "poem_mcq": {
                const correct = correctAnswer as MCQAnswer;

                // Validate structure
                if (!correct.label || typeof correct.label !== "string") {
                    console.error(
                        `Invalid MCQ correct_answer structure. Expected {label: string}, got:`,
                        correct,
                    );
                    return false;
                }

                // Normalize both to uppercase for comparison
                const selectedKey = String(selected).trim().toUpperCase();
                const correctKey = String(correct.label).trim().toUpperCase();
                return selectedKey === correctKey;
            }

            case "fill_blank_dropdown": {
                const correct = correctAnswer as FillBlankAnswer;

                if (!Array.isArray(selected)) return false;

                // Validate structure
                if (!correct.answers || !Array.isArray(correct.answers)) {
                    console.error(
                        `Invalid fill_blank_dropdown correct_answer structure. Expected {answers: array}, got:`,
                        correct,
                    );
                    return false;
                }

                return (
                    selected.length === correct.answers.length &&
                    selected.every((val, idx) => val === correct.answers[idx])
                );
            }

            case "fill_missing_sentence": {
                const correct = correctAnswer as FillMissingSentenceAnswer;

                if (typeof selected !== "object" || Array.isArray(selected))
                    return false;

                // Validate structure
                if (!correct.mapping || typeof correct.mapping !== "object") {
                    console.error(
                        `Invalid fill_missing_sentence correct_answer structure. Expected {mapping: object}, got:`,
                        correct,
                    );
                    return false;
                }

                const selectedMapping = selected as Record<string, number>;
                return Object.entries(correct.mapping).every(
                    ([key, value]) => selectedMapping[key] === value,
                );
            }

            case "essay":
                // Essays are evaluated separately by LLM — return null to indicate pending
                return null;

            default:
                console.warn(`Unknown question type: ${questionType}`);
                return false;
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Validate that an essay answer does not exceed the question's word limit.
     * Fetches the question to get the word limit from content.
     * Throws if the answer exceeds the limit.
     */
    private async validateEssayWordLimit(
        questionId: string,
        selected: string,
    ): Promise<void> {
        const { data: question } = await this.supabase
            .from("questions")
            .select("question_type, content")
            .eq("id", questionId)
            .single();

        if (!question || question.question_type !== "essay") return;

        const content = question.content as EssayContent;
        if (!content.word_limit) return;

        const wc = countWords(selected);
        if (wc > content.word_limit) {
            throw new Error(
                `Essay exceeds the word limit of ${content.word_limit} words (${wc} words submitted). Please shorten your response.`,
            );
        }
    }

    /**
     * Shuffle an array using Fisher-Yates algorithm
     */
    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Get student's test access status (for UI)
     */
    async getStudentTestAccessStatus(studentId: string): Promise<{
        can_take_new_tests: boolean;
        is_in_grace_period: boolean;
        subscription_status: string | null;
        expires_at: string | null;
        message: string;
    }> {
        const { data, error } = await this.supabase.rpc(
            "get_student_test_access_status",
            { p_student_id: studentId },
        );

        if (error || !data?.[0]) {
            return {
                can_take_new_tests: false,
                is_in_grace_period: false,
                subscription_status: null,
                expires_at: null,
                message: "Unable to verify subscription status",
            };
        }

        return data[0];
    }
}
