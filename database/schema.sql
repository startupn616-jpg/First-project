-- ============================================================
-- AILAND Database Schema v3
-- Survey data stored manually in this DB (no external API needed)
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Officer accounts
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100),
    role          VARCHAR(20) DEFAULT 'officer' CHECK (role IN ('admin', 'officer')),
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Tamil Nadu Districts
CREATE TABLE IF NOT EXISTS districts (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL
);

-- Taluks under each district
CREATE TABLE IF NOT EXISTS taluks (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    code        VARCHAR(20) UNIQUE
);

-- Revenue Villages under each taluk
CREATE TABLE IF NOT EXISTS villages (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    taluk_id     INTEGER NOT NULL REFERENCES taluks(id) ON DELETE CASCADE,
    village_code VARCHAR(20) UNIQUE
);

-- ── Land Parcels ──────────────────────────────────────────────
-- Manually entered survey records (add via the Data Entry page in the app)
CREATE TABLE IF NOT EXISTS land_parcels (
    id             SERIAL PRIMARY KEY,
    survey_number  VARCHAR(20)  NOT NULL,
    sub_division   VARCHAR(10)  DEFAULT '',
    village_id     INTEGER      NOT NULL REFERENCES villages(id),
    patta_number   VARCHAR(30),
    owner_name     VARCHAR(150),
    area_hectares  DECIMAL(10,4),
    area_acres     DECIMAL(10,4),
    land_type      VARCHAR(30)  CHECK (land_type IN ('Wet','Dry','Garden','Poramboke','Waste')),
    land_use       VARCHAR(50)  DEFAULT 'Agricultural',
    water_source   VARCHAR(60),
    soil_type      VARCHAR(60),
    latitude       DECIMAL(10,7),
    longitude      DECIMAL(10,7),
    polygon_coords JSONB,       -- array of {lat, lng} for boundary polygon
    notes          TEXT,
    added_by       INTEGER REFERENCES users(id),
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

-- AI Image Analysis
CREATE TABLE IF NOT EXISTS image_analyses (
    id                   SERIAL PRIMARY KEY,
    land_parcel_id       INTEGER REFERENCES land_parcels(id),
    survey_number        VARCHAR(20),
    image_url            VARCHAR(500),
    original_filename    VARCHAR(255),
    uploaded_by          INTEGER REFERENCES users(id),
    ai_crop_type         VARCHAR(100),
    ai_land_condition    VARCHAR(100),
    ai_soil_quality      VARCHAR(100),
    ai_irrigation_status VARCHAR(100),
    ai_confidence        DECIMAL(5,2),
    ai_recommendations   TEXT,
    ai_raw_result        JSONB,
    created_at           TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_land_survey    ON land_parcels(survey_number);
CREATE INDEX IF NOT EXISTS idx_land_village   ON land_parcels(village_id);
CREATE INDEX IF NOT EXISTS idx_taluks_dist    ON taluks(district_id);
CREATE INDEX IF NOT EXISTS idx_villages_taluk ON villages(taluk_id);

-- ============================================================
-- SEED: Districts
-- ============================================================
INSERT INTO districts (name, code) VALUES
('Chennai','CHE'),('Coimbatore','CBE'),('Madurai','MDU'),
('Salem','SLM'),('Tiruchirappalli','TRY'),('Vellore','VLR'),
('Erode','ERD'),('Tirunelveli','TNV'),('Thanjavur','TNJ'),
('Dindigul','DDL'),('Kanchipuram','KCP'),('Tiruppur','TPR'),
('Namakkal','NMK'),('Krishnagiri','KRG'),('Dharmapuri','DPR'),
('Cuddalore','CDL'),('Nagapattinam','NGP'),('Tiruvarur','TVR'),
('Pudukkottai','PDK'),('Sivaganga','SVG'),('Virudhunagar','VNR'),
('Ramanathapuram','RMD'),('Thoothukudi','TDK'),('Kanniyakumari','KNK'),
('The Nilgiris','OOT'),('Ariyalur','ARL'),('Perambalur','PBR'),
('Karur','KRR'),('Tiruvallur','TVL'),('Villupuram','VLM'),
('Kallakurichi','KLK'),('Chengalpattu','CPT'),('Ranipet','RNP'),
('Tirupattur','TPT'),('Mayiladuthurai','MYD'),('Tenkasi','TKS'),
('Tiruvannamalai','TVN')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: Taluks
-- ============================================================

INSERT INTO taluks (name, district_id, code)
SELECT t.name, d.id, t.code FROM (VALUES
  ('Krishnagiri','KRG-C'),('Hosur','HSR'),('Shoolagiri','SLG'),
  ('Bargur','BRG'),('Pochampalli','PCH'),('Veppanapalli','VPN'),
  ('Kelamangalam','KLM'),('Uthangarai','UTG')
) AS t(name,code) JOIN districts d ON d.code='KRG' ON CONFLICT(code) DO NOTHING;

INSERT INTO taluks (name, district_id, code)
SELECT t.name, d.id, t.code FROM (VALUES
  ('Coimbatore North','CBE-N'),('Coimbatore South','CBE-S'),
  ('Pollachi','PLH'),('Mettupalayam','MTP'),('Sulur','SLR'),
  ('Kinathukadavu','KTK'),('Annur','ANR')
) AS t(name,code) JOIN districts d ON d.code='CBE' ON CONFLICT(code) DO NOTHING;

INSERT INTO taluks (name, district_id, code)
SELECT t.name, d.id, t.code FROM (VALUES
  ('Madurai North','MDU-N'),('Madurai South','MDU-S'),
  ('Melur','MLR'),('Peraiyur','PRY'),('Thirumangalam','TMG'),('Usilampatti','USP')
) AS t(name,code) JOIN districts d ON d.code='MDU' ON CONFLICT(code) DO NOTHING;

INSERT INTO taluks (name, district_id, code)
SELECT t.name, d.id, t.code FROM (VALUES
  ('Salem','SLM-C'),('Edappadi','EDP'),('Omalur','OML'),
  ('Mettur','MET'),('Sangagiri','SGR'),('Yercaud','YRD'),('Attur','ATR')
) AS t(name,code) JOIN districts d ON d.code='SLM' ON CONFLICT(code) DO NOTHING;

INSERT INTO taluks (name, district_id, code)
SELECT t.name, d.id, t.code FROM (VALUES
  ('Thanjavur','TNJ-C'),('Kumbakonam','KBK'),('Papanasam','PPN'),
  ('Thiruvidaimarudur','TVM'),('Orathanadu','ORT'),('Pattukottai','PTK')
) AS t(name,code) JOIN districts d ON d.code='TNJ' ON CONFLICT(code) DO NOTHING;

INSERT INTO taluks (name, district_id, code)
SELECT t.name, d.id, t.code FROM (VALUES
  ('Tiruchirappalli','TRY-C'),('Srirangam','SRG'),('Musiri','MSR'),
  ('Lalgudi','LGD'),('Manapparai','MNP'),('Thuraiyur','THR')
) AS t(name,code) JOIN districts d ON d.code='TRY' ON CONFLICT(code) DO NOTHING;

INSERT INTO taluks (name, district_id, code)
SELECT t.name, d.id, t.code FROM (VALUES
  ('Tirunelveli','TNV-C'),('Palayamkottai','PLK'),('Ambasamudram','ABS'),
  ('Nanguneri','NGR'),('Sankarankovil','SKK'),('Cheranmahadevi','CHM')
) AS t(name,code) JOIN districts d ON d.code='TNV' ON CONFLICT(code) DO NOTHING;

INSERT INTO taluks (name, district_id, code)
SELECT t.name, d.id, t.code FROM (VALUES
  ('Vellore','VLR-C'),('Gudiyatham','GDT'),('Katpadi','KPD'),
  ('Arakkonam','ARK'),('Tirupattur','TPT-T')
) AS t(name,code) JOIN districts d ON d.code='VLR' ON CONFLICT(code) DO NOTHING;

-- ============================================================
-- SEED: Villages
-- ============================================================

-- Hosur Taluk villages (20 villages)
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Hosur','HSR-001'),('Thummanapalli','HSR-002'),('Mathigiri','HSR-003'),
  ('Rayakottai','HSR-004'),('Berigai','HSR-005'),('Baliganapalli','HSR-006'),
  ('Thally','HSR-007'),('Naganoor','HSR-008'),('Naganahalli','HSR-009'),
  ('Singampalli','HSR-010'),('Bommidi','HSR-011'),('Nallur','HSR-012'),
  ('Jigani Road','HSR-013'),('Soolaiammanpalli','HSR-014'),('Karapalli','HSR-015'),
  ('Sirugulampattu','HSR-016'),('Pachandahalli','HSR-017'),('Morasapatti','HSR-018'),
  ('Kadhampalli','HSR-019'),('Echangkottai','HSR-020')
) AS v(name,code) JOIN taluks t ON t.code='HSR' ON CONFLICT(village_code) DO NOTHING;

-- Krishnagiri Taluk villages (20 villages)
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Krishnagiri','KRG-001'),('Mathur','KRG-002'),('Theerthamalai','KRG-003'),
  ('Agaram','KRG-004'),('Kandikuppam','KRG-005'),('Kottayur','KRG-006'),
  ('Seetharam Nagar','KRG-007'),('Krishnagiri East','KRG-008'),
  ('Krishnagiri West','KRG-009'),('Innabagayam','KRG-010'),
  ('Kamarajapuram','KRG-011'),('Nagadasampatti','KRG-012'),('Surlipatti','KRG-013'),
  ('Thittagapatti','KRG-014'),('Eraiyur','KRG-015'),('Irugur','KRG-016'),
  ('Mullamangalam','KRG-017'),('Rajipuram','KRG-018'),
  ('Kaverirajapuram','KRG-019'),('Manchanahalli','KRG-020')
) AS v(name,code) JOIN taluks t ON t.code='KRG-C' ON CONFLICT(village_code) DO NOTHING;

-- Shoolagiri Taluk villages (15 villages)
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Shoolagiri','SLG-001'),('Krishnapuram','SLG-002'),('Puthur','SLG-003'),
  ('Kottapatti','SLG-004'),('Govindapuram','SLG-005'),('Nathamedu','SLG-006'),
  ('Palavadi','SLG-007'),('Periyakaradiyur','SLG-008'),('Minnampalli','SLG-009'),
  ('Udaiyarankulam','SLG-010'),('Kadathur','SLG-011'),('Thuvarankurichchi','SLG-012'),
  ('Nallampatti','SLG-013'),('Semmandapalli','SLG-014'),('Ottiyambakkam','SLG-015')
) AS v(name,code) JOIN taluks t ON t.code='SLG' ON CONFLICT(village_code) DO NOTHING;

-- Bargur Taluk villages (15 villages)
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Bargur','BRG-001'),('Anchetti','BRG-002'),('Pennagaram','BRG-003'),
  ('Denkanikottai','BRG-004'),('Doddampatti','BRG-005'),('Chinnar','BRG-006'),
  ('Kambaipattu','BRG-007'),('Kottappatti','BRG-008'),('Thathampatti','BRG-009'),
  ('Hanumanthapuram','BRG-010'),('Ittanahalli','BRG-011'),('Narayanapuram','BRG-012'),
  ('Chinnar Colony','BRG-013'),('Muthampattu','BRG-014'),('Kattuputhur','BRG-015')
) AS v(name,code) JOIN taluks t ON t.code='BRG' ON CONFLICT(village_code) DO NOTHING;

-- Pochampalli Taluk villages (15 villages — includes Hogenakkal waterfalls)
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Pochampalli','PCH-001'),('Kottapatti','PCH-002'),('Thimmanatham','PCH-003'),
  ('Agraharam','PCH-004'),('Sengal','PCH-005'),('Hogenakkal','PCH-006'),
  ('Eriyur','PCH-007'),('Marandahalli','PCH-008'),('Berigai Halli','PCH-009'),
  ('Ramapuram','PCH-010'),('Soosaiapuram','PCH-011'),('Thirupathikundram','PCH-012'),
  ('Kottaiyur','PCH-013'),('Seelanaickanpatti','PCH-014'),('Mudiyanur','PCH-015')
) AS v(name,code) JOIN taluks t ON t.code='PCH' ON CONFLICT(village_code) DO NOTHING;

-- Veppanapalli Taluk villages (15 villages)
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Veppanapalli','VPN-001'),('Pongalur','VPN-002'),('Thattanahalli','VPN-003'),
  ('Olaipadi','VPN-004'),('Thimmampatti','VPN-005'),('Naickanur','VPN-006'),
  ('Kuppachipalayam','VPN-007'),('Ammapettai','VPN-008'),('Devanandapuram','VPN-009'),
  ('Parandahalli','VPN-010'),('Chinnasalem','VPN-011'),('Thachampatti','VPN-012'),
  ('Natchiyanampatti','VPN-013'),('Kondampattu','VPN-014'),('Krishnasamudram','VPN-015')
) AS v(name,code) JOIN taluks t ON t.code='VPN' ON CONFLICT(village_code) DO NOTHING;

-- Kelamangalam Taluk villages (15 villages — includes SIPCOT industrial area)
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Kelamangalam','KLM-001'),('Minnampalli','KLM-002'),('Sipcot Phase 1','KLM-003'),
  ('Goundapuram','KLM-004'),('Omalur Road','KLM-005'),('Peddanahalli','KLM-006'),
  ('Bommidi','KLM-007'),('Sankarapuram','KLM-008'),('Sipcot Phase 2','KLM-009'),
  ('Sitheri Hills','KLM-010'),('Eachur','KLM-011'),('Karunapuram','KLM-012'),
  ('Devarkulam','KLM-013'),('Thalapalli','KLM-014'),('Reddihalli','KLM-015')
) AS v(name,code) JOIN taluks t ON t.code='KLM' ON CONFLICT(village_code) DO NOTHING;

-- Uthangarai Taluk villages (15 villages — Cauvery river belt)
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Uthangarai','UTG-001'),('Kaveripattinam','UTG-002'),('Naikaneri','UTG-003'),
  ('Sirugusamudram','UTG-004'),('Nallampalli','UTG-005'),('Thoppur','UTG-006'),
  ('Varattanapalli','UTG-007'),('Mamballi','UTG-008'),('Kamandoddi','UTG-009'),
  ('Krishnarayapuram','UTG-010'),('Thimmampatti','UTG-011'),('Vengampatti','UTG-012'),
  ('Periyapalli','UTG-013'),('Elathur','UTG-014'),('Santhiapuram','UTG-015')
) AS v(name,code) JOIN taluks t ON t.code='UTG' ON CONFLICT(village_code) DO NOTHING;

INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Thanjavur East','TNJ-001'),('Thanjavur West','TNJ-002'),
  ('Ammapettai','TNJ-003'),('Budalur','TNJ-004'),
  ('Kallanai','TNJ-005'),('Rajagiri','TNJ-006'),
  ('Vallam','TNJ-007'),('Sengipatti','TNJ-008')
) AS v(name,code) JOIN taluks t ON t.code='TNJ-C' ON CONFLICT(village_code) DO NOTHING;

INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Kumbakonam','KBK-001'),('Darasuram','KBK-002'),('Swamimalai','KBK-003'),
  ('Thirunageswaram','KBK-004'),('Thirubuvanam','KBK-005')
) AS v(name,code) JOIN taluks t ON t.code='KBK' ON CONFLICT(village_code) DO NOTHING;

INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Pollachi','PLH-001'),('Anaimalai','PLH-002'),('Gomangalam','PLH-003'),
  ('Kinathukadavu','PLH-004'),('Palladam','PLH-005')
) AS v(name,code) JOIN taluks t ON t.code='PLH' ON CONFLICT(village_code) DO NOTHING;

INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Avaniyapuram','MDU-001'),('Paravai','MDU-002'),
  ('Thirumogur','MDU-003'),('Vandiyur','MDU-004'),('Melur','MDU-005')
) AS v(name,code) JOIN taluks t ON t.code='MDU-N' ON CONFLICT(village_code) DO NOTHING;

INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Srirangam','SRG-001'),('Ariyamangalam','TRY-001'),
  ('Thiruverumbur','TRY-002'),('Manachanallur','TRY-003')
) AS v(name,code) JOIN taluks t ON t.code='SRG' ON CONFLICT(village_code) DO NOTHING;

-- ============================================================
-- SEED: Sample land parcels (Hosur / Krishnagiri area)
-- Coordinates match the screenshots (12.82°N, 77.88°E area)
-- ============================================================
INSERT INTO land_parcels
  (survey_number, sub_division, village_id, patta_number, owner_name,
   area_hectares, area_acres, land_type, land_use, water_source, soil_type,
   latitude, longitude, polygon_coords)
SELECT
  lp.sno, lp.sdiv, v.id, lp.patta, lp.owner,
  lp.ha, lp.ac, lp.ltype, 'Agricultural', lp.wsrc, lp.soil,
  lp.lat, lp.lng, lp.poly::jsonb
FROM (VALUES
  ('216','1A1','PT-5501','Ramasamy Gounder',0.8094,2.00,'Dry','Borewell','Red Loam',
   12.8224,77.8802,'[{"lat":12.8230,"lng":77.8796},{"lat":12.8230,"lng":77.8810},{"lat":12.8218,"lng":77.8810},{"lat":12.8218,"lng":77.8796}]'),
  ('216','1A2','PT-5502','Murugesan Reddy',1.2141,3.00,'Dry','Borewell','Red Sandy',
   12.8215,77.8815,'[{"lat":12.8220,"lng":77.8810},{"lat":12.8220,"lng":77.8823},{"lat":12.8210,"lng":77.8823},{"lat":12.8210,"lng":77.8810}]'),
  ('216','1B', 'PT-5503','Selvaraj Nadar',0.4047,1.00,'Dry','Rainfed','Laterite',
   12.8228,77.8790,'[{"lat":12.8233,"lng":77.8785},{"lat":12.8233,"lng":77.8795},{"lat":12.8223,"lng":77.8795},{"lat":12.8223,"lng":77.8785}]'),
  ('217','1',  'PT-5510','Palanisamy Thevar',1.6188,4.00,'Dry','Borewell','Red Loam',
   12.8205,77.8800,'[{"lat":12.8210,"lng":77.8793},{"lat":12.8210,"lng":77.8808},{"lat":12.8200,"lng":77.8808},{"lat":12.8200,"lng":77.8793}]'),
  ('89', '1A', 'PT-5520','Krishnamoorthy Iyer',1.2141,3.00,'Wet','Canal','Alluvial',
   12.8218,77.9028,'[{"lat":12.8225,"lng":77.9022},{"lat":12.8225,"lng":77.9035},{"lat":12.8211,"lng":77.9035},{"lat":12.8211,"lng":77.9022}]'),
  ('89', '2A', 'PT-5521','Thangamani Ammal',0.8094,2.00,'Wet','Well','Clay Loam',
   12.8208,77.9038,'[{"lat":12.8214,"lng":77.9033},{"lat":12.8214,"lng":77.9044},{"lat":12.8202,"lng":77.9044},{"lat":12.8202,"lng":77.9033}]')
) AS lp(sno,sdiv,patta,owner,ha,ac,ltype,wsrc,soil,lat,lng,poly)
JOIN villages v ON v.village_code = 'HSR-001'
ON CONFLICT DO NOTHING;

-- ============================================================
-- Run: cd backend && npm run seed  (to create user accounts)
-- Login: admin/Admin@123  officer1/Officer@123
-- ============================================================
