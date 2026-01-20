
-- 1. Tvinga tabellen att vara med i realtime-publikationen
-- Detta gör att klienten (React) faktiskt får 'INSERT'-eventen
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. Säkerställ att RLS tillåter mottagaren att se notisen direkt
-- (Detta säkerställer att prenumerationen inte blockeras av säkerhetsregler)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Index för snabbare uppslag vid realtime-filter
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
