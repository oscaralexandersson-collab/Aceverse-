
-- CHANNELS
CREATE TABLE IF NOT EXISTS channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Policies for Channels
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

-- Update Team Messages
ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE CASCADE;

-- Create Index
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_msg_channel ON team_messages(channel_id);
