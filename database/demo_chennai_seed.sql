-- Chennai TamilNilamGeo-style DEMO dataset.
-- This is fictional/sample data for product demonstrations only.
-- It is not an official Tamil Nilam, Patta, A-Register, or FMB record.

INSERT INTO districts (name, code)
VALUES ('Chennai', 'CHE')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO taluks (name, district_id, code)
SELECT v.name, d.id, v.code
FROM (VALUES
  ('Alandur', 'CHE-ALD'),
  ('Ambattur', 'CHE-AMB'),
  ('Sholinganallur', 'CHE-SHO')
) AS v(name, code)
JOIN districts d ON d.code = 'CHE'
ON CONFLICT (code) DO NOTHING;

INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code
FROM (VALUES
  ('Adambakkam', 'CHE-ALD', 'CHE-ALD-001'),
  ('Puzhuthivakkam', 'CHE-ALD', 'CHE-ALD-002'),
  ('Mogappair', 'CHE-AMB', 'CHE-AMB-001'),
  ('Madhavaram', 'CHE-AMB', 'CHE-AMB-002'),
  ('Perungudi', 'CHE-SHO', 'CHE-SHO-001'),
  ('Karapakkam', 'CHE-SHO', 'CHE-SHO-002')
) AS v(name, taluk_code, code)
JOIN taluks t ON t.code = v.taluk_code
ON CONFLICT (village_code) DO NOTHING;

INSERT INTO land_parcels (
  survey_number, sub_division, village_id, patta_number, owner_name,
  area_hectares, area_acres, land_type, land_use, water_source, soil_type,
  latitude, longitude, polygon_coords, notes
)
SELECT
  p.survey_number, p.sub_division, v.id, p.patta_number, p.owner_name,
  p.area_hectares, p.area_acres, p.land_type, p.land_use, p.water_source, p.soil_type,
  p.latitude, p.longitude, p.polygon_coords::jsonb,
  'DEMO DATA ONLY — fictional record for Chennai TamilNilamGeo product demonstration. Sample A-Register, Patta, and FMB details are not official.'
FROM (VALUES
  ('101', '1A', 'CHE-ALD-001', 'DEMO-CHE-1001', 'Demo Holder A', 0.4856, 1.20, 'Dry', 'Residential', 'Metro Water', 'Red Sandy', 12.9838, 80.2002, '[{"lat":12.9842,"lng":80.1997},{"lat":12.9842,"lng":80.2007},{"lat":12.9834,"lng":80.2007},{"lat":12.9834,"lng":80.1997}]'),
  ('101', '1B', 'CHE-ALD-001', 'DEMO-CHE-1002', 'Demo Holder B', 0.3237, 0.80, 'Dry', 'Residential', 'Metro Water', 'Red Sandy', 12.9829, 80.2013, '[{"lat":12.9833,"lng":80.2008},{"lat":12.9833,"lng":80.2018},{"lat":12.9825,"lng":80.2018},{"lat":12.9825,"lng":80.2008}]'),
  ('212', '2A', 'CHE-ALD-002', 'DEMO-CHE-1101', 'Demo Holder C', 0.6070, 1.50, 'Garden', 'Horticultural', 'Borewell', 'Clay Loam', 12.9705, 80.2075, '[{"lat":12.9709,"lng":80.2070},{"lat":12.9709,"lng":80.2080},{"lat":12.9701,"lng":80.2080},{"lat":12.9701,"lng":80.2070}]'),
  ('55', '1', 'CHE-AMB-001', 'DEMO-CHE-1201', 'Demo Holder D', 0.4047, 1.00, 'Dry', 'Residential', 'Metro Water', 'Alluvial', 13.0830, 80.1775, '[{"lat":13.0834,"lng":80.1770},{"lat":13.0834,"lng":80.1780},{"lat":13.0826,"lng":80.1780},{"lat":13.0826,"lng":80.1770}]'),
  ('78', '3B', 'CHE-AMB-002', 'DEMO-CHE-1301', 'Demo Holder E', 0.8094, 2.00, 'Wet', 'Agricultural', 'Tank', 'Clay Loam', 13.1485, 80.2312, '[{"lat":13.1490,"lng":80.2306},{"lat":13.1490,"lng":80.2318},{"lat":13.1480,"lng":80.2318},{"lat":13.1480,"lng":80.2306}]'),
  ('329', '1A', 'CHE-SHO-001', 'DEMO-CHE-1401', 'Demo Holder F', 0.5261, 1.30, 'Dry', 'Commercial', 'Metro Water', 'Red Sandy', 12.9617, 80.2445, '[{"lat":12.9621,"lng":80.2440},{"lat":12.9621,"lng":80.2450},{"lat":12.9613,"lng":80.2450},{"lat":12.9613,"lng":80.2440}]'),
  ('410', '2', 'CHE-SHO-002', 'DEMO-CHE-1501', 'Demo Holder G', 0.6475, 1.60, 'Garden', 'Horticultural', 'Borewell', 'Sandy Loam', 12.9190, 80.2298, '[{"lat":12.9194,"lng":80.2293},{"lat":12.9194,"lng":80.2303},{"lat":12.9186,"lng":80.2303},{"lat":12.9186,"lng":80.2293}]')
) AS p(survey_number, sub_division, village_code, patta_number, owner_name, area_hectares, area_acres, land_type, land_use, water_source, soil_type, latitude, longitude, polygon_coords)
JOIN villages v ON v.village_code = p.village_code
WHERE NOT EXISTS (
  SELECT 1 FROM land_parcels existing
  WHERE existing.village_id = v.id
    AND existing.survey_number = p.survey_number
    AND existing.sub_division = p.sub_division
);
