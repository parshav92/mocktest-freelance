-- Allow authenticated users (incl. admin session client) to read marking criteria.
-- Without a policy, RLS-enabled tables return zero rows to the anon/authenticated roles.

ALTER TABLE writing_marking_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read writing marking criteria"
    ON writing_marking_criteria;
DROP POLICY IF EXISTS "Admins can manage writing marking criteria"
    ON writing_marking_criteria;

CREATE POLICY "Anyone authenticated can read writing marking criteria"
    ON writing_marking_criteria
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage writing marking criteria"
    ON writing_marking_criteria
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );
