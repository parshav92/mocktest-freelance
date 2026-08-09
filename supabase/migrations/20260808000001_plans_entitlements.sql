-- Plan entitlement rules (admin-editable).
-- duration_months and stripe price IDs stay in app env/code — not in this table.

CREATE TABLE IF NOT EXISTS public.plans (
  key text PRIMARY KEY,
  name text NOT NULL,
  max_full_mocks integer NULL, -- NULL = unlimited
  analytics_level text NOT NULL DEFAULT 'basic'
    CHECK (analytics_level IN ('none', 'basic', 'full')),
  peer_compare boolean NOT NULL DEFAULT false,
  tips boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_max_full_mocks_non_negative
    CHECK (max_full_mocks IS NULL OR max_full_mocks >= 0)
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read plans" ON public.plans;
CREATE POLICY "Anyone can read plans"
  ON public.plans FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update plans" ON public.plans;
CREATE POLICY "Admins can update plans"
  ON public.plans FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can insert plans" ON public.plans;
CREATE POLICY "Admins can insert plans"
  ON public.plans FOR INSERT
  WITH CHECK (is_admin());

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT INSERT, UPDATE ON public.plans TO authenticated;

INSERT INTO public.plans (
  key, name, max_full_mocks, analytics_level, peer_compare, tips, display_order
) VALUES
  ('silver',   'Silver',   5,    'basic', false, false, 1),
  ('gold',     'Gold',     NULL, 'full',  false, false, 2),
  ('platinum', 'Platinum', NULL, 'full',  true,  true,  3)
ON CONFLICT (key) DO NOTHING;
