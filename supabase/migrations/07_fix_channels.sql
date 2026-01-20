
-- 1. Create CHANNELS table if not exists
CREATE TABLE IF NOT EXISTS channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- 3. Add channel_id to team_messages if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_messages' AND column_name = 'channel_id') THEN
        ALTER TABLE team_messages ADD COLUMN channel_id UUID REFERENCES channels(id) ON DELETE CASCADE;
        CREATE INDEX idx_msg_channel ON team_messages(channel_id);
    END IF;
END $$;

-- 4. Create Policies (Drop first to avoid conflicts if partially exists)
DROP POLICY IF EXISTS "Members can view channels" ON channels;
DROP POLICY IF EXISTS "Members can create channels" ON channels;
DROP POLICY IF EXISTS "Members can update channels" ON channels;
DROP POLICY IF EXISTS "Members can delete channels" ON channels;

CREATE POLICY "Members can view channels" 
ON channels FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = channels.workspace_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Members can create channels" 
ON channels FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = channels.workspace_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Members can update channels" 
ON channels FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = channels.workspace_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Members can delete channels" 
ON channels FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = channels.workspace_id 
        AND user_id = auth.uid()
    )
);

-- 5. Create Index
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);
