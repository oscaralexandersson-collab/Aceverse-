
-- Add columns to store the last generated analysis text and timestamp
ALTER TABLE full_report_projects 
ADD COLUMN IF NOT EXISTS last_analysis_content TEXT,
ADD COLUMN IF NOT EXISTS last_analysis_at TIMESTAMPTZ;
