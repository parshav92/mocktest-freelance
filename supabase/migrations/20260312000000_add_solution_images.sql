-- Add solution_images column to questions table
-- Stores an array of public image URLs for solution explanations
ALTER TABLE public.questions
  ADD COLUMN solution_images jsonb NOT NULL DEFAULT '[]'::jsonb;