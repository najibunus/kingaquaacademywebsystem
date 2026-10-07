-- 013_student_profiles.sql
-- Add avatar_url to students and set up storage for avatars

-- 1. Add avatar_url to students
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create the 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies for 'avatars' bucket
-- Allow anyone to read avatars
CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars."
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update their avatars
CREATE POLICY "Authenticated users can update avatars."
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete their avatars
CREATE POLICY "Authenticated users can delete avatars."
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );
