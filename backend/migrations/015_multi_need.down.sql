-- 015_multi_need.down.sql — DOWN: kembalikan single need (ambil elemen pertama).
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_needs_check;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS need VARCHAR(20);
UPDATE user_preferences SET need = needs[1] WHERE needs <> '{}';
ALTER TABLE user_preferences DROP COLUMN IF EXISTS needs;
