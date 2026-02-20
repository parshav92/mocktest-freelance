-- ============================================
-- ESSAY EVALUATIONS QUEUE TABLE
-- ============================================
-- Used as a database-backed queue for LLM-based essay evaluation.
-- When a student submits a test containing essay questions,
-- a row is inserted here with status 'pending'.
-- A cron/API processor picks up pending rows, calls the LLM,
-- and writes back the evaluation result.

CREATE TYPE essay_eval_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE essay_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Input for the LLM
    essay_prompt TEXT NOT NULL,
    student_answer TEXT NOT NULL,
    rubric JSONB NOT NULL,         -- e.g. {"content": 10, "structure": 5, "grammar": 5}
    word_limit INT,
    
    -- Queue status
    status essay_eval_status NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error TEXT,
    
    -- LLM output
    score INT,                      -- total score awarded
    max_score INT,                  -- sum of rubric values
    rubric_scores JSONB,            -- e.g. {"content": 8, "structure": 4, "grammar": 3}
    feedback TEXT,                  -- LLM-generated feedback
    llm_model TEXT,                 -- which model was used
    llm_response_raw JSONB,         -- raw LLM response for debugging
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_processing_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Index for queue polling: find pending evaluations efficiently
CREATE INDEX idx_essay_evaluations_pending 
    ON essay_evaluations (status, created_at) 
    WHERE status IN ('pending', 'processing');

-- Index for looking up evaluations by test
CREATE INDEX idx_essay_evaluations_test 
    ON essay_evaluations (test_id);

-- Index for looking up evaluations by student
CREATE INDEX idx_essay_evaluations_student 
    ON essay_evaluations (student_id);

-- Unique constraint: one evaluation per test+question combo
CREATE UNIQUE INDEX idx_essay_evaluations_unique 
    ON essay_evaluations (test_id, question_id);

-- Auto-update updated_at
CREATE TRIGGER update_essay_evaluations_updated_at
    BEFORE UPDATE ON essay_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
