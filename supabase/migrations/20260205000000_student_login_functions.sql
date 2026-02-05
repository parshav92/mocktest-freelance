-- ============================================
-- SECURITY DEFINER functions for student login
-- These bypass RLS to allow login operations
-- ============================================

-- Function to get student for login (bypasses RLS)
CREATE OR REPLACE FUNCTION get_student_for_login(p_student_id TEXT)
RETURNS TABLE (
  id UUID,
  student_id TEXT,
  password_hash TEXT,
  full_name TEXT,
  parent_id UUID,
  is_active BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.student_id,
    s.password_hash,
    s.full_name,
    s.parent_id,
    s.is_active
  FROM students s
  WHERE s.student_id = p_student_id;
END;
$$;

-- Function to record login attempts (bypasses RLS)
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_student_id_input TEXT,
  p_ip_address TEXT,
  p_success BOOLEAN
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO student_login_attempts (student_id_input, ip_address, success)
  VALUES (p_student_id_input, p_ip_address, p_success);
END;
$$;

-- Update is_student_rate_limited to also be SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_student_rate_limited(
  p_student_id TEXT,
  p_ip TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  attempt_count INT;
BEGIN
  SELECT COUNT(*)
  INTO attempt_count
  FROM student_login_attempts
  WHERE (student_id_input = p_student_id OR ip_address = p_ip)
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';
  
  RETURN attempt_count >= 5;
END;
$$;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_student_for_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_login_attempt(TEXT, TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_student_rate_limited(TEXT, TEXT) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_student_for_login IS 'SECURITY DEFINER function to fetch student data for login, bypassing RLS';
COMMENT ON FUNCTION record_login_attempt IS 'SECURITY DEFINER function to record login attempts, bypassing RLS';
COMMENT ON FUNCTION is_student_rate_limited IS 'SECURITY DEFINER function to check rate limiting, bypassing RLS';
