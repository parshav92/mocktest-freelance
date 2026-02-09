-- ============================================
-- STORAGE POLICIES
-- Migration: 20260209000001
-- Description: RLS policies for storage buckets
-- ============================================

-- Note: Buckets must be created manually in Supabase Dashboard:
-- 1. questions (public)
-- 2. passages (public)
-- 3. uploads (private)

-- ============================================
-- QUESTIONS BUCKET (Public read, admin write)
-- ============================================

CREATE POLICY "Public can view question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'questions');

CREATE POLICY "Admins can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'questions' AND is_admin());

CREATE POLICY "Admins can update question images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'questions' AND is_admin());

CREATE POLICY "Admins can delete question images"
ON storage.objects FOR DELETE
USING (bucket_id = 'questions' AND is_admin());

-- ============================================
-- PASSAGES BUCKET (Public read, admin write)
-- ============================================

CREATE POLICY "Public can view passage images"
ON storage.objects FOR SELECT
USING (bucket_id = 'passages');

CREATE POLICY "Admins can upload passage images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'passages' AND is_admin());

CREATE POLICY "Admins can update passage images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'passages' AND is_admin());

CREATE POLICY "Admins can delete passage images"
ON storage.objects FOR DELETE
USING (bucket_id = 'passages' AND is_admin());

-- ============================================
-- UPLOADS BUCKET (Admin only)
-- ============================================

CREATE POLICY "Admins can view uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads' AND is_admin());

CREATE POLICY "Admins can create uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uploads' AND is_admin());

CREATE POLICY "Admins can update uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'uploads' AND is_admin());

CREATE POLICY "Admins can delete uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'uploads' AND is_admin());
