-- ============================================================================
-- Supabase Schema for LJCCA Practical Lab Manual Portal
-- Tables: semesters, subjects, units, questions
-- Includes full Row Level Security (RLS) policies for anon key access.
-- ============================================================================

-- 1. Semesters Table
CREATE TABLE IF NOT EXISTS public.semesters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  "desc" TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  semester_id TEXT REFERENCES public.semesters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT DEFAULT '',
  icon TEXT DEFAULT '💻',
  "desc" TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Units Table
CREATE TABLE IF NOT EXISTS public.units (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
  semester_id TEXT REFERENCES public.semesters(id) ON DELETE CASCADE,
  num TEXT NOT NULL,
  title TEXT NOT NULL,
  sub TEXT DEFAULT '',
  question_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  unit_id TEXT REFERENCES public.units(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
  semester_id TEXT REFERENCES public.semesters(id) ON DELETE CASCADE,
  unit_num TEXT DEFAULT '',
  unit_title TEXT DEFAULT '',
  practical_number INTEGER DEFAULT 1,
  tag TEXT DEFAULT 'Q1',
  title TEXT NOT NULL,
  question TEXT DEFAULT '',
  category TEXT DEFAULT '',
  logic TEXT DEFAULT '',
  code TEXT DEFAULT '',
  code_html TEXT DEFAULT '',
  output_label TEXT DEFAULT 'Output',
  output_class TEXT DEFAULT '',
  output TEXT DEFAULT '',
  chart_src TEXT DEFAULT '',
  chart_alt TEXT DEFAULT '',
  data_search TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON public.subjects(semester_id);
CREATE INDEX IF NOT EXISTS idx_units_subject ON public.units(subject_id);
CREATE INDEX IF NOT EXISTS idx_units_semester ON public.units(semester_id);
CREATE INDEX IF NOT EXISTS idx_questions_unit ON public.questions(unit_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_semester ON public.questions(semester_id);
CREATE INDEX IF NOT EXISTS idx_questions_practical_no ON public.questions(practical_number);

-- Enable Row Level Security (RLS)
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Allow anon public read/write access
DROP POLICY IF EXISTS "Allow anon all on semesters" ON public.semesters;
CREATE POLICY "Allow anon all on semesters" ON public.semesters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on subjects" ON public.subjects;
CREATE POLICY "Allow anon all on subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on units" ON public.units;
CREATE POLICY "Allow anon all on units" ON public.units FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on questions" ON public.questions;
CREATE POLICY "Allow anon all on questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);
