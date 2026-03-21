-- Migration: Add question code counter table for auto-generating sequential question codes
-- This avoids having to query all existing questions to find the next serial number.
-- Each (subject_id, question_type) pair has its own counter.
-- Starts at offset 1000 to avoid collision with existing manually-assigned codes.

CREATE TABLE public.question_code_counters (
  subject_id    uuid NOT NULL REFERENCES public.subjects(id),
  question_type text NOT NULL,  -- Code abbreviation: MCQ, POEM_MCQ, FIB, FMS, ESSAY, P
  last_number   integer NOT NULL DEFAULT 0,
  updated_at    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT question_code_counters_pkey PRIMARY KEY (subject_id, question_type)
);

-- Enable RLS (admin-only access via service role)
ALTER TABLE public.question_code_counters ENABLE ROW LEVEL SECURITY;

-- Atomic function: reserves `batch_size` serial numbers and returns the start_at value.
-- Uses INSERT ON CONFLICT for atomicity — no two concurrent calls can get duplicate ranges.
-- First call for a new (subject, type) combo starts numbering at 1000.
CREATE OR REPLACE FUNCTION reserve_question_codes(
  p_subject_id    uuid,
  p_question_type text,
  p_batch_size    integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start integer;
BEGIN
  INSERT INTO public.question_code_counters (subject_id, question_type, last_number, updated_at)
  VALUES (p_subject_id, p_question_type, 999 + p_batch_size, now())
  ON CONFLICT (subject_id, question_type) DO UPDATE
    SET last_number = question_code_counters.last_number + p_batch_size,
        updated_at = now()
  RETURNING last_number - p_batch_size + 1 INTO v_start;
  RETURN v_start;
END;
$$;
