-- 012_tournaments.sql
-- Create tournaments and tournament_results tables for the Kejohanan feature

-- 1. Create Tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. Create Tournament Results Table
CREATE TABLE IF NOT EXISTS public.tournament_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    stroke TEXT NOT NULL, -- FR, BR, FL, BK, IM
    distance INTEGER NOT NULL, -- 20, 50, 100, 200, 400, 800
    time_record TEXT NOT NULL, -- e.g., "01:23.45"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_tournament_results_student_id ON public.tournament_results(student_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON public.tournament_results(tournament_id);

-- Optional: Enable RLS (we bypass it on server but good practice)
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users on tournaments" 
    ON public.tournaments FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow read access for authenticated users on tournament_results" 
    ON public.tournament_results FOR SELECT 
    TO authenticated 
    USING (true);

-- In a real app we'd restrict write to staff/coach roles, but server-side admin client bypasses RLS anyway.
