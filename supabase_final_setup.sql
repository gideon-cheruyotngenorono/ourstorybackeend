-- Supabase Storage and Security Final Configuration

-- 1. Secure Account Deletion Function
-- Allows authenticated users to delete their own auth.users record.
CREATE OR REPLACE FUNCTION delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    -- Note: Prisma will cascade delete 'public.User' if it's set to cascade with 'auth.users'
    -- Otherwise, handle 'public.User' deletion via Prisma and call this for 'auth.users'.
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;


-- 2. Storage Buckets configuration
-- Insert buckets (ignore if they already exist)
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage Row Level Security (RLS) Policies
-- Ensure RLS is enabled for storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Avatars: Public Read
DROP POLICY IF EXISTS "Public Access for Avatars" ON storage.objects;
CREATE POLICY "Public Access for Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Avatars: Authenticated Insert
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Avatars: Authenticated Update
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Chat Media: Public Read (can be scoped later if high security is needed)
DROP POLICY IF EXISTS "Public Access for Chat Media" ON storage.objects;
CREATE POLICY "Public Access for Chat Media"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat-media' );

-- Chat Media: Authenticated Insert
DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
CREATE POLICY "Users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'chat-media' );


-- 4. Enable Realtime Broadcasts on Message and Notification
-- Prisma table names are often quoted as "Message"
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
