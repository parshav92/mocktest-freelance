-- ============================================
-- ENUM TYPES
-- ============================================

-- Role type for Supabase Auth users (parent/admin only)
CREATE TYPE user_role AS ENUM ('parent', 'admin');

-- Subscription plan type
CREATE TYPE subscription_plan AS ENUM ('half_yearly', 'yearly');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'grace_period');

-- ============================================
-- TABLES
-- ============================================

-- 1. PROFILES (for Supabase Auth users: parents and admins)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'parent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. STUDENTS (custom auth - NOT in Supabase Auth)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(8) UNIQUE NOT NULL, -- e.g., STUA7K2X
    password_hash TEXT NOT NULL, -- bcrypt hashed 6-digit password
    full_name TEXT NOT NULL,
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure student_id follows format
    CONSTRAINT valid_student_id CHECK (student_id ~ '^STU[A-Z0-9]{5}$')
);

-- 3. SUBSCRIPTIONS (one per student)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    grace_period_ends_at TIMESTAMPTZ, -- 1 month after expiry
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. STUDENT LOGIN ATTEMPTS (rate limiting)
CREATE TABLE student_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_input VARCHAR(8) NOT NULL, -- the attempted student_id
    ip_address INET,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_students_parent_id ON students(parent_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_subscriptions_student_id ON subscriptions(student_id);
CREATE INDEX idx_subscriptions_parent_id ON subscriptions(parent_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);
CREATE INDEX idx_login_attempts_student_id ON student_login_attempts(student_id_input);
CREATE INDEX idx_login_attempts_ip ON student_login_attempts(ip_address);
CREATE INDEX idx_login_attempts_time ON student_login_attempts(attempted_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate unique student ID (STU + 5 alphanumeric)
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS VARCHAR(8) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluded I,O,0,1 to avoid confusion
    result VARCHAR(8) := 'STU';
    i INTEGER;
BEGIN
    FOR i IN 1..5 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Check if student is rate limited (5 failed attempts in last 15 minutes)
CREATE OR REPLACE FUNCTION is_student_rate_limited(p_student_id VARCHAR(8), p_ip INET)
RETURNS BOOLEAN AS $$
DECLARE
    failed_attempts INTEGER;
BEGIN
    SELECT COUNT(*) INTO failed_attempts
    FROM student_login_attempts
    WHERE (student_id_input = p_student_id OR ip_address = p_ip)
      AND success = FALSE
      AND attempted_at > NOW() - INTERVAL '15 minutes';
    
    RETURN failed_attempts >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get subscription status for a student (handles grace period logic)
CREATE OR REPLACE FUNCTION get_student_subscription_status(p_student_id UUID)
RETURNS TABLE (
    status subscription_status,
    is_read_only BOOLEAN,
    expires_at TIMESTAMPTZ,
    grace_period_ends_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN s.expires_at > NOW() THEN 'active'::subscription_status
            WHEN s.grace_period_ends_at > NOW() THEN 'grace_period'::subscription_status
            ELSE 'expired'::subscription_status
        END AS status,
        CASE 
            WHEN s.expires_at > NOW() THEN FALSE
            ELSE TRUE
        END AS is_read_only,
        s.expires_at,
        s.grace_period_ends_at
    FROM subscriptions s
    WHERE s.student_id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old login attempts (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM student_login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update subscription statuses (run via cron)
CREATE OR REPLACE FUNCTION update_subscription_statuses()
RETURNS void AS $$
BEGIN
    -- Set grace_period_ends_at when subscription expires
    UPDATE subscriptions
    SET 
        status = 'grace_period',
        grace_period_ends_at = expires_at + INTERVAL '1 month',
        updated_at = NOW()
    WHERE status = 'active' 
      AND expires_at < NOW();
    
    -- Set expired when grace period ends
    UPDATE subscriptions
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE status = 'grace_period' 
      AND grace_period_ends_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile when user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'parent')
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_login_attempts ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- STUDENTS policies (parents can only see their own students)
CREATE POLICY "Parents can view own students"
    ON students FOR SELECT
    USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert own students"
    ON students FOR INSERT
    WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update own students"
    ON students FOR UPDATE
    USING (parent_id = auth.uid());

CREATE POLICY "Admins can view all students"
    ON students FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- SUBSCRIPTIONS policies
CREATE POLICY "Parents can view own subscriptions"
    ON subscriptions FOR SELECT
    USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage all subscriptions"
    ON subscriptions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- LOGIN_ATTEMPTS policies (only accessible via service role / functions)
CREATE POLICY "No direct access to login attempts"
    ON student_login_attempts FOR ALL
    USING (FALSE);

-- ============================================
-- GRANTS FOR SERVICE ROLE FUNCTIONS
-- ============================================

-- Login attempts table needs service_role access for custom auth
GRANT ALL ON student_login_attempts TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;