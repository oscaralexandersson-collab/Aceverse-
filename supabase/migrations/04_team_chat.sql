
-- TEAM MESSAGES
CREATE TABLE IF NOT EXISTS team_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view messages" 
ON team_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = team_messages.workspace_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Members can send messages" 
ON team_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = team_messages.workspace_id 
        AND user_id = auth.uid()
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_msg_workspace ON team_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_msg_created ON team_messages(created_at DESC);
