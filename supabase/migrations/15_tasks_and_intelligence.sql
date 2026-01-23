
-- 1. Create TASKS table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- Nullable (Personal or Team)
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed'
    linked_tool TEXT, -- 'marketing', 'crm', 'pitch', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
CREATE POLICY "Users can view own or team tasks" 
ON tasks FOR SELECT 
USING (
    (auth.uid() = user_id) 
    OR 
    (workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    ))
);

CREATE POLICY "Users can create tasks" 
ON tasks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own or team tasks" 
ON tasks FOR UPDATE 
USING (
    (auth.uid() = user_id)
    OR 
    (workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    ))
);

CREATE POLICY "Owners can delete tasks" 
ON tasks FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Add system flag to team_messages for distinct UI styling
ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
