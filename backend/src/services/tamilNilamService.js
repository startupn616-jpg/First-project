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

const LAND_TYPES  = ['Wet', 'Dry', 'Garden', 'Poramboke'];
const WATER_SRC   = ['Canal', 'Borewell', 'Well', 'Rainfed', 'Tank'];
const SOIL_TYPES  = ['Clay Loam', 'Red Loam', 'Alluvial', 'Black Cotton', 'Sandy Loam'];

// Base coordinates per district (approximate centres)
const DISTRICT_COORDS = {
  KRG: { lat: 12.53,  lng: 78.21 },
  CBE: { lat: 11.00,  lng: 76.97 },
  MDU: { lat: 9.92,   lng: 78.12 },
  SLM: { lat: 11.65,  lng: 78.16 },
  TNJ: { lat: 10.79,  lng: 79.14 },
  TRY: { lat: 10.80,  lng: 78.69 },
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

  return {
    surveyNumber: surveyNo,
    subDivision:  subDiv || '',
    fullSurveyNo: subDiv ? `${surveyNo}/${subDiv}` : surveyNo,
    pattaNumber:  pattaNo,
    ownerName:    owner,
    areaAcres:    acres,
    areaHectares: ha,
    landType:     ltype,
    landUse:      'Agricultural',
    waterSource:  water,
    soilType:     soil,
    coordinates:  { lat: cLat, lng: cLng },
    polygonCoords: polygon,
    _mock: true,
  };
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

module.exports = { getSurveyNumbers, getSubDivisions, getSurveyDetails, getPattaDetails };
