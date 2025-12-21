
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURATION
// Replace these with your actual Supabase project credentials.
// You can find these in your Supabase Dashboard -> Project Settings -> API
// ------------------------------------------------------------------
const supabaseUrl = 'https://zinjxhibtukdhkcakkzk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppbmp4aGlidHVrZGhrY2Fra3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MzU0OTMsImV4cCI6MjA4MDAxMTQ5M30.dc_ZHrrjqqVPi9WzpZhicF7sFkMdsJ9P2zJ2ZR96Zto';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Ensure session is saved in localStorage
    storageKey: 'aceverse-auth-token',
    storage: window.localStorage,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
