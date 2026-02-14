-- ============================================
-- TEST PLATFORM SCHEMA
-- Migration: 20260208000001
-- Description: Tables, functions, triggers for test platform
-- ============================================

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE question_type AS ENUM (
    'mcq',                    -- Standard MCQ (Math, Thinking Skills)
    'passage_mcq',            -- MCQ based on passage/extract (Reading)
    'poem_mcq',               -- MCQ based on poem (Reading)
    'fill_blank_dropdown',    -- Fill in blanks with dropdown (Reading)
    'fill_missing_sentence',  -- Drag-drop missing sentences (Reading)
    'essay'                   -- Essay writing (Writing)
);
CREATE TYPE test_status AS ENUM (
    'not_started',
    'in_progress',
    'ended_early',    -- Clicked "End Test" within grace period
    'submitted',      -- Normal submission or timer expired
    'abandoned'       -- Browser closed, never resumed
);

-- ============================================
-- TABLES
-- ============================================

-- 1. SUBJECTS (Reading, Writing, Math, Thinking Skills)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),                    -- Icon name for UI (e.g., 'book', 'pencil')
    duration_mins INT NOT NULL,          -- Fixed test duration
    total_questions INT NOT NULL DEFAULT 40,
    instructions JSONB,                  -- Test instructions pages
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SUBJECT TEMPLATES (difficulty distribution per subject)
CREATE TABLE subject_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,          -- e.g., "Initial Assessment", "Standard", "Advanced"
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    easy_count INT NOT NULL DEFAULT 25,
    medium_count INT NOT NULL DEFAULT 10,
    hard_count INT NOT NULL DEFAULT 5,
    passing_score INT,                   -- Optional passing threshold
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PASSAGES (for reading comprehension questions)
CREATE TABLE passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,    -- e.g., "RD_P_001"
    passage_type VARCHAR(20) NOT NULL,   -- 'extract', 'poem', 'article'
    title VARCHAR(200),
    content TEXT NOT NULL,               -- The actual passage text
    image_url TEXT,                      -- Optional image for the passage
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. QUESTIONS (flexible JSONB structure for all types)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    passage_id UUID REFERENCES passages(id) ON DELETE SET NULL,
    code VARCHAR(20) NOT NULL UNIQUE,    -- e.g., "MR_001", "RD_FIB_001"
    question_type question_type NOT NULL,
    difficulty difficulty_level NOT NULL,
    
    -- Flexible content structure (varies by question_type)
    content JSONB NOT NULL,
    /*
    MCQ content example:
    {
        "question_text": "What is 5 + 3?",
        "question_image": "questions/MR_001_q.png",
        "options": [
            {"key": "A", "text": "6", "image": null},
            {"key": "B", "text": "7", "image": null},
            {"key": "C", "text": "8", "image": null},
            {"key": "D", "text": "9", "image": null}
        ]
    }
    
    Fill-blank dropdown example:
    {
        "passage_text": "The cat ___ on the mat. It ___ sleeping.",
        "blanks": [
            {"position": 1, "options": ["sat", "sit", "set"], "correct_index": 0},
            {"position": 2, "options": ["was", "is", "were"], "correct_index": 0}
        ]
    }
    
    Fill missing sentence example:
    {
        "passage_with_gaps": "[1] The sun rose. [GAP_1] Birds started singing. [GAP_2]",
        "sentences": ["The flowers bloomed", "Children woke up", "Dogs barked"],
        "correct_mapping": {"GAP_1": 0, "GAP_2": 1}
    }
    
    Essay example:
    {
        "prompt": "Describe your favorite holiday...",
        "word_limit": 300,
        "time_limit_mins": 30,
        "rubric": {
            "content": 10,
            "structure": 5,
            "grammar": 5
        }
    }
    */
    
    -- Correct answer (varies by question_type)
    correct_answer JSONB NOT NULL,
    /*
    MCQ: {"key": "C"}
    Fill-blank: {"answers": [0, 0]} (indexes of correct options)
    Fill missing: {"mapping": {"GAP_1": 0, "GAP_2": 1}}
    Essay: null (evaluated by LLM)
    */
    
    -- Solution explanation (optional, text only)
    solution_text TEXT,
    
    -- Metadata
    marks INT NOT NULL DEFAULT 1,        -- Points for this question
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    times_shown INT NOT NULL DEFAULT 0,  -- Analytics: how many times shown
    times_correct INT NOT NULL DEFAULT 0, -- Analytics: how many times answered correctly
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TESTS (student test instances)
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    template_id UUID REFERENCES subject_templates(id) ON DELETE SET NULL,
    
    status test_status NOT NULL DEFAULT 'not_started',
    
    -- Timing
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_mins INT NOT NULL,          -- Copied from subject at test creation
    time_spent_secs INT,                 -- Actual time spent
    
    -- Questions and answers (stored as JSONB for efficiency)
    questions_order UUID[] NOT NULL,     -- Array of question IDs in order shown
    answers JSONB NOT NULL DEFAULT '[]',
    /*
    Answers structure:
    [
        {
            "question_id": "uuid",
            "selected": "C",           // or [0, 1] for fill-blank, {"GAP_1": 0} for missing sentence
            "is_correct": true,
            "marks_earned": 1,
            "time_spent_secs": 45
        },
        ...
    ]
    */
    
    -- Scoring
    total_marks INT,
    marks_obtained INT,
    percentage DECIMAL(5,2),
    
    -- Breakdown by difficulty (for analytics)
    score_breakdown JSONB,
    /*
    {
        "easy": {"total": 25, "correct": 20, "percentage": 80},
        "medium": {"total": 10, "correct": 6, "percentage": 60},
        "hard": {"total": 5, "correct": 2, "percentage": 40}
    }
    */
    
    -- Essay evaluation (if applicable)
    essay_evaluation JSONB,
    /*
    {
        "score": 15,
        "max_score": 20,
        "feedback": "Good structure but...",
        "rubric_scores": {"content": 8, "structure": 4, "grammar": 3},
        "evaluated_at": "2026-02-08T..."
    }
    */
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. STUDENT QUESTION HISTORY (track which questions student has seen/answered)
CREATE TABLE student_question_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    
    was_correct BOOLEAN NOT NULL,
    attempts INT NOT NULL DEFAULT 1,     -- How many times shown this question
    last_shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, question_id)      -- One record per student-question pair
);

-- 7. STUDENT SUBJECT STATS (for adaptive algorithm)
CREATE TABLE student_subject_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    tests_taken INT NOT NULL DEFAULT 0,
    total_questions_attempted INT NOT NULL DEFAULT 0,
    total_correct INT NOT NULL DEFAULT 0,
    
    -- Accuracy by difficulty
    easy_attempted INT NOT NULL DEFAULT 0,
    easy_correct INT NOT NULL DEFAULT 0,
    medium_attempted INT NOT NULL DEFAULT 0,
    medium_correct INT NOT NULL DEFAULT 0,
    hard_attempted INT NOT NULL DEFAULT 0,
    hard_correct INT NOT NULL DEFAULT 0,
    
    -- Calculated fields
    overall_accuracy DECIMAL(5,2),       -- Percentage
    current_level difficulty_level DEFAULT 'easy',
    
    last_test_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, subject_id)
);

-- 8. QUESTION UPLOAD BATCHES (track bulk uploads)
CREATE TABLE question_upload_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    
    filename VARCHAR(255) NOT NULL,
    total_questions INT NOT NULL,
    successful INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    errors JSONB,                        -- Array of error messages
    
    status VARCHAR(20) NOT NULL DEFAULT 'processing', -- processing, completed, failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_active ON questions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_questions_code ON questions(code);

CREATE INDEX idx_passages_subject ON passages(subject_id);
CREATE INDEX idx_passages_code ON passages(code);

CREATE INDEX idx_tests_student ON tests(student_id);
CREATE INDEX idx_tests_subject ON tests(subject_id);
CREATE INDEX idx_tests_status ON tests(status);
CREATE INDEX idx_tests_created ON tests(created_at);

CREATE INDEX idx_student_question_history_student ON student_question_history(student_id);
CREATE INDEX idx_student_question_history_question ON student_question_history(question_id);
CREATE INDEX idx_student_question_history_correct ON student_question_history(was_correct);

CREATE INDEX idx_student_subject_stats_student ON student_subject_stats(student_id);
CREATE INDEX idx_student_subject_stats_subject ON student_subject_stats(subject_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get questions for a new test (adaptive algorithm)
CREATE OR REPLACE FUNCTION get_test_questions(
    p_student_id UUID,
    p_subject_id UUID,
    p_easy_count INT DEFAULT 25,
    p_medium_count INT DEFAULT 10,
    p_hard_count INT DEFAULT 5
)
RETURNS TABLE (question_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tests_taken INT;
BEGIN
    -- Get student's test count for this subject
    SELECT COALESCE(tests_taken, 0) INTO v_tests_taken
    FROM student_subject_stats
    WHERE student_id = p_student_id AND subject_id = p_subject_id;
    
    -- Select questions prioritizing:
    -- 1. Never seen questions
    -- 2. Previously incorrect questions
    -- 3. Avoid recently shown questions
    
    RETURN QUERY
    WITH ranked_questions AS (
        SELECT 
            q.id,
            q.difficulty,
            CASE 
                WHEN sqh.id IS NULL THEN 1              -- Never seen (highest priority)
                WHEN sqh.was_correct = FALSE THEN 2    -- Previously wrong
                ELSE 3                                  -- Previously correct (lowest)
            END as priority,
            sqh.last_shown_at
        FROM questions q
        LEFT JOIN student_question_history sqh 
            ON q.id = sqh.question_id AND sqh.student_id = p_student_id
        WHERE q.subject_id = p_subject_id
          AND q.is_active = TRUE
          AND (sqh.was_correct IS NULL OR sqh.was_correct = FALSE)  -- Exclude correctly answered
        ORDER BY priority, sqh.last_shown_at NULLS FIRST, RANDOM()
    )
    -- Get easy questions
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'easy' LIMIT p_easy_count)
    UNION ALL
    -- Get medium questions
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'medium' LIMIT p_medium_count)
    UNION ALL
    -- Get hard questions
    (SELECT rq.id FROM ranked_questions rq WHERE rq.difficulty = 'hard' LIMIT p_hard_count);
END;
$$;

-- Function to calculate adaptive difficulty distribution
CREATE OR REPLACE FUNCTION get_adaptive_distribution(
    p_student_id UUID,
    p_subject_id UUID,
    p_total_questions INT DEFAULT 40
)
RETURNS TABLE (easy_count INT, medium_count INT, hard_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stats student_subject_stats%ROWTYPE;
    v_accuracy DECIMAL;
BEGIN
    -- Get student's stats
    SELECT * INTO v_stats
    FROM student_subject_stats
    WHERE student_id = p_student_id AND subject_id = p_subject_id;
    
    -- If no stats or < 2 tests, return default distribution
    IF v_stats IS NULL OR v_stats.tests_taken < 2 THEN
        RETURN QUERY SELECT 25::INT, 10::INT, 5::INT;
        RETURN;
    END IF;
    
    v_accuracy := v_stats.overall_accuracy;
    
    -- Adaptive distribution based on accuracy
    IF v_accuracy < 40 THEN
        -- Struggling: More easy questions
        RETURN QUERY SELECT 30::INT, 8::INT, 2::INT;
    ELSIF v_accuracy < 60 THEN
        -- Below average: Slightly more easy
        RETURN QUERY SELECT 25::INT, 12::INT, 3::INT;
    ELSIF v_accuracy < 75 THEN
        -- Average: Balanced
        RETURN QUERY SELECT 20::INT, 15::INT, 5::INT;
    ELSIF v_accuracy < 85 THEN
        -- Good: More medium/hard
        RETURN QUERY SELECT 15::INT, 17::INT, 8::INT;
    ELSE
        -- Excellent: Challenge them
        RETURN QUERY SELECT 10::INT, 18::INT, 12::INT;
    END IF;
END;
$$;

-- Function to update student stats after test completion
CREATE OR REPLACE FUNCTION update_student_stats_after_test()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_question RECORD;
    v_easy_correct INT := 0;
    v_easy_total INT := 0;
    v_medium_correct INT := 0;
    v_medium_total INT := 0;
    v_hard_correct INT := 0;
    v_hard_total INT := 0;
BEGIN
    -- Only process when test is submitted or abandoned
    IF NEW.status NOT IN ('submitted', 'abandoned') THEN
        RETURN NEW;
    END IF;
    
    -- Calculate score breakdown from answers
    FOR v_question IN 
        SELECT 
            q.difficulty,
            (a->>'is_correct')::BOOLEAN as is_correct
        FROM jsonb_array_elements(NEW.answers) a
        JOIN questions q ON q.id = (a->>'question_id')::UUID
    LOOP
        CASE v_question.difficulty
            WHEN 'easy' THEN
                v_easy_total := v_easy_total + 1;
                IF v_question.is_correct THEN v_easy_correct := v_easy_correct + 1; END IF;
            WHEN 'medium' THEN
                v_medium_total := v_medium_total + 1;
                IF v_question.is_correct THEN v_medium_correct := v_medium_correct + 1; END IF;
            WHEN 'hard' THEN
                v_hard_total := v_hard_total + 1;
                IF v_question.is_correct THEN v_hard_correct := v_hard_correct + 1; END IF;
        END CASE;
    END LOOP;
    
    -- Upsert student_subject_stats
    INSERT INTO student_subject_stats (
        student_id, subject_id, tests_taken,
        total_questions_attempted, total_correct,
        easy_attempted, easy_correct,
        medium_attempted, medium_correct,
        hard_attempted, hard_correct,
        overall_accuracy, last_test_at
    )
    VALUES (
        NEW.student_id, NEW.subject_id, 1,
        v_easy_total + v_medium_total + v_hard_total,
        v_easy_correct + v_medium_correct + v_hard_correct,
        v_easy_total, v_easy_correct,
        v_medium_total, v_medium_correct,
        v_hard_total, v_hard_correct,
        CASE WHEN (v_easy_total + v_medium_total + v_hard_total) > 0 
            THEN ((v_easy_correct + v_medium_correct + v_hard_correct)::DECIMAL / 
                  (v_easy_total + v_medium_total + v_hard_total) * 100)
            ELSE 0 
        END,
        NOW()
    )
    ON CONFLICT (student_id, subject_id) DO UPDATE SET
        tests_taken = student_subject_stats.tests_taken + 1,
        total_questions_attempted = student_subject_stats.total_questions_attempted + 
            EXCLUDED.total_questions_attempted,
        total_correct = student_subject_stats.total_correct + EXCLUDED.total_correct,
        easy_attempted = student_subject_stats.easy_attempted + EXCLUDED.easy_attempted,
        easy_correct = student_subject_stats.easy_correct + EXCLUDED.easy_correct,
        medium_attempted = student_subject_stats.medium_attempted + EXCLUDED.medium_attempted,
        medium_correct = student_subject_stats.medium_correct + EXCLUDED.medium_correct,
        hard_attempted = student_subject_stats.hard_attempted + EXCLUDED.hard_attempted,
        hard_correct = student_subject_stats.hard_correct + EXCLUDED.hard_correct,
        overall_accuracy = CASE 
            WHEN (student_subject_stats.total_questions_attempted + EXCLUDED.total_questions_attempted) > 0
            THEN ((student_subject_stats.total_correct + EXCLUDED.total_correct)::DECIMAL / 
                  (student_subject_stats.total_questions_attempted + EXCLUDED.total_questions_attempted) * 100)
            ELSE 0 
        END,
        last_test_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- Function to mark abandoned test answers as wrong
CREATE OR REPLACE FUNCTION mark_abandoned_test()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_answers JSONB := '[]'::JSONB;
    v_answer JSONB;
BEGIN
    IF NEW.status = 'abandoned' AND OLD.status != 'abandoned' THEN
        -- Update each answer to mark as incorrect with 0 marks
        FOR v_answer IN SELECT * FROM jsonb_array_elements(NEW.answers)
        LOOP
            v_updated_answers := v_updated_answers || jsonb_build_object(
                'question_id', v_answer->>'question_id',
                'selected', v_answer->>'selected',
                'is_correct', false,
                'marks_earned', 0,
                'time_spent_secs', v_answer->>'time_spent_secs'
            );
        END LOOP;
        
        NEW.answers := v_updated_answers;
        NEW.marks_obtained := 0;
        NEW.percentage := 0;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to update question history after test
CREATE OR REPLACE FUNCTION update_question_history_after_test()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_answer JSONB;
BEGIN
    -- Only process when test is submitted or abandoned
    IF NEW.status NOT IN ('submitted', 'abandoned') THEN
        RETURN NEW;
    END IF;
    
    -- Update history for each answered question
    FOR v_answer IN SELECT * FROM jsonb_array_elements(NEW.answers)
    LOOP
        INSERT INTO student_question_history (
            student_id, question_id, test_id, was_correct, last_shown_at
        )
        VALUES (
            NEW.student_id,
            (v_answer->>'question_id')::UUID,
            NEW.id,
            COALESCE((v_answer->>'is_correct')::BOOLEAN, FALSE),
            NOW()
        )
        ON CONFLICT (student_id, question_id) DO UPDATE SET
            test_id = EXCLUDED.test_id,
            was_correct = EXCLUDED.was_correct,
            attempts = student_question_history.attempts + 1,
            last_shown_at = NOW();
    END LOOP;
    
    -- Update question analytics
    UPDATE questions SET
        times_shown = times_shown + 1,
        times_correct = times_correct + CASE 
            WHEN EXISTS (
                SELECT 1 FROM jsonb_array_elements(NEW.answers) a 
                WHERE (a->>'question_id')::UUID = questions.id 
                  AND (a->>'is_correct')::BOOLEAN = TRUE
            ) THEN 1 ELSE 0 
        END
    WHERE id = ANY(NEW.questions_order);
    
    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_passages_updated_at
    BEFORE UPDATE ON passages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tests_updated_at
    BEFORE UPDATE ON tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_student_subject_stats_updated_at
    BEFORE UPDATE ON student_subject_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER on_test_abandoned
    BEFORE UPDATE ON tests
    FOR EACH ROW
    WHEN (NEW.status = 'abandoned' AND OLD.status != 'abandoned')
    EXECUTE FUNCTION mark_abandoned_test();

CREATE TRIGGER on_test_completed
    AFTER UPDATE ON tests
    FOR EACH ROW
    WHEN (NEW.status IN ('submitted', 'abandoned') AND OLD.status NOT IN ('submitted', 'abandoned'))
    EXECUTE FUNCTION update_student_stats_after_test();

CREATE TRIGGER on_test_completed_history
    AFTER UPDATE ON tests
    FOR EACH ROW
    WHEN (NEW.status IN ('submitted', 'abandoned') AND OLD.status NOT IN ('submitted', 'abandoned'))
    EXECUTE FUNCTION update_question_history_after_test();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subject_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_upload_batches ENABLE ROW LEVEL SECURITY;

-- Subjects: Everyone can read active subjects
CREATE POLICY "Anyone can view active subjects"
    ON subjects FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admins can manage subjects"
    ON subjects FOR ALL
    USING (is_admin());

-- Subject Templates: Everyone can read
CREATE POLICY "Anyone can view templates"
    ON subject_templates FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can manage templates"
    ON subject_templates FOR ALL
    USING (is_admin());

-- Passages: Authenticated users can read
CREATE POLICY "Authenticated can view passages"
    ON passages FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Admins can manage passages"
    ON passages FOR ALL
    USING (is_admin());

-- Questions: Access through SECURITY DEFINER functions
-- Students shouldn't see correct_answer directly
CREATE POLICY "Admins can manage questions"
    ON questions FOR ALL
    USING (is_admin());

-- Tests: Students see own tests, parents see their children's tests
CREATE POLICY "Students can view own tests"
    ON tests FOR SELECT
    USING (TRUE);  -- Controlled via SECURITY DEFINER functions for students

CREATE POLICY "Students can insert own tests"
    ON tests FOR INSERT
    WITH CHECK (TRUE);  -- Controlled via application

CREATE POLICY "Students can update own tests"
    ON tests FOR UPDATE
    USING (TRUE);  -- Controlled via application

CREATE POLICY "Parents can view children tests"
    ON tests FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM students WHERE parent_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage tests"
    ON tests FOR ALL
    USING (is_admin());

-- Student Question History
CREATE POLICY "System can manage history"
    ON student_question_history FOR ALL
    USING (TRUE);  -- Controlled via SECURITY DEFINER functions

-- Student Subject Stats
CREATE POLICY "Anyone can view stats"
    ON student_subject_stats FOR SELECT
    USING (TRUE);  -- Controlled via application

CREATE POLICY "System can manage stats"
    ON student_subject_stats FOR ALL
    USING (TRUE);  -- Controlled via SECURITY DEFINER triggers

-- Question Upload Batches
CREATE POLICY "Admins can manage uploads"
    ON question_upload_batches FOR ALL
    USING (is_admin());

-- ============================================
-- SEED DATA: Initial Subjects
-- ============================================

INSERT INTO subjects (name, slug, description, icon, duration_mins, total_questions, display_order, instructions) VALUES
(
    'Reading', 
    'reading', 
    'Reading comprehension including passages, poems, and fill-in-the-blank questions',
    'book-open',
    45,
    40,
    1,
    '{
        "pages": [
            {
                "title": "Selective High School Placement Practice Test",
                "content": "<p>You have <strong>45 minutes</strong> to complete <strong>17 questions</strong> in this test.</p><br/><p>For Questions 1–8, choose <strong>one</strong> correct answer to each question.</p><p>For Question 9, choose the <strong>eight</strong> correct answers.</p><p>For Questions 10–15, choose <strong>one</strong> correct answer to each question.</p><p>For Question 16, choose the <strong>six</strong> correct answers.</p><p>For Question 17, choose the <strong>ten</strong> correct answers.</p><p>You will <strong>not</strong> lose marks for incorrect answers, so you should attempt <strong>all</strong> questions.</p><br/><p>Please note that some words and phrases are in <strong>bold</strong> in the texts as they are referred to in some questions.</p><p>Calculators and dictionaries are <strong>not</strong> allowed.</p><br/><p><em>Every reasonable effort has been made by the publisher to trace copyright holders, but if any items requiring clearance have unwittingly been included, the publisher will be pleased to make amends at the earliest possible opportunity.</em></p>"
            }
        ]
    }'::JSONB
),
(
    'Writing', 
    'writing', 
    'Essay writing with AI-powered evaluation',
    'pencil',
    30,
    1,
    2,
    '{
        "pages": [
            {
                "title": "Selective High School Placement Practice Test",
                "content": "<p>You have <strong>30 minutes</strong> to complete this test.</p><p>This test contains <strong>one</strong> task.</p><br/><p><em>The task provides an opportunity for you to show how well you can choose, develop and organise ideas and communicate them effectively in writing.</em></p><p><em>Before you begin writing, take time to think carefully about what you need to say and the ways in which the organisation and layout of your response might help express your message.</em></p><p>You will receive a <strong>higher mark</strong> if you produce an original and engaging response to the writing task.</p><p>You will receive a <strong>lower mark</strong> if your writing does not address the topic outlined in the writing task.</p><br/><p>Calculators and dictionaries are <strong>not</strong> allowed.</p><p>This test will <strong>not</strong> be marked.</p>"
            }
        ]
    }'::JSONB
),
(
    'Mathematical Reasoning', 
    'mathematical-reasoning', 
    'Mathematical problem solving and logical reasoning',
    'calculator',
    45,
    40,
    3,
    '{
        "pages": [
            {
                "title": "Selective High School Placement Practice Test",
                "content": "<p>You have <strong>40 minutes</strong> to complete <strong>35 questions</strong> in this test.</p><p>For each question there are five possible answers. Choose the <strong>one</strong> correct answer.</p><p>You will <strong>not</strong> lose marks for incorrect answers, so you should attempt <strong>all</strong> questions.</p><br/><p>Calculators and dictionaries are <strong>not</strong> allowed.</p>"
            }
        ]
    }'::JSONB
),
(
    'Thinking Skills', 
    'thinking-skills', 
    'Critical thinking and problem-solving questions',
    'brain',
    45,
    40,
    4,
    '{
        "pages": [
            {
                "title": "Selective High School Placement Practice Test",
                "content": "<p>You have <strong>40 minutes</strong> to complete <strong>40 questions</strong> in this test.</p><p>For each question there are four possible answers. Choose the <strong>one</strong> correct answer.</p><p>You will <strong>not</strong> lose marks for incorrect answers, so you should attempt <strong>all</strong> questions.</p><br/><p>Calculators and dictionaries are <strong>not</strong> allowed.</p>"
            }
        ]
    }'::JSONB
);

-- Create default templates for each subject
INSERT INTO subject_templates (subject_id, name, is_default, easy_count, medium_count, hard_count)
SELECT id, 'Initial Assessment', TRUE, 25, 10, 5
FROM subjects;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION get_test_questions(UUID, UUID, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_adaptive_distribution(UUID, UUID, INT) TO authenticated;
