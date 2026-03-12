-- ============================================
-- CUSTOM TESTS (admin-created tests)
-- ============================================
-- Allows admin to hand-pick questions into reusable
-- test definitions with visibility controls.
-- ============================================

-- Visibility enum
CREATE TYPE custom_test_visibility AS ENUM (
    'admin_only',        -- Only admin can preview
    'subscribers_only',  -- Only students with active subscription
    'free_trial'         -- Any authenticated user, no subscription needed
);

-- Custom test definitions
CREATE TABLE custom_tests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    visibility      custom_test_visibility NOT NULL DEFAULT 'admin_only',
    duration_mins   INT NOT NULL DEFAULT 45,
    instructions    JSONB,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    display_order   INT NOT NULL DEFAULT 0,
    available_from  TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    created_by      UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Question assignments (hand-picked, ordered)
CREATE TABLE custom_test_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    custom_test_id  UUID NOT NULL REFERENCES custom_tests(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    sort_order      INT NOT NULL DEFAULT 0,
    UNIQUE(custom_test_id, question_id)
);

CREATE INDEX idx_ctq_test ON custom_test_questions(custom_test_id);
CREATE INDEX idx_custom_tests_slug ON custom_tests(slug);
CREATE INDEX idx_custom_tests_visibility ON custom_tests(visibility);

-- RLS
ALTER TABLE custom_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_test_questions ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "admin_manage_custom_tests"
    ON custom_tests FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "admin_manage_custom_test_questions"
    ON custom_test_questions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Authenticated users can read active custom tests based on visibility
CREATE POLICY "authenticated_read_custom_tests"
    ON custom_tests FOR SELECT
    USING (
        is_active = TRUE
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "authenticated_read_custom_test_questions"
    ON custom_test_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM custom_tests
            WHERE custom_tests.id = custom_test_questions.custom_test_id
            AND custom_tests.is_active = TRUE
            AND auth.uid() IS NOT NULL
        )
    );

-- Updated_at trigger
CREATE TRIGGER set_custom_tests_updated_at
    BEFORE UPDATE ON custom_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
