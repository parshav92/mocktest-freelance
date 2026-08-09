-- One-time payments: plan_key on students, checkout session id,
-- convert subscriptions.plan from enum to text, backfill grace dates.

-- 1. Students: denormalized plan fields
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS plan_key text,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- 2. Subscriptions: checkout session id (idempotency for one-time Checkout)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_checkout_session_id_key
  ON public.subscriptions (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- stripe_subscription_id stays nullable for legacy/support; unused for one-time

-- 3. Convert subscriptions.plan from enum → text (stable plan_key)
ALTER TABLE public.subscriptions
  ALTER COLUMN plan TYPE text USING plan::text;

DROP TYPE IF EXISTS public.subscription_plan;

-- 4. Backfill student plan from linked subscription
UPDATE public.students s
SET
  plan_key = sub.plan,
  plan_expires_at = sub.expires_at
FROM public.subscriptions sub
WHERE sub.student_id = s.id
  AND (s.plan_key IS DISTINCT FROM sub.plan OR s.plan_expires_at IS DISTINCT FROM sub.expires_at);

-- 5. Backfill grace_period_ends_at (1 month after expires_at) where missing
UPDATE public.subscriptions
SET grace_period_ends_at = expires_at + interval '1 month'
WHERE grace_period_ends_at IS NULL
  AND expires_at IS NOT NULL;
