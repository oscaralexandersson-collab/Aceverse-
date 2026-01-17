
-- 1. Create the table for Full Reports
CREATE TABLE IF NOT EXISTS full_report_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    workspace_id UUID REFERENCES workspaces(id), -- Nullable (NULL = Personal, UUID = Team)
    company_name TEXT NOT NULL,
    
    -- "sections" stores the entire state of the report editor.
    -- Since it is JSONB, it saves the nested 'feedback', 'score', and 'status' automatically.
    sections JSONB DEFAULT '{}'::jsonb, 
    
    -- "financials" stores the raw numbers for the analysis tool
    financials JSONB DEFAULT '{"revenue":0, "costs":0, "equity":0, "debt":0}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE full_report_projects ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Policy: Users can view their own reports OR reports in workspaces they belong to
CREATE POLICY "Users can view own or team reports" 
ON full_report_projects FOR SELECT 
USING (
    (auth.uid() = user_id) -- Personal ownership
    OR 
    (workspace_id IN ( -- Team membership check
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    ))
);

-- Policy: Users can insert reports (Personal or Team)
CREATE POLICY "Users can create reports" 
ON full_report_projects FOR INSERT 
WITH CHECK (
    auth.uid() = user_id
);

-- Policy: Users can update reports (Owner OR Team Member with write access)
-- Note: Assuming all members can edit for now. Add role checks here if needed.
CREATE POLICY "Users can update own or team reports" 
ON full_report_projects FOR UPDATE 
USING (
    (auth.uid() = user_id)
    OR 
    (workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    ))
);

-- Policy: Only Owners can delete reports (Optional: Allow admins too)
CREATE POLICY "Owners can delete reports" 
ON full_report_projects FOR DELETE 
USING (
    auth.uid() = user_id
);

-- 4. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_user_id ON full_report_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_report_workspace_id ON full_report_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_report_updated_at ON full_report_projects(updated_at DESC);

-- 5. Trigger to update 'updated_at' automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_full_report_projects_updated_at
    BEFORE UPDATE ON full_report_projects
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
