// ============================================
// TEST PLATFORM TYPES
// ============================================

// Enums (matching database)
export type DifficultyLevel = "easy" | "medium" | "hard";
export type QuestionType =
    | "mcq"
    | "passage_mcq"
    | "poem_mcq"
    | "fill_blank_dropdown"
    | "fill_missing_sentence"
    | "essay";
export type TestStatus =
    | "not_started"
    | "in_progress"
    | "ended_early"
    | "submitted"
    | "abandoned";

// ============================================
// DATABASE TYPES
// ============================================

export interface Subject {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    duration_mins: number;
    total_questions: number;
    instructions: InstructionPage[] | null;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export interface InstructionPage {
    title: string;
    content: string;
}

// ============================================
// TYPE QUOTA TYPES
// ============================================

/**
 * Flat map stored in subject_templates.type_quotas (JSONB).
 * When present, overrides the legacy easy/medium/hard adaptive algorithm.
 *
 * Reserved passage-control keys (not treated as question types):
 *   "passage"       → number of extract-type passages to select
 *   "passage_mcq"   → questions taken from each extract passage
 *   "passage_poem"  → number of poem-type passages to select
 *   "poem_mcq"      → questions taken from each poem passage
 *
 * Every other key is treated as a question_type whose value is the total
 * standalone question count for that type.  Adding a new question type to
 * the subject only requires updating this JSONB — no code change needed.
 *
 * Examples:
 *   { "mcq": 40 }
 *   { "passage": 3, "passage_mcq": 5, "passage_poem": 2, "poem_mcq": 5,
 *     "fill_blank_dropdown": 8, "fill_missing_sentence": 7 }
 */
export type TypeQuotas = Record<string, number>;

export interface SubjectTemplate {
    id: string;
    subject_id: string;
    name: string;
    is_default: boolean;
    easy_count: number;
    medium_count: number;
    hard_count: number;
    passing_score: number | null;
    created_at: string;
    type_quotas: TypeQuotas | null;
}

export interface Passage {
    id: string;
    subject_id: string;
    code: string;
    passage_type: "extract" | "poem" | "article";
    title: string | null;
    content: string;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface Question {
    id: string;
    subject_id: string;
    passage_ids: string[];
    code: string;
    question_type: QuestionType;
    difficulty: DifficultyLevel;
    topic: string | null;
    subtopic: string | null;
    content: QuestionContent;
    correct_answer: CorrectAnswer;
    solution_text: string | null;
    solution_images: string[];
    marks: number;
    is_active: boolean;
    times_shown: number;
    times_correct: number;
    created_at: string;
    updated_at: string;
    // Joined data
    passages?: Passage[];
}

// ============================================
// QUESTION CONTENT TYPES
// ============================================

export type QuestionContent =
    | MCQContent
    | FillBlankContent
    | FillMissingSentenceContent
    | EssayContent;

export interface MCQContent {
    question: string;
    question_image?: string | null; // new upload code uses this
    question_image_url?: string | null; // legacy: old upload code used this
    question_images?: string[] | null; // new: supports [img:1], [img:2] etc in question text
    options: MCQOption[];
}

export interface MCQOption {
    label: "A" | "B" | "C" | "D";
    text?: string;
    image_url?: string | null;
}

export interface FillBlankContent {
    passage_text: string;
    passage_images?: string[]; // New: supports [img:1], [img:2] etc in passage text
    blanks: FillBlank[];
}

export interface FillBlank {
    position: number;
    options: string[];
    correct_index: number;
}

export interface FillMissingSentenceContent {
    passage_with_gaps: string;
    passage_images?: string[]; // New: supports [img:1], [img:2] etc in passage text
    sentences: string[];
    correct_mapping: Record<string, number>; // e.g., {"GAP_1": 0, "GAP_2": 2}
}

export interface EssayContent {
    prompt: string;
    prompt_images?: string[]; // New: supports [img:1], [img:2] etc in prompt text
    word_limit: number;
    time_mins: number;
    rubric?: Record<string, number>; // Legacy only; new questions use writing_marking_criteria
}

// ============================================
// CORRECT ANSWER TYPES
// ============================================

export type CorrectAnswer =
    | MCQAnswer
    | FillBlankAnswer
    | FillMissingSentenceAnswer
    | EssayAnswer;

export interface MCQAnswer {
    label: "A" | "B" | "C" | "D";
}

export interface FillBlankAnswer {
    answers: number[]; // Array of correct indexes
}

export interface FillMissingSentenceAnswer {
    mapping: Record<string, number>;
}

export type EssayAnswer = null; // Evaluated by LLM

// ============================================
// TEST TYPES
// ============================================

export interface Test {
    id: string;
    student_id: string;
    subject_id: string;
    template_id: string | null;
    status: TestStatus;
    started_at: string | null;
    ended_at: string | null;
    duration_mins: number;
    time_spent_secs: number | null;
    questions_order: string[];
    answers: TestAnswer[];
    total_marks: number | null;
    marks_obtained: number | null;
    percentage: number | null;
    score_breakdown: ScoreBreakdown | null;
    essay_evaluation: EssayEvaluation | null;
    created_at: string;
    updated_at: string;
    // Joined data
    subject?: Subject;
}

export interface TestAnswer {
    question_id: string;
    selected: string | number[] | Record<string, number> | null;
    is_correct: boolean | null;
    marks_earned: number | null;
    time_spent_secs: number | null;
}

export interface ScoreBreakdown {
    easy: DifficultyScore;
    medium: DifficultyScore;
    hard: DifficultyScore;
}

export interface DifficultyScore {
    total: number;
    correct: number;
    percentage: number;
}

export interface EssayEvaluation {
    score: number;
    max_score: number;
    feedback: string;
    rubric_scores: Record<string, number>;
    evaluated_at: string;
}

// ============================================
// STUDENT STATS TYPES
// ============================================

export interface StudentSubjectStats {
    id: string;
    student_id: string;
    subject_id: string;
    tests_taken: number;
    total_questions_attempted: number;
    total_correct: number;
    easy_attempted: number;
    easy_correct: number;
    medium_attempted: number;
    medium_correct: number;
    hard_attempted: number;
    hard_correct: number;
    overall_accuracy: number | null;
    current_level: DifficultyLevel;
    last_test_at: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    subject?: Subject;
}

export interface StudentQuestionHistory {
    id: string;
    student_id: string;
    question_id: string;
    test_id: string;
    was_correct: boolean;
    attempts: number;
    last_shown_at: string;
}

// ============================================
// CUSTOM TEST TYPES (admin-created)
// ============================================

export type CustomTestVisibility =
    | "admin_only"
    | "subscribers_only"
    | "free_trial";

export interface CustomTest {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    visibility: CustomTestVisibility;
    duration_mins: number;
    instructions: InstructionPage[] | null;
    is_active: boolean;
    display_order: number;
    available_from: string | null;
    available_until: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    // Joined
    question_count?: number;
    questions?: CustomTestQuestion[];
}

export interface CustomTestQuestion {
    id: string;
    custom_test_id: string;
    question_id: string;
    sort_order: number;
    // Joined
    question?: Question;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface StartTestResponse {
    test: Test;
    questions: QuestionForTest[];
}

export interface QuestionForTest {
    id: string;
    code: string;
    question_type: QuestionType;
    difficulty: DifficultyLevel;
    topic?: string | null;
    subtopic?: string | null;
    content: QuestionContent;
    marks: number;
    // Note: correct_answer is NOT included
    passages?: Passage[];
}

export interface SubmitAnswerRequest {
    question_id: string;
    selected: string | number[] | Record<string, number>;
    time_spent_secs: number;
}

export interface SubmitTestResponse {
    test: Test;
    questions_with_answers: QuestionWithAnswer[];
}

export interface QuestionWithAnswer extends QuestionForTest {
    correct_answer: CorrectAnswer;
    solution_text: string | null;
    solution_images: string[];
    student_answer: TestAnswer;
}

// ============================================
// UPLOAD TYPES
// ============================================

export interface QuestionUploadBatch {
    id: string;
    uploaded_by: string;
    subject_id: string;
    filename: string;
    total_questions: number;
    successful: number;
    failed: number;
    errors: UploadError[] | null;
    status: "processing" | "completed" | "failed";
    created_at: string;
}

export interface UploadError {
    row: number;
    field: string;
    message: string;
}

export interface CSVQuestionRow {
    code: string;
    type: QuestionType;
    difficulty: DifficultyLevel;
    question_text?: string;
    option_a?: string;
    option_b?: string;
    option_c?: string;
    option_d?: string;
    correct?: string;
    question_image?: string;
    option_a_image?: string;
    option_b_image?: string;
    option_c_image?: string;
    option_d_image?: string;
    solution?: string;
    passage_code?: string;
    passage_text?: string;
    blanks_json?: string;
}

// ============================================
// ADAPTIVE ALGORITHM TYPES
// ============================================

export interface AdaptiveDistribution {
    easy_count: number;
    medium_count: number;
    hard_count: number;
}

// ============================================
// SUBSCRIPTION CHECK TYPES
// ============================================

export type SubscriptionStatus = "active" | "expired" | "grace_period";

export interface SubscriptionAccessResult {
    can_access: boolean;
    is_read_only: boolean;
    reason: string;
}

export interface StudentTestAccessStatus {
    can_take_new_tests: boolean;
    is_in_grace_period: boolean;
    subscription_status: SubscriptionStatus | null;
    expires_at: string | null;
    grace_period_ends_at: string | null;
    message: string;
}

// API response types with subscription checks
export interface StartTestResult {
    success: boolean;
    test?: Test;
    questions?: QuestionForTest[];
    error?: string;
    subscription_error?: boolean;
}

export interface AccessTestResult {
    success: boolean;
    test?: Test;
    can_access: boolean;
    is_read_only: boolean;
    reason?: string;
}
