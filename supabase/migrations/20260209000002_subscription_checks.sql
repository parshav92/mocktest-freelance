-- ============================================
-- SUBSCRIPTION CHECKS FOR TEST PLATFORM
-- Migration: 20260209000002
-- Description: Enforce subscription validation for test operations
-- ============================================

-- ============================================
-- FUNCTION: Check if student has active subscription (can start NEW tests)
-- ============================================

CREATE OR REPLACE FUNCTION can_student_take_test(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription_status subscription_status;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get the student's subscription status
    SELECT s.status, s.expires_at
    INTO v_subscription_status, v_expires_at
    FROM subscriptions s
    WHERE s.student_id = p_student_id
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- No subscription found
    IF v_subscription_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if subscription is active and not expired
    IF v_subscription_status = 'active' AND v_expires_at > NOW() THEN
        RETURN TRUE;
    END IF;
    
    -- All other cases (grace_period, expired) cannot start new tests
    RETURN FALSE;
END;
$$;

-- ============================================
-- FUNCTION: Check if student can access a specific test
-- Returns: can_access, is_read_only, reason
-- ============================================

CREATE OR REPLACE FUNCTION can_student_access_test(p_student_id UUID, p_test_id UUID)
RETURNS TABLE (
    can_access BOOLEAN,
    is_read_only BOOLEAN,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription_status subscription_status;
    v_expires_at TIMESTAMPTZ;
    v_grace_period_ends_at TIMESTAMPTZ;
    v_test_status test_status;
    v_test_student_id UUID;
BEGIN
    -- Get test info
    SELECT t.status, t.student_id 
    INTO v_test_status, v_test_student_id
    FROM tests t
    WHERE t.id = p_test_id;
    
    -- Test doesn't exist
    IF v_test_student_id IS NULL THEN
        RETURN QUERY SELECT FALSE, FALSE, 'Test not found'::TEXT;
        RETURN;
    END IF;
    
    -- Test doesn't belong to this student
    IF v_test_student_id != p_student_id THEN
        RETURN QUERY SELECT FALSE, FALSE, 'Test does not belong to this student'::TEXT;
        RETURN;
    END IF;
    
    -- Get subscription status
    SELECT s.status, s.expires_at, s.grace_period_ends_at
    INTO v_subscription_status, v_expires_at, v_grace_period_ends_at
    FROM subscriptions s
    WHERE s.student_id = p_student_id
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- No subscription
    IF v_subscription_status IS NULL THEN
        RETURN QUERY SELECT FALSE, FALSE, 'No subscription found'::TEXT;
        RETURN;
    END IF;
    
    -- Active subscription (not expired)
    IF v_subscription_status = 'active' AND v_expires_at > NOW() THEN
        RETURN QUERY SELECT TRUE, FALSE, 'Active subscription'::TEXT;
        RETURN;
    END IF;
    
    -- Grace period (subscription expired but within grace period)
    IF v_subscription_status = 'grace_period' OR 
       (v_expires_at <= NOW() AND v_grace_period_ends_at IS NOT NULL AND v_grace_period_ends_at > NOW()) THEN
        -- In grace period, can view completed tests (read-only)
        IF v_test_status IN ('submitted', 'ended_early', 'abandoned') THEN
            RETURN QUERY SELECT TRUE, TRUE, 'Grace period - view only'::TEXT;
            RETURN;
        -- Can continue an in-progress test (but not start new)
        ELSIF v_test_status = 'in_progress' THEN
            RETURN QUERY SELECT TRUE, FALSE, 'Grace period - can finish started test'::TEXT;
            RETURN;
        -- Cannot start a not_started test in grace period
        ELSIF v_test_status = 'not_started' THEN
            RETURN QUERY SELECT FALSE, FALSE, 'Grace period - cannot start new tests'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Expired (past grace period)
    RETURN QUERY SELECT FALSE, FALSE, 'Subscription expired'::TEXT;
END;
$$;

-- ============================================
-- FUNCTION: Get student's current subscription status for UI
-- ============================================

CREATE OR REPLACE FUNCTION get_student_test_access_status(p_student_id UUID)
RETURNS TABLE (
    can_take_new_tests BOOLEAN,
    is_in_grace_period BOOLEAN,
    subscription_status subscription_status,
    expires_at TIMESTAMPTZ,
    grace_period_ends_at TIMESTAMPTZ,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription RECORD;
BEGIN
    -- Get subscription
    SELECT s.status, s.expires_at, s.grace_period_ends_at
    INTO v_subscription
    FROM subscriptions s
    WHERE s.student_id = p_student_id
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- No subscription
    IF v_subscription IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, 
            FALSE, 
            NULL::subscription_status, 
            NULL::TIMESTAMPTZ, 
            NULL::TIMESTAMPTZ,
            'No active subscription. Please contact your parent.'::TEXT;
        RETURN;
    END IF;
    
    -- Active
    IF v_subscription.status = 'active' AND v_subscription.expires_at > NOW() THEN
        RETURN QUERY SELECT 
            TRUE, 
            FALSE, 
            v_subscription.status, 
            v_subscription.expires_at, 
            v_subscription.grace_period_ends_at,
            'Subscription active'::TEXT;
        RETURN;
    END IF;
    
    -- Grace period
    IF v_subscription.status = 'grace_period' OR 
       (v_subscription.expires_at <= NOW() AND v_subscription.grace_period_ends_at > NOW()) THEN
        RETURN QUERY SELECT 
            FALSE, 
            TRUE, 
            'grace_period'::subscription_status, 
            v_subscription.expires_at, 
            v_subscription.grace_period_ends_at,
            'Subscription expired. You can view past tests but cannot start new ones. Please renew your subscription.'::TEXT;
        RETURN;
    END IF;
    
    -- Expired
    RETURN QUERY SELECT 
        FALSE, 
        FALSE, 
        'expired'::subscription_status, 
        v_subscription.expires_at, 
        v_subscription.grace_period_ends_at,
        'Subscription expired. Please contact your parent to renew.'::TEXT;
END;
$$;

-- ============================================
-- TRIGGER: Prevent test creation without active subscription
-- ============================================

CREATE OR REPLACE FUNCTION check_subscription_before_test_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT can_student_take_test(NEW.student_id) THEN
        RAISE EXCEPTION 'Cannot create test: Student does not have an active subscription'
            USING ERRCODE = 'P0001',
                  HINT = 'Subscription must be active (not expired or in grace period) to start new tests';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_subscription_on_test_create
    BEFORE INSERT ON tests
    FOR EACH ROW
    EXECUTE FUNCTION check_subscription_before_test_insert();

-- ============================================
-- TRIGGER: Prevent starting not_started test in grace period
-- ============================================

CREATE OR REPLACE FUNCTION check_subscription_before_test_start()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_access RECORD;
BEGIN
    -- Only check when transitioning from not_started to in_progress
    IF OLD.status = 'not_started' AND NEW.status = 'in_progress' THEN
        SELECT * INTO v_access FROM can_student_access_test(NEW.student_id, NEW.id);
        
        IF NOT v_access.can_access THEN
            RAISE EXCEPTION 'Cannot start test: %', v_access.reason
                USING ERRCODE = 'P0001';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_subscription_on_test_start
    BEFORE UPDATE ON tests
    FOR EACH ROW
    WHEN (OLD.status = 'not_started' AND NEW.status = 'in_progress')
    EXECUTE FUNCTION check_subscription_before_test_start();

-- ============================================
-- UPDATE RLS POLICIES: Use subscription functions
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Students can insert own tests" ON tests;
DROP POLICY IF EXISTS "Students can update own tests" ON tests;
DROP POLICY IF EXISTS "Students can view own tests" ON tests;

-- Recreate with proper checks
-- Note: Since students use custom JWT (not Supabase Auth), RLS alone can't verify student identity
-- We rely on SECURITY DEFINER functions and API layer for student auth
-- These policies are primarily for parent access via Supabase Auth

CREATE POLICY "Students can view own tests via API"
    ON tests FOR SELECT
    USING (TRUE);  -- Actual auth check done in API via student JWT

CREATE POLICY "Students can insert tests with active subscription"
    ON tests FOR INSERT
    WITH CHECK (TRUE);  -- Trigger enforces subscription check

CREATE POLICY "Students can update own tests via API"
    ON tests FOR UPDATE
    USING (TRUE);  -- Actual auth check done in API via student JWT

-- Parents can view their children's tests (via Supabase Auth)
DROP POLICY IF EXISTS "Parents can view children tests" ON tests;
CREATE POLICY "Parents can view children tests"
    ON tests FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM students WHERE parent_id = auth.uid()
        )
    );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION can_student_take_test(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION can_student_access_test(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_student_test_access_status(UUID) TO authenticated, anon;
