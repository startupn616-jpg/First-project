-- ============================================================
-- AILAND Setup — Run this ONCE in Supabase SQL Editor
-- Project → SQL Editor → paste all → Run
-- ============================================================

-- ── 1. Disable RLS (security handled by backend JWT) ─────────
ALTER TABLE users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE districts       DISABLE ROW LEVEL SECURITY;
ALTER TABLE taluks          DISABLE ROW LEVEL SECURITY;
ALTER TABLE villages        DISABLE ROW LEVEL SECURITY;
ALTER TABLE land_parcels    DISABLE ROW LEVEL SECURITY;
ALTER TABLE image_analyses  DISABLE ROW LEVEL SECURITY;

-- ── 2. Add GPS columns to image_analyses ─────────────────────
ALTER TABLE image_analyses
  ADD COLUMN IF NOT EXISTS latitude       DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude      DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS altitude       DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS location_label VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_analyses_gps ON image_analyses(latitude, longitude)
  WHERE latitude IS NOT NULL;

-- ── 3. Create login users (bcrypt via pgcrypto) ───────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (username, password_hash, full_name, role) VALUES
  ('admin',    crypt('Admin@123',   gen_salt('bf', 10)), 'System Administrator',      'admin'),
  ('officer1', crypt('Officer@123', gen_salt('bf', 10)), 'Field Officer Rajan Kumar', 'officer'),
  ('officer2', crypt('Officer@123', gen_salt('bf', 10)), 'Field Officer Priya Devi',  'officer')
ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      full_name     = EXCLUDED.full_name,
      role          = EXCLUDED.role;
