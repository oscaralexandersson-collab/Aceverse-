
-- 1. Table for Marketing Persistence
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brief JSONB DEFAULT '{}'::jsonb,
    assets JSONB DEFAULT '[]'::jsonb, -- Stores CampaignAsset array
    date_created TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add customer_count to sales_events to distinguish between items sold and actual unique customers
ALTER TABLE sales_events ADD COLUMN IF NOT EXISTS customer_count INTEGER DEFAULT 1;

-- 3. Enable RLS for marketing
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view own or team marketing" 
ON marketing_campaigns FOR SELECT 
USING (
    (auth.uid() = user_id) 
    OR 
    (workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    ))
);

CREATE POLICY "Users can create marketing" 
ON marketing_campaigns FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete marketing" 
ON marketing_campaigns FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_user_id ON marketing_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_workspace_id ON marketing_campaigns(workspace_id);
