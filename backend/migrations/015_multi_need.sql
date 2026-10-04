-- 015_multi_need.sql — UP: preferensi multi-need (popup bisa pilih >1).
-- needs TEXT[] + CHECK subset enum; baris lama (single need) dimigrasi ke array 1 elemen.
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS needs TEXT[] NOT NULL DEFAULT '{}';
UPDATE user_preferences SET needs = ARRAY[need] WHERE needs = '{}' AND need IS NOT NULL;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS need;
ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_needs_check;
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_needs_check
  CHECK (needs <@ ARRAY['diet','muscle','diabetes','allergy_free','low_sugar']);
