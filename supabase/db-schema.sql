-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_mfa_sessions (
  admin_id uuid NOT NULL,
  mfa_verified_at timestamp with time zone NOT NULL,
  mfa_expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_mfa_sessions_pkey PRIMARY KEY (admin_id),
  CONSTRAINT admin_mfa_sessions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id)
);
CREATE TABLE public.custom_test_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  custom_test_id uuid NOT NULL,
  question_id uuid NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT custom_test_questions_pkey PRIMARY KEY (id),
  CONSTRAINT custom_test_questions_custom_test_id_fkey FOREIGN KEY (custom_test_id) REFERENCES public.custom_tests(id),
  CONSTRAINT custom_test_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.custom_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  visibility USER-DEFINED NOT NULL DEFAULT 'admin_only'::custom_test_visibility,
  duration_mins integer NOT NULL DEFAULT 45,
  instructions jsonb,
  is_active boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  available_from timestamp with time zone,
  available_until timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_tests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.essay_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  question_id uuid NOT NULL,
  student_id uuid NOT NULL,
  essay_prompt text NOT NULL,
  student_answer text NOT NULL,
  rubric jsonb NOT NULL,
  word_limit integer,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::essay_eval_status,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  score integer,
  max_score integer,
  rubric_scores jsonb,
  feedback text,
  llm_model text,
  llm_response_raw jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  started_processing_at timestamp with time zone,
  completed_at timestamp with time zone,
  CONSTRAINT essay_evaluations_pkey PRIMARY KEY (id),
  CONSTRAINT essay_evaluations_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id),
  CONSTRAINT essay_evaluations_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id),
  CONSTRAINT essay_evaluations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.passages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  code character varying NOT NULL UNIQUE,
  passage_type character varying NOT NULL,
  title character varying,
  content text NOT NULL,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT passages_pkey PRIMARY KEY (id),
  CONSTRAINT passages_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'parent'::user_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.question_code_counters (
  subject_id uuid NOT NULL,
  question_type text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT question_code_counters_pkey PRIMARY KEY (subject_id, question_type),
  CONSTRAINT question_code_counters_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.question_upload_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL,
  subject_id uuid NOT NULL,
  filename character varying NOT NULL,
  total_questions integer NOT NULL,
  successful integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  errors jsonb,
  status character varying NOT NULL DEFAULT 'processing'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT question_upload_batches_pkey PRIMARY KEY (id),
  CONSTRAINT question_upload_batches_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id),
  CONSTRAINT question_upload_batches_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  code character varying NOT NULL UNIQUE,
  question_type USER-DEFINED NOT NULL,
  difficulty USER-DEFINED NOT NULL,
  content jsonb NOT NULL,
  correct_answer jsonb NOT NULL,
  solution_text text,
  marks integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  times_shown integer NOT NULL DEFAULT 0,
  times_correct integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  passage_ids jsonb DEFAULT '[]'::jsonb,
  solution_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  topic text,
  subtopic text,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.student_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id_input character varying NOT NULL,
  ip_address inet,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  CONSTRAINT student_login_attempts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.student_question_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  question_id uuid NOT NULL,
  test_id uuid NOT NULL,
  was_correct boolean NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  last_shown_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_question_history_pkey PRIMARY KEY (id),
  CONSTRAINT student_question_history_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_question_history_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id),
  CONSTRAINT student_question_history_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id)
);
CREATE TABLE public.student_subject_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  tests_taken integer NOT NULL DEFAULT 0,
  total_questions_attempted integer NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  easy_attempted integer NOT NULL DEFAULT 0,
  easy_correct integer NOT NULL DEFAULT 0,
  medium_attempted integer NOT NULL DEFAULT 0,
  medium_correct integer NOT NULL DEFAULT 0,
  hard_attempted integer NOT NULL DEFAULT 0,
  hard_correct integer NOT NULL DEFAULT 0,
  overall_accuracy numeric,
  current_level USER-DEFINED DEFAULT 'easy'::difficulty_level,
  last_test_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_subject_stats_pkey PRIMARY KEY (id),
  CONSTRAINT student_subject_stats_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_subject_stats_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id character varying NOT NULL UNIQUE CHECK (student_id::text ~ '^STU[A-Z0-9]{5}$'::text),
  password_hash text NOT NULL,
  full_name text NOT NULL,
  parent_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  plan_key text,
  plan_expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.subject_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  name character varying NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  easy_count integer NOT NULL DEFAULT 25,
  medium_count integer NOT NULL DEFAULT 10,
  hard_count integer NOT NULL DEFAULT 5,
  passing_score integer,
  type_quotas jsonb DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subject_templates_pkey PRIMARY KEY (id),
  CONSTRAINT subject_templates_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  icon character varying,
  duration_mins integer NOT NULL,
  total_questions integer NOT NULL DEFAULT 40,
  instructions jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  code_prefix character varying UNIQUE,
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid UNIQUE,
  parent_id uuid NOT NULL,
  plan text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'active'::subscription_status,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  grace_period_ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT subscriptions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.plans (
  key text NOT NULL,
  name text NOT NULL,
  max_full_mocks integer,
  analytics_level text NOT NULL DEFAULT 'basic'::text,
  peer_compare boolean NOT NULL DEFAULT false,
  tips boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT plans_pkey PRIMARY KEY (key)
);
CREATE TABLE public.tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  template_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'not_started'::test_status,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  duration_mins integer NOT NULL,
  time_spent_secs integer,
  questions_order ARRAY NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_marks integer,
  marks_obtained integer,
  percentage numeric,
  score_breakdown jsonb,
  essay_evaluation jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tests_pkey PRIMARY KEY (id),
  CONSTRAINT tests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT tests_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
  CONSTRAINT tests_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.subject_templates(id)
);