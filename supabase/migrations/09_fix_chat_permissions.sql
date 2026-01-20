
-- 1. CRITICAL FIX: Ensure Workspace Owners are actually in the 'workspace_members' table
-- If this link is missing, RLS policies will block all reads/writes.
INSERT INTO workspace_members (id, workspace_id, user_id, role)
SELECT 
    gen_random_uuid(),
    w.id, 
    w.owner_id, 
    'owner'
FROM workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
);

-- 2. Ensure team_messages has correct structure
DO $$ 
BEGIN 
    -- Ensure channel_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_messages' AND column_name = 'channel_id') THEN
        ALTER TABLE team_messages ADD COLUMN channel_id UUID REFERENCES channels(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. RESET RLS POLICIES (Nuke and Pave approach to be safe)
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view messages" ON team_messages;
DROP POLICY IF EXISTS "Members can send messages" ON team_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON team_messages;
DROP POLICY IF EXISTS "Everyone can view" ON team_messages;

-- 4. CREATE ROBUST POLICIES

-- Allow reading messages if you are a member of the workspace
CREATE POLICY "Members can view messages"
ON team_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = team_messages.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Allow sending messages if you are a member of the workspace
CREATE POLICY "Members can send messages"
ON team_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id -- You can only send as yourself
  AND
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = team_messages.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- 5. GRANT PERMISSIONS
GRANT ALL ON team_messages TO authenticated;
GRANT ALL ON team_messages TO service_role;
