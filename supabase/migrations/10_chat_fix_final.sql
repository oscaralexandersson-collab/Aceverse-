
-- 1. CRITICAL: Allow public profile reading so avatars/names show up
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING ( true );

-- 2. RESET & FIX TEAM MESSAGES RLS
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view messages" ON team_messages;
DROP POLICY IF EXISTS "Members can send messages" ON team_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON team_messages;

-- Policy: Members can view
CREATE POLICY "Members can view messages"
ON team_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = team_messages.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Members can send
CREATE POLICY "Members can send messages"
ON team_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id -- Identity check
  AND
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = team_messages.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- 3. FIX NOTIFICATIONS RLS (Often causes silent failures on mentions)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING ( auth.uid() = user_id );

CREATE POLICY "Anyone can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK ( true ); 

-- 4. SAFETY: Ensure Owner is in WorkspaceMembers
-- This fixes the "I created the workspace but can't chat" bug
INSERT INTO workspace_members (id, workspace_id, user_id, role)
SELECT gen_random_uuid(), w.id, w.owner_id, 'owner'
FROM workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
);

-- 5. Grant permissions to authenticated role
GRANT ALL ON team_messages TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT SELECT ON profiles TO authenticated;
