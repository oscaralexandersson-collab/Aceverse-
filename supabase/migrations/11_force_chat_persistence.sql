
-- 1. ENSURE TABLES EXIST
CREATE TABLE IF NOT EXISTS channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS team_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- 3. NUKE OLD POLICIES
DROP POLICY IF EXISTS "view_channels" ON channels;
DROP POLICY IF EXISTS "insert_channels" ON channels;
DROP POLICY IF EXISTS "update_channels" ON channels;
DROP POLICY IF EXISTS "delete_channels" ON channels;
DROP POLICY IF EXISTS "view_messages" ON team_messages;
DROP POLICY IF EXISTS "insert_messages" ON team_messages;
DROP POLICY IF EXISTS "Members can view channels" ON channels;
DROP POLICY IF EXISTS "Members can create channels" ON channels;
DROP POLICY IF EXISTS "Members can view messages" ON team_messages;
DROP POLICY IF EXISTS "Members can send messages" ON team_messages;

-- 4. CREATE ROBUST POLICIES
CREATE POLICY "view_channels" ON channels FOR SELECT
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()));

CREATE POLICY "insert_channels" ON channels FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()));

CREATE POLICY "update_channels" ON channels FOR UPDATE
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()));

CREATE POLICY "delete_channels" ON channels FOR DELETE
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()));

CREATE POLICY "view_messages" ON team_messages FOR SELECT
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = team_messages.workspace_id AND user_id = auth.uid()));

CREATE POLICY "insert_messages" ON team_messages FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = team_messages.workspace_id AND user_id = auth.uid()));

-- 5. DATA REPAIR
-- Ensure owners are members
INSERT INTO workspace_members (id, workspace_id, user_id, role)
SELECT gen_random_uuid(), id, owner_id, 'owner'
FROM workspaces w
WHERE NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id);

-- Ensure 'allmänt' channel exists
INSERT INTO channels (workspace_id, name)
SELECT id, 'allmänt' FROM workspaces
WHERE id NOT IN (SELECT workspace_id FROM channels);

-- 6. GRANT PERMISSIONS
GRANT ALL ON channels TO authenticated;
GRANT ALL ON team_messages TO authenticated;
