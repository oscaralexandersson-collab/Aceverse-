
-- 1. REPOINT TEAM_MESSAGES TO PUBLIC.PROFILES
ALTER TABLE team_messages
DROP CONSTRAINT IF EXISTS team_messages_user_id_fkey;

ALTER TABLE team_messages
ADD CONSTRAINT team_messages_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 2. REPOINT CHANNELS TO PUBLIC.PROFILES
ALTER TABLE channels
DROP CONSTRAINT IF EXISTS channels_created_by_fkey;

ALTER TABLE channels
ADD CONSTRAINT channels_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 3. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload config';
