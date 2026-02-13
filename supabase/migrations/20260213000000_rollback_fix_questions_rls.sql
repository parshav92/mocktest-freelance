-- ============================================
-- ROLLBACK: Remove secure question access functions
-- ============================================

-- Revoke execute permissions (optional but clean)
REVOKE EXECUTE ON FUNCTION get_questions_for_student(UUID, UUID[], BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION calculate_total_marks(UUID[]) FROM authenticated;

-- Drop functions
DROP FUNCTION IF EXISTS get_questions_for_student(UUID, UUID[], BOOLEAN);
DROP FUNCTION IF EXISTS calculate_total_marks(UUID[]);

-- Drop enum type (ONLY if not used elsewhere)
DROP TYPE IF EXISTS passage_type;