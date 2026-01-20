
-- 1. Create CHANNELS table first (Parent table)
CREATE TABLE IF NOT EXISTS channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create TEAM_MESSAGES table (Child table)
CREATE TABLE IF NOT EXISTS team_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE, -- Link to channels
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Security (RLS)
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- 4. Safety: If team_messages existed but lacked channel_id (Migration fix)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_messages' AND column_name = 'channel_id') THEN
        ALTER TABLE team_messages ADD COLUMN channel_id UUID REFERENCES channels(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Policies for Channels (Reset to be safe)
DROP POLICY IF EXISTS "Members can view channels" ON channels;
DROP POLICY IF EXISTS "Members can create channels" ON channels;
DROP POLICY IF EXISTS "Members can update channels" ON channels;
DROP POLICY IF EXISTS "Members can delete channels" ON channels;

CREATE POLICY "Members can view channels" ON channels FOR SELECT 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Members can create channels" ON channels FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Members can update channels" ON channels FOR UPDATE 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Members can delete channels" ON channels FOR DELETE 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid()));

-- 6. Policies for Messages (Reset to be safe)
DROP POLICY IF EXISTS "Members can view messages" ON team_messages;
DROP POLICY IF EXISTS "Members can send messages" ON team_messages;

CREATE POLICY "Members can view messages" ON team_messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = team_messages.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Members can send messages" ON team_messages FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = team_messages.workspace_id AND user_id = auth.uid()));

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_msg_workspace ON team_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_msg_channel ON team_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_team_msg_created ON team_messages(created_at DESC);
