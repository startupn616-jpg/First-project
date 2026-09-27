// ============================================================
// Tamil Nilam / TNGIS API Integration Service
// ============================================================
// This service proxies all land record & GIS requests to the
// Tamil Nadu TNGIS (Tamil Nadu Geographic Information System)
// powered by NIC (National Informatics Centre).
//
// API Base URLs are configured via .env — update them once
// you receive TNGIS API credentials or access token.
//
// How Tamil Nilam GEO works:
//   1. WMS tiles  → survey boundary lines drawn on satellite map
//   2. WFS query  → polygon + attributes for a specific survey no
//   3. REST API   → Patta / A-Register / FMB data
// ============================================================
const axios = require('axios');

// ── TNGIS endpoints (configure in .env) ──────────────────────
const TNGIS_WFS_URL = process.env.TNGIS_WFS_URL || 'https://tngis.tn.gov.in/geoserver/ows';
const TNGIS_API_URL = process.env.TNGIS_API_URL || 'https://eservices.tn.gov.in/eservicesnew/land';
const TNGIS_API_KEY = process.env.TNGIS_API_KEY || '';
const TNGIS_LAYER   = process.env.TNGIS_LAYER   || 'tngis:survey_cadastral';
const TNGIS_GEOMETRY_FIELD = process.env.TNGIS_GEOMETRY_FIELD || 'geom';

const USE_MOCK = !TNGIS_API_KEY; // auto-fall-back to demo data when no key

// Shared axios instance for TNGIS calls
const tngisClient = axios.create({
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    ...(TNGIS_API_KEY && { Authorization: `Bearer ${TNGIS_API_KEY}` }),
  },
});

// ── 1. Get survey numbers for a village ──────────────────────
/**
 * Returns list of survey numbers available for a given village.
 * Real call: WFS GetFeature filtered by village code.
 */
async function getSurveyNumbers(tnDistrictCode, tnTalukCode, tnVillageCode) {
  if (USE_MOCK) return mockSurveyNumbers(tnVillageCode);

  try {
    // WFS query: get distinct survey_no for the village
    const res = await tngisClient.get(TNGIS_WFS_URL, {
      params: {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetPropertyValue',
        typeNames: TNGIS_LAYER,
        valueReference: 'survey_no',
        CQL_FILTER: `district_code='${tnDistrictCode}' AND taluk_code='${tnTalukCode}' AND village_code='${tnVillageCode}'`,
      },
    });

    // Parse WFS XML response and extract unique survey numbers
    const matches = res.data.match(/<[^>]+>(\d+[A-Z0-9/]*)<\/[^>]+>/g) || [];
    const numbers = [...new Set(matches.map((m) => m.replace(/<[^>]+>/g, '').trim()))].filter(Boolean);
    return numbers.sort((a, b) => parseInt(a) - parseInt(b));
  } catch (err) {
    console.error('WFS survey list error:', err.message, '→ using mock data');
    return mockSurveyNumbers(tnVillageCode);
  }
}

// ── 2. Get sub-divisions for a survey number ─────────────────
async function getSubDivisions(tnDistrictCode, tnTalukCode, tnVillageCode, surveyNo) {
  if (USE_MOCK) return mockSubDivisions(surveyNo);

  try {
    const res = await tngisClient.get(TNGIS_WFS_URL, {
      params: {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetPropertyValue',
        typeNames: TNGIS_LAYER,
        valueReference: 'sub_division',
        CQL_FILTER: `district_code='${tnDistrictCode}' AND taluk_code='${tnTalukCode}' AND village_code='${tnVillageCode}' AND survey_no='${surveyNo}'`,
      },
    });

    const matches = res.data.match(/<[^>]+>([^<]+)<\/[^>]+>/g) || [];
    const divs = [...new Set(matches.map((m) => m.replace(/<[^>]+>/g, '').trim()))].filter(Boolean);
    return divs.sort();
  } catch (err) {
    console.error('WFS sub-div error:', err.message, '→ using mock data');
    return mockSubDivisions(surveyNo);
  }
}

// ── 3. Get full land details + polygon ───────────────────────
/**
 * Returns land details (owner, patta, area) + GeoJSON polygon
 * for a specific survey number / sub-division.
 *
 * Real call: WFS GetFeature → GeoJSON
 */
async function getSurveyDetails(tnDistrictCode, tnTalukCode, tnVillageCode, surveyNo, subDiv) {
  if (USE_MOCK) return mockSurveyDetails(tnDistrictCode, tnTalukCode, tnVillageCode, surveyNo, subDiv);

  try {
    // Build CQL filter
    let cql = `district_code='${tnDistrictCode}' AND taluk_code='${tnTalukCode}' AND village_code='${tnVillageCode}' AND survey_no='${surveyNo}'`;
    if (subDiv) cql += ` AND sub_division='${subDiv}'`;

    const res = await tngisClient.get(TNGIS_WFS_URL, {
      params: {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeNames: TNGIS_LAYER,
        outputFormat: 'application/json',
        CQL_FILTER: cql,
        maxFeatures: 10,
      },
    });

    const features = res.data.features || [];
    if (features.length === 0) {
      throw new Error('No features returned from WFS');
    }

    return features.map(featureToLandDetail);
  } catch (err) {
    console.error('WFS details error:', err.message, '→ using mock data');
    return [mockSurveyDetails(tnDistrictCode, tnTalukCode, tnVillageCode, surveyNo, subDiv)];
  }
}

// ── 4. Get Patta details (REST API) ──────────────────────────
async function getPattaDetails(tnDistrictCode, tnTalukCode, tnVillageCode, pattaNo) {
  if (USE_MOCK) return mockPattaDetails(pattaNo);

  try {
    const res = await tngisClient.post(`${TNGIS_API_URL}/patta`, {
      districtCode: tnDistrictCode,
      talukCode: tnTalukCode,
      villageCode: tnVillageCode,
      pattaNo,
    });
    return res.data;
  } catch (err) {
    console.error('Patta API error:', err.message, '→ using mock data');
    return mockPattaDetails(pattaNo);
  }
}

// ── Helper: WFS GeoJSON feature → land detail object ─────────
function featureToLandDetail(feature) {
  const p = feature.properties || {};
  const geom = feature.geometry;

  // Extract centre coordinate from polygon
  let centre = null;
  if (geom && geom.coordinates && geom.coordinates[0]) {
    const coords = geom.coordinates[0];
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    centre = { lat, lng };
  }

  return {
    surveyNumber:  p.survey_no || '',
    subDivision:   p.sub_division || '',
    fullSurveyNo:  p.sub_division ? `${p.survey_no}/${p.sub_division}` : p.survey_no,
    pattaNumber:   p.patta_no || p.patta_number || '—',
    ownerName:     p.owner_name || p.pattadhar_name || '—',
    areaAcres:     parseFloat(p.area_acres || p.area || 0).toFixed(4),
    areaHectares:  parseFloat(p.area_hectares || (p.area_acres * 0.404686) || 0).toFixed(4),
    landType:      p.land_type || p.type_of_land || '—',
    landUse:       p.land_use || '—',
    waterSource:   p.water_source || p.irrigation_source || '—',
    soilType:      p.soil_type || '—',
    coordinates:   centre,
    polygonCoords: geom?.coordinates?.[0]?.map(([lng, lat]) => ({ lat, lng })) || [],
    rawProperties: p,
  };
}

async function resolveSurveyAtPoint(lat, lng) {
  if (!TNGIS_API_KEY) {
    const error = new Error('TNGIS access is not configured. Add TNGIS_API_KEY, TNGIS_WFS_URL, TNGIS_LAYER, and TNGIS_GEOMETRY_FIELD.');
    error.code = 'TNGIS_NOT_CONFIGURED';
    throw error;
  }

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    throw new Error('Valid latitude and longitude are required.');
  }

  const point = `POINT(${Number(lng)} ${Number(lat)})`;
  const res = await tngisClient.get(TNGIS_WFS_URL, {
    params: {
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeNames: TNGIS_LAYER,
      outputFormat: 'application/json',
      CQL_FILTER: `INTERSECTS(${TNGIS_GEOMETRY_FIELD},${point})`,
      maxFeatures: 1,
    },
  });

  const feature = res.data?.features?.[0];
  if (!feature) {
    const error = new Error('No official TNGIS survey parcel was found at this location.');
    error.code = 'SURVEY_NOT_FOUND';
    throw error;
  }

  return featureToLandDetail(feature);
}

// ── MOCK DATA ─────────────────────────────────────────────────
// Realistic Tamil Nadu land data for development / demo.
// Replace with real TNGIS API once you have credentials.

function mockSurveyNumbers(villageCode) {
  // Generate 15–25 realistic survey numbers
  const seed = villageCode?.split('').reduce((s, c) => s + c.charCodeAt(0), 0) || 42;
  const start = 50 + (seed % 100);
  const count = 15 + (seed % 12);
  return Array.from({ length: count }, (_, i) => String(start + i));
}

function mockSubDivisions(surveyNo) {
  const n = parseInt(surveyNo) || 1;
  if (n % 5 === 0) return [''];                   // some surveys have no sub-division
  if (n % 3 === 0) return ['1A', '1B', '2A', '2B'];
  return ['1A1', '1A2', '1B', '2A1', '2A2', '2B'];
}

const MOCK_OWNERS = [
  'Ramasamy Gounder', 'Murugesan Pillai', 'Selvaraj Nadar',
  'Kannamma Devi', 'Palanisamy Thevar', 'Thangamani Ammal',
  'Krishnamoorthy Iyer', 'Savithri Ammal', 'Velusamy Chettiar',
  'Arumugam Naicker', 'Durairaj Mudaliar', 'Meenakshi Ammal',
];

const MOCK_FATHERS = [
  'Govindan', 'Perumal', 'Chinnasamy', 'Lakshmanan', 'Muthu',
  'Subramani', 'Rangan', 'Natarajan', 'Ponnusamy', 'Veeramani',
];

const LAND_TYPES  = ['Wet', 'Dry', 'Garden', 'Poramboke'];
const WATER_SRC   = ['Canal', 'Borewell', 'Well', 'Rainfed', 'Tank'];
const SOIL_TYPES  = ['Clay Loam', 'Red Loam', 'Alluvial', 'Black Cotton', 'Sandy Loam'];

// Base coordinates per district (approximate centres)
const DISTRICT_COORDS = {
  KRG: { lat: 12.5189, lng: 78.2138 },
  CHE: { lat: 13.0827, lng: 80.2707 },
  CBE: { lat: 11.0168, lng: 76.9558 },
  MDU: { lat: 9.9252,  lng: 78.1198 },
  SLM: { lat: 11.6643, lng: 78.1460 },
  TRY: { lat: 10.7905, lng: 78.7047 },
  VLR: { lat: 12.9165, lng: 79.1325 },
  ERD: { lat: 11.3428, lng: 77.7272 },
  TNV: { lat: 8.7139,  lng: 77.7567 },
  TNJ: { lat: 10.7870, lng: 79.1378 },
  DDL: { lat: 10.3620, lng: 77.9803 },
  KCP: { lat: 12.8342, lng: 79.7036 },
  TPR: { lat: 11.1085, lng: 77.3411 },
  NMK: { lat: 11.2188, lng: 78.1670 },
  DPR: { lat: 12.1278, lng: 78.1564 },
  CDL: { lat: 11.7508, lng: 79.7695 },
  NGP: { lat: 10.7672, lng: 79.8449 },
  TVR: { lat: 10.7719, lng: 79.6351 },
  PDK: { lat: 10.3736, lng: 78.8158 },
  SVG: { lat: 9.8432,  lng: 78.4847 },
  VNR: { lat: 9.5854,  lng: 77.9524 },
  RMD: { lat: 9.3639,  lng: 78.8395 },
  TDK: { lat: 8.7642,  lng: 78.1348 },
  KNK: { lat: 8.0883,  lng: 77.5385 },
  OOT: { lat: 11.4102, lng: 76.6950 },
  ARL: { lat: 11.1427, lng: 79.0747 },
  PBR: { lat: 11.2317, lng: 78.8779 },
  KRR: { lat: 10.9601, lng: 78.0766 },
  TVL: { lat: 13.1435, lng: 79.9088 },
  VLM: { lat: 11.9401, lng: 79.4861 },
  KLK: { lat: 11.7381, lng: 78.9560 },
  CPT: { lat: 12.6918, lng: 79.9773 },
  RNP: { lat: 12.9222, lng: 79.3323 },
  TPT: { lat: 12.4959, lng: 78.5708 },
  MYD: { lat: 11.1018, lng: 79.6442 },
  TKS: { lat: 8.9602,  lng: 77.3151 },
  TVN: { lat: 12.2253, lng: 79.0747 },
  LGD: { lat: 10.8740, lng: 78.8170 },
  MNP: { lat: 10.6078, lng: 78.4253 },
  MSR: { lat: 10.9529, lng: 78.4440 },
  SRG: { lat: 10.8603, lng: 78.6918 },
  THR: { lat: 11.1440, lng: 78.5940 },
  default: { lat: 11.00, lng: 78.50 },
};

function mockSurveyDetails(distCode, talukCode, villageCode, surveyNo, subDiv) {
  const seed   = (parseInt(surveyNo) || 0) + (villageCode?.charCodeAt(0) || 0);
  const owner  = MOCK_OWNERS[seed % MOCK_OWNERS.length];
  const ltype  = LAND_TYPES[seed % LAND_TYPES.length];
  const water  = WATER_SRC[seed % WATER_SRC.length];
  const soil   = SOIL_TYPES[seed % SOIL_TYPES.length];
  const acres  = (0.5 + (seed % 40) * 0.15).toFixed(4);
  const ha     = (parseFloat(acres) * 0.404686).toFixed(4);

  // Spread coords around district centre with small jitter
  const base  = DISTRICT_COORDS[distCode] || DISTRICT_COORDS.default;
  const jLat  = (seed % 200) * 0.0005;
  const jLng  = (seed % 300) * 0.0004;
  const cLat  = parseFloat((base.lat + jLat).toFixed(6));
  const cLng  = parseFloat((base.lng + jLng).toFixed(6));
  const delta = 0.0015; // ~150m plot size

  // Simple rectangular polygon
  const polygon = [
    { lat: cLat + delta, lng: cLng - delta },
    { lat: cLat + delta, lng: cLng + delta },
    { lat: cLat - delta, lng: cLng + delta },
    { lat: cLat - delta, lng: cLng - delta },
  ];

  const pattaNo = `PT-${10000 + seed}`;
  const father = MOCK_FATHERS[seed % MOCK_FATHERS.length];

  return {
    surveyNumber: surveyNo,
    subDivision:  subDiv || '',
    fullSurveyNo: subDiv ? `${surveyNo}/${subDiv}` : surveyNo,
    pattaNumber:  pattaNo,
    ownerName:    owner,
    fatherName:   father,
    ownerRelation: ltype === 'Poramboke' ? '—' : 'Son / Daughter of',
    areaAcres:    acres,
    areaHectares: ha,
    landType:     ltype,
    landUse:      'Agricultural',
    waterSource:  water,
    soilType:     soil,
    taxPerHectare: (120 + (seed % 80)).toFixed(2),
    classification: ltype,
    coordinates:  { lat: cLat, lng: cLng },
    polygonCoords: polygon,
    documents: {
      aRegisterUrl: 'https://eservices.tn.gov.in/eservicesnew/land/areg.html',
      fmbPortalUrl: 'https://eservices.tn.gov.in/eservicesnew/land/chittaCheckNewRuralFMB_en.html',
      pattaUrl: 'https://eservices.tn.gov.in/eservicesnew/land/patta.html',
    },
  };
}

function hashCode(value) {
  return String(value || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function villageCenter(distCode, villageCode) {
  const base = DISTRICT_COORDS[distCode] || DISTRICT_COORDS.default;
  const seed = hashCode(villageCode);
  return {
    lat: Number((base.lat + ((seed % 16) - 8) * 0.0011).toFixed(6)),
    lng: Number((base.lng + (((seed * 7) % 16) - 8) * 0.0013).toFixed(6)),
  };
}

function irregularPlot(lat, lng, width, height, seed) {
  const points = [];
  const vertices = 6;
  for (let i = 0; i < vertices; i += 1) {
    const angle = (Math.PI * 2 * i) / vertices;
    const jitter = 0.72 + ((seed + i * 17) % 11) / 28;
    points.push({
      lat: lat + Math.sin(angle) * height * jitter,
      lng: lng + Math.cos(angle) * width * jitter,
    });
  }
  return points;
}

function plotFromPoint(center, acres, seed) {
  const scale = Math.max(0.00028, Math.min(0.0009, Math.sqrt(Number(acres) || 1) * 0.00032));
  return irregularPlot(center.lat, center.lng, scale * 1.15, scale, seed);
}

const HAMLET_NAMES = [
  'KURAPETTI', 'THALUKKOTHANANJUR', 'MARAVENDRAM', 'SAKANDAPALLI',
  'ANNYATALAPAM', 'BALLAPALLI', 'AGARAM', 'VELLALAPATTI',
];

function jitter(seed, a, b, scale) {
  return (((seed + a * 31 + b * 17) % 11) - 5) * scale;
}

/**
 * GI Viewer-style village cadastral: shared irregular edges, mixed plot sizes,
 * a road gap, and survey numbers — same idea as get_geom GeoJSON overlays.
 */
function mockVillageCadastral(distCode, talukCode, villageCode, villageName) {
  const center = villageCenter(distCode, villageCode);
  const seed0 = hashCode(villageCode);
  const cols = 16;
  const rows = 13;
  const colW = [];
  const rowH = [];
  let totalW = 0;
  let totalH = 0;
  for (let c = 0; c < cols; c += 1) {
    const w = 0.00022 + ((seed0 + c * 13) % 10) * 0.000035;
    colW.push(w);
    totalW += w;
  }
  for (let r = 0; r < rows; r += 1) {
    const h = 0.00018 + ((seed0 + r * 17) % 9) * 0.000032;
    rowH.push(h);
    totalH += h;
  }

  const originLng = center.lng - totalW / 2;
  const originLat = center.lat - totalH / 2;
  const vtx = [];
  let y = originLat;
  for (let r = 0; r <= rows; r += 1) {
    vtx[r] = [];
    let x = originLng;
    for (let c = 0; c <= cols; c += 1) {
      const edge = r === 0 || c === 0 || r === rows || c === cols;
      const jScale = edge ? 0.000006 : 0.00002;
      vtx[r][c] = {
        lat: y + jitter(seed0, r, c, jScale),
        lng: x + jitter(seed0 * 3, c, r, jScale * 1.15),
      };
      if (c < cols) x += colW[c];
    }
    if (r < rows) y += rowH[r];
  }

  const road = new Set();
  let roadRow = 4 + (seed0 % 4);
  for (let c = 0; c < cols; c += 1) {
    road.add(`${roadRow},${c}`);
    if ((seed0 + c) % 4 === 0 && roadRow > 2) roadRow -= 1;
    else if ((seed0 + c) % 5 === 0 && roadRow < rows - 3) roadRow += 1;
  }
  let roadCol = 6 + (seed0 % 5);
  for (let r = 0; r < rows; r += 1) {
    if ((seed0 + r) % 3 !== 0) road.add(`${r},${roadCol}`);
    if ((seed0 + r) % 6 === 0 && roadCol > 3) roadCol -= 1;
  }

  const inVillage = (r, c) => {
    const nx = ((c + 0.5) / cols) * 2 - 1;
    const ny = ((r + 0.5) / rows) * 2 - 1;
    return (nx * nx) / 1.18 + (ny * ny) / 0.82 < 0.98;
  };

  const used = Array.from({ length: rows }, () => Array(cols).fill(false));
  const plots = [];
  let surveyNo = 1 + (seed0 % 90);

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (used[r][c] || road.has(`${r},${c}`) || !inVillage(r, c)) continue;

      let w = 1;
      let h = 1;
      const roll = (seed0 + r * 7 + c * 11) % 11;
      const free = (rr, cc) => (
        rr < rows && cc < cols && !used[rr][cc] && !road.has(`${rr},${cc}`) && inVillage(rr, cc)
      );
      if (roll <= 2 && free(r, c + 1)) w = 2;
      else if (roll === 3 && free(r + 1, c)) h = 2;
      else if (roll === 4 && free(r, c + 1) && free(r + 1, c) && free(r + 1, c + 1)) {
        w = 2;
        h = 2;
      } else if (roll === 5 && free(r, c + 1) && free(r, c + 2)) w = 3;

      for (let dr = 0; dr < h; dr += 1) {
        for (let dc = 0; dc < w; dc += 1) used[r + dr][c + dc] = true;
      }

      const ring = [];
      for (let dc = 0; dc <= w; dc += 1) ring.push(vtx[r][c + dc]);
      for (let dr = 1; dr <= h; dr += 1) ring.push(vtx[r + dr][c + w]);
      for (let dc = w - 1; dc >= 0; dc -= 1) ring.push(vtx[r + h][c + dc]);
      for (let dr = h - 1; dr >= 1; dr -= 1) ring.push(vtx[r + dr][c]);

      const lat = ring.reduce((sum, p) => sum + p.lat, 0) / ring.length;
      const lng = ring.reduce((sum, p) => sum + p.lng, 0) / ring.length;
      const sub = ((seed0 + surveyNo) % 8 === 0) ? String(1 + (surveyNo % 3)) : '';
      const record = mockSurveyDetails(distCode, talukCode, villageCode, String(surveyNo), sub);
      plots.push({
        ...record,
        id: `${villageCode}-${surveyNo}${sub ? `-${sub}` : ''}`,
        hamletName: null,
        location: {
          district: distCode,
          taluk: talukCode,
          village: villageName || villageCode,
        },
        coordinates: { lat, lng },
        polygonCoords: ring,
      });
      surveyNo += 1;
    }
  }
  return plots;
}

function mockPattaDetails(pattaNo) {
  return {
    pattaNumber:  pattaNo,
    ownerName:    'Ramasamy Gounder',
    fatherName:   'Govindan',
    address:      'No.5, Panchayat Street',
    totalLands:   2,
    totalArea:    '3.50 Acres',
    _mock: true,
  };
}

module.exports = {
  getSurveyNumbers,
  getSubDivisions,
  getSurveyDetails,
  getPattaDetails,
  resolveSurveyAtPoint,
  mockVillageCadastral,
  plotFromPoint,
  villageCenter,
};
