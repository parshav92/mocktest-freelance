-- ============================================
-- ADMIN MFA SESSIONS
-- ============================================

CREATE TABLE admin_mfa_sessions (
    admin_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    mfa_verified_at TIMESTAMPTZ NOT NULL,
    mfa_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admin_mfa_expires_after_verified CHECK (mfa_expires_at > mfa_verified_at)
);

CREATE INDEX idx_admin_mfa_sessions_expires_at ON admin_mfa_sessions(mfa_expires_at);

ALTER TABLE admin_mfa_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own MFA session
CREATE POLICY "Admins can manage own MFA session"
    ON admin_mfa_sessions
    FOR ALL
    USING (auth.uid() = admin_id AND is_admin())
    WITH CHECK (auth.uid() = admin_id AND is_admin());

-- Reuse the shared updated_at trigger
CREATE TRIGGER update_admin_mfa_sessions_updated_at
    BEFORE UPDATE ON admin_mfa_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
