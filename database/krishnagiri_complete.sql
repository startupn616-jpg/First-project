-- ============================================================
-- Krishnagiri District — Complete & Corrected Village Data
-- Run this entire file in Supabase SQL Editor
-- Safe to run multiple times — all inserts use ON CONFLICT DO NOTHING
-- ============================================================

-- ── Step 1: Fix wrong village names already inserted ─────────────────────────
-- HSR-009 was 'Kelamangalam' — Kelamangalam is a separate taluk, not a Hosur village
UPDATE villages SET name = 'Naganahalli'    WHERE village_code = 'HSR-009';
-- HSR-010 was 'Attibele' — Attibele is in Karnataka, not Tamil Nadu
UPDATE villages SET name = 'Singampalli'    WHERE village_code = 'HSR-010';
-- BRG-008 was 'Veppanapalli' — Veppanapalli is its own taluk HQ
UPDATE villages SET name = 'Kottappatti'    WHERE village_code = 'BRG-008';
-- UTG-003 was 'Harur' — Harur is in Dharmapuri district
UPDATE villages SET name = 'Naikaneri'      WHERE village_code = 'UTG-003';
-- UTG-004 was 'Palacode' — Palacode is in Dharmapuri district
UPDATE villages SET name = 'Sirugusamudram' WHERE village_code = 'UTG-004';
-- UTG-006 was 'Polur' — Polur is in Tiruvannamalai district
UPDATE villages SET name = 'Thoppur'        WHERE village_code = 'UTG-006';
-- UTG-008 was 'Kolli Hills' — Kolli Hills is in Namakkal district
UPDATE villages SET name = 'Mamballi'       WHERE village_code = 'UTG-008';

-- ── Step 2: Ensure all 8 Krishnagiri taluks exist ────────────────────────────
INSERT INTO taluks (name, district_id, code)
SELECT t.name, d.id, t.code FROM (VALUES
  ('Krishnagiri', 'KRG-C'),
  ('Hosur',       'HSR'),
  ('Shoolagiri',  'SLG'),
  ('Bargur',      'BRG'),
  ('Pochampalli', 'PCH'),
  ('Veppanapalli','VPN'),
  ('Kelamangalam','KLM'),
  ('Uthangarai',  'UTG')
) AS t(name, code)
JOIN districts d ON d.code = 'KRG'
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- HOSUR TALUK (code: HSR) — 20 villages
-- Major industrial hub, borders Karnataka
-- ============================================================
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Hosur',               'HSR-001'),
  ('Thummanapalli',       'HSR-002'),
  ('Mathigiri',           'HSR-003'),
  ('Rayakottai',          'HSR-004'),
  ('Berigai',             'HSR-005'),
  ('Baliganapalli',       'HSR-006'),
  ('Thally',              'HSR-007'),
  ('Naganoor',            'HSR-008'),
  ('Naganahalli',         'HSR-009'),
  ('Singampalli',         'HSR-010'),
  ('Bommidi',             'HSR-011'),
  ('Nallur',              'HSR-012'),
  ('Jigani Road',         'HSR-013'),
  ('Soolaiammanpalli',    'HSR-014'),
  ('Karapalli',           'HSR-015'),
  ('Sirugulampattu',      'HSR-016'),
  ('Pachandahalli',       'HSR-017'),
  ('Morasapatti',         'HSR-018'),
  ('Kadhampalli',         'HSR-019'),
  ('Echangkottai',        'HSR-020')
) AS v(name, code)
JOIN taluks t ON t.code = 'HSR'
ON CONFLICT (village_code) DO NOTHING;

-- ============================================================
-- KRISHNAGIRI TALUK (code: KRG-C) — 20 villages
-- District headquarters taluk
-- ============================================================
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Krishnagiri',         'KRG-001'),
  ('Mathur',              'KRG-002'),
  ('Theerthamalai',       'KRG-003'),
  ('Agaram',              'KRG-004'),
  ('Kandikuppam',         'KRG-005'),
  ('Kottayur',            'KRG-006'),
  ('Seetharam Nagar',     'KRG-007'),
  ('Krishnagiri East',    'KRG-008'),
  ('Krishnagiri West',    'KRG-009'),
  ('Innabagayam',         'KRG-010'),
  ('Kamarajapuram',       'KRG-011'),
  ('Nagadasampatti',      'KRG-012'),
  ('Surlipatti',          'KRG-013'),
  ('Thittagapatti',       'KRG-014'),
  ('Eraiyur',             'KRG-015'),
  ('Irugur',              'KRG-016'),
  ('Mullamangalam',       'KRG-017'),
  ('Rajipuram',           'KRG-018'),
  ('Kaverirajapuram',     'KRG-019'),
  ('Manchanahalli',       'KRG-020')
) AS v(name, code)
JOIN taluks t ON t.code = 'KRG-C'
ON CONFLICT (village_code) DO NOTHING;

-- ============================================================
-- SHOOLAGIRI TALUK (code: SLG) — 15 villages
-- Between Hosur and Krishnagiri town
-- ============================================================
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Shoolagiri',          'SLG-001'),
  ('Krishnapuram',        'SLG-002'),
  ('Puthur',              'SLG-003'),
  ('Kottapatti',          'SLG-004'),
  ('Govindapuram',        'SLG-005'),
  ('Nathamedu',           'SLG-006'),
  ('Palavadi',            'SLG-007'),
  ('Periyakaradiyur',     'SLG-008'),
  ('Minnampalli',         'SLG-009'),
  ('Udaiyarankulam',      'SLG-010'),
  ('Kadathur',            'SLG-011'),
  ('Thuvarankurichchi',   'SLG-012'),
  ('Nallampatti',         'SLG-013'),
  ('Semmandapalli',       'SLG-014'),
  ('Ottiyambakkam',       'SLG-015')
) AS v(name, code)
JOIN taluks t ON t.code = 'SLG'
ON CONFLICT (village_code) DO NOTHING;

-- ============================================================
-- BARGUR TALUK (code: BRG) — 15 villages
-- Eastern Krishnagiri, includes forest areas
-- ============================================================
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Bargur',              'BRG-001'),
  ('Anchetti',            'BRG-002'),
  ('Pennagaram',          'BRG-003'),
  ('Denkanikottai',       'BRG-004'),
  ('Doddampatti',         'BRG-005'),
  ('Chinnar',             'BRG-006'),
  ('Kambaipattu',         'BRG-007'),
  ('Kottappatti',         'BRG-008'),
  ('Thathampatti',        'BRG-009'),
  ('Hanumanthapuram',     'BRG-010'),
  ('Ittanahalli',         'BRG-011'),
  ('Narayanapuram',       'BRG-012'),
  ('Chinnar Colony',      'BRG-013'),
  ('Muthampattu',         'BRG-014'),
  ('Kattuputhur',         'BRG-015')
) AS v(name, code)
JOIN taluks t ON t.code = 'BRG'
ON CONFLICT (village_code) DO NOTHING;

-- ============================================================
-- POCHAMPALLI TALUK (code: PCH) — 15 villages
-- Includes famous Hogenakkal waterfalls area
-- ============================================================
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Pochampalli',         'PCH-001'),
  ('Kottapatti',          'PCH-002'),
  ('Thimmanatham',        'PCH-003'),
  ('Agraharam',           'PCH-004'),
  ('Sengal',              'PCH-005'),
  ('Hogenakkal',          'PCH-006'),
  ('Eriyur',              'PCH-007'),
  ('Marandahalli',        'PCH-008'),
  ('Berigai Halli',       'PCH-009'),
  ('Ramapuram',           'PCH-010'),
  ('Soosaiapuram',        'PCH-011'),
  ('Thirupathikundram',   'PCH-012'),
  ('Kottaiyur',           'PCH-013'),
  ('Seelanaickanpatti',   'PCH-014'),
  ('Mudiyanur',           'PCH-015')
) AS v(name, code)
JOIN taluks t ON t.code = 'PCH'
ON CONFLICT (village_code) DO NOTHING;

-- ============================================================
-- VEPPANAPALLI TALUK (code: VPN) — 15 villages
-- North-central Krishnagiri
-- ============================================================
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Veppanapalli',        'VPN-001'),
  ('Pongalur',            'VPN-002'),
  ('Thattanahalli',       'VPN-003'),
  ('Olaipadi',            'VPN-004'),
  ('Thimmampatti',        'VPN-005'),
  ('Naickanur',           'VPN-006'),
  ('Kuppachipalayam',     'VPN-007'),
  ('Ammapettai',          'VPN-008'),
  ('Devanandapuram',      'VPN-009'),
  ('Parandahalli',        'VPN-010'),
  ('Chinnasalem',         'VPN-011'),
  ('Thachampatti',        'VPN-012'),
  ('Natchiyanampatti',    'VPN-013'),
  ('Kondampattu',         'VPN-014'),
  ('Krishnasamudram',     'VPN-015')
) AS v(name, code)
JOIN taluks t ON t.code = 'VPN'
ON CONFLICT (village_code) DO NOTHING;

-- ============================================================
-- KELAMANGALAM TALUK (code: KLM) — 15 villages
-- South Krishnagiri, SIPCOT industrial area
-- ============================================================
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Kelamangalam',        'KLM-001'),
  ('Minnampalli',         'KLM-002'),
  ('Sipcot Phase 1',      'KLM-003'),
  ('Goundapuram',         'KLM-004'),
  ('Omalur Road',         'KLM-005'),
  ('Peddanahalli',        'KLM-006'),
  ('Bommidi',             'KLM-007'),
  ('Sankarapuram',        'KLM-008'),
  ('Sipcot Phase 2',      'KLM-009'),
  ('Sitheri Hills',       'KLM-010'),
  ('Eachur',              'KLM-011'),
  ('Karunapuram',         'KLM-012'),
  ('Devarkulam',          'KLM-013'),
  ('Thalapalli',          'KLM-014'),
  ('Reddihalli',          'KLM-015')
) AS v(name, code)
JOIN taluks t ON t.code = 'KLM'
ON CONFLICT (village_code) DO NOTHING;

-- ============================================================
-- UTHANGARAI TALUK (code: UTG) — 15 villages
-- Southern Krishnagiri, Cauvery river belt
-- ============================================================
INSERT INTO villages (name, taluk_id, village_code)
SELECT v.name, t.id, v.code FROM (VALUES
  ('Uthangarai',          'UTG-001'),
  ('Kaveripattinam',      'UTG-002'),
  ('Naikaneri',           'UTG-003'),
  ('Sirugusamudram',      'UTG-004'),
  ('Nallampalli',         'UTG-005'),
  ('Thoppur',             'UTG-006'),
  ('Varattanapalli',      'UTG-007'),
  ('Mamballi',            'UTG-008'),
  ('Kamandoddi',          'UTG-009'),
  ('Krishnarayapuram',    'UTG-010'),
  ('Thimmampatti',        'UTG-011'),
  ('Vengampatti',         'UTG-012'),
  ('Periyapalli',         'UTG-013'),
  ('Elathur',             'UTG-014'),
  ('Santhiapuram',        'UTG-015')
) AS v(name, code)
JOIN taluks t ON t.code = 'UTG'
ON CONFLICT (village_code) DO NOTHING;

-- ============================================================
-- Verify counts after running
-- ============================================================
SELECT
  d.name  AS district,
  tk.name AS taluk,
  COUNT(v.id) AS village_count
FROM districts d
JOIN taluks tk ON tk.district_id = d.id
LEFT JOIN villages v ON v.taluk_id = tk.id
WHERE d.code = 'KRG'
GROUP BY d.name, tk.name
ORDER BY tk.name;
