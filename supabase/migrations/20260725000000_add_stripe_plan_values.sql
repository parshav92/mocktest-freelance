-- Migration: Add silver, gold, platinum values to subscription_plan enum
-- and add stripe_subscription_id / stripe_customer_id columns if missing.
--
-- Run this in the Supabase SQL editor or via CLI.
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
--       older Postgres versions, so we use individual statements.

ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'silver';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'gold';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'platinum';
