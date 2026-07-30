-- Forward-only migration for existing TamilNillamGeo databases.
-- Run once in the Supabase SQL Editor before using asynchronous image analysis.

ALTER TABLE image_analyses
  ADD COLUMN IF NOT EXISTS land_parcel_id INTEGER REFERENCES land_parcels(id),
  ADD COLUMN IF NOT EXISTS village_id INTEGER REFERENCES villages(id),
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS altitude DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS location_label VARCHAR(255),
  ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(20) NOT NULL DEFAULT 'processing';

ALTER TABLE image_analyses
  DROP CONSTRAINT IF EXISTS image_analyses_analysis_status_check;

ALTER TABLE image_analyses
  ADD CONSTRAINT image_analyses_analysis_status_check
  CHECK (analysis_status IN ('processing', 'completed', 'failed'));

UPDATE image_analyses
SET analysis_status = 'completed'
WHERE analysis_status = 'processing'
  AND ai_raw_result IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_land_coordinates
  ON land_parcels(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_uploaded_status_created
  ON image_analyses(uploaded_by, analysis_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_parcel
  ON image_analyses(land_parcel_id);
