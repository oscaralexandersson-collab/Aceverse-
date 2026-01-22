
-- 1. Ensure 'notifications' table is part of the 'supabase_realtime' publication
-- This logic prevents errors if it's already added.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END
$$;

-- 2. Set Replica Identity to FULL to ensure all columns are available in the payload
-- This is often safer for realtime subscriptions filtering on columns
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- 3. Verify RLS Policy for SELECT (Used by Realtime to filter)
-- Drop existing to be safe and recreate
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Grant explicit permissions (Idempotent)
GRANT SELECT ON notifications TO authenticated;
