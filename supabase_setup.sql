-- Placement Tracker - Supabase bootstrap SQL
-- Run this once in Supabase SQL Editor for a new client project.
-- Safe to re-run (idempotent).

BEGIN;

-- 1) USERS
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT,
    -- Legacy compatibility (some fallback code still references this)
    password TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    resume_link TEXT,
    skills TEXT[] NOT NULL DEFAULT '{}',
    verified_skills TEXT[] NOT NULL DEFAULT '{}',
    batch_year INTEGER,
    department VARCHAR(120),
    cgpa NUMERIC(4,2),
    college_verified BOOLEAN NOT NULL DEFAULT FALSE,
    reset_token TEXT,
    reset_token_expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS password TEXT,
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'student',
    ADD COLUMN IF NOT EXISTS resume_link TEXT,
    ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS verified_skills TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS batch_year INTEGER,
    ADD COLUMN IF NOT EXISTS department VARCHAR(120),
    ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS college_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reset_token TEXT,
    ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.users
ALTER COLUMN role
SET DEFAULT 'student',
ALTER COLUMN college_verified
SET DEFAULT FALSE,
ALTER COLUMN created_at
SET DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_role_check'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'admin'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

CREATE INDEX IF NOT EXISTS idx_users_college_verified ON public.users (college_verified);

-- 2) INTERNSHIPS
CREATE TABLE IF NOT EXISTS public.internships (
    id BIGSERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    description TEXT,
    stipend VARCHAR(120),
    duration VARCHAR(120),
    mode VARCHAR(60),
    type VARCHAR(60) NOT NULL DEFAULT 'Internship',
    location VARCHAR(255),
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    deadline DATE,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.internships
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS role_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS stipend VARCHAR(120),
    ADD COLUMN IF NOT EXISTS duration VARCHAR(120),
    ADD COLUMN IF NOT EXISTS mode VARCHAR(60),
    ADD COLUMN IF NOT EXISTS type VARCHAR(60) DEFAULT 'Internship',
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS deadline DATE,
    ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.internships
ALTER COLUMN type
SET DEFAULT 'Internship',
ALTER COLUMN posted_at
SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_internships_posted_at ON public.internships (posted_at DESC);

CREATE INDEX IF NOT EXISTS idx_internships_deadline ON public.internships (deadline);

CREATE INDEX IF NOT EXISTS idx_internships_mode ON public.internships (mode);

CREATE INDEX IF NOT EXISTS idx_internships_type ON public.internships(type);

CREATE INDEX IF NOT EXISTS idx_internships_required_skills_gin ON public.internships USING GIN (required_skills);

-- 3) APPLICATIONS
CREATE TABLE IF NOT EXISTS public.applications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    internship_id BIGINT NOT NULL REFERENCES public.internships (id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'Applied',
    admin_reason TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, internship_id)
);

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS user_id BIGINT,
ADD COLUMN IF NOT EXISTS internship_id BIGINT,
ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Applied',
ADD COLUMN IF NOT EXISTS admin_reason TEXT,
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.applications
ALTER COLUMN status
SET DEFAULT 'Applied',
ALTER COLUMN applied_at
SET DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'applications_status_check'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_status_check
            CHECK (status IN ('Applied', 'Shortlisted', 'Offered', 'Rejected'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'applications_user_fk'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_user_fk
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'applications_internship_fk'
          AND conrelid = 'public.applications'::regclass
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_internship_fk
            FOREIGN KEY (internship_id) REFERENCES public.internships(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications (user_id);

CREATE INDEX IF NOT EXISTS idx_applications_internship_id ON public.applications (internship_id);

CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications (status);

CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON public.applications (applied_at DESC);

-- 4) QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    skill_name VARCHAR(120) NOT NULL,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS user_id BIGINT,
ADD COLUMN IF NOT EXISTS skill_name VARCHAR(120),
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.quiz_attempts
ALTER COLUMN passed
SET DEFAULT FALSE,
ALTER COLUMN created_at
SET DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'quiz_attempts_user_fk'
          AND conrelid = 'public.quiz_attempts'::regclass
    ) THEN
        ALTER TABLE public.quiz_attempts
            ADD CONSTRAINT quiz_attempts_user_fk
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts (user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON public.quiz_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_skill_name ON public.quiz_attempts (skill_name);

-- 5) LEGACY TABLE (not used by current unified API routes, but present in codebase)
CREATE TABLE IF NOT EXISTS public.companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    package NUMERIC(12, 2),
    location VARCHAR(255),
    deadline DATE,
    required_skills TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS role VARCHAR(255),
ADD COLUMN IF NOT EXISTS package NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS required_skills TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_companies_package ON public.companies(package DESC);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies(created_at DESC);

-- 6) SUPABASE STORAGE BUCKET FOR RESUMES
-- Required by profileController.js: supabase.storage.from('resumes')
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resumes', 'resumes', TRUE, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read policy for resume files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Public read access for resumes'
    ) THEN
        CREATE POLICY "Public read access for resumes"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'resumes');
    END IF;
END $$;

-- Authenticated uploads policy (optional; service role already bypasses RLS)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Authenticated uploads for resumes'
    ) THEN
        CREATE POLICY "Authenticated uploads for resumes"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'resumes');
    END IF;
END $$;

COMMIT;