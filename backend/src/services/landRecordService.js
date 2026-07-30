// ============================================================
// LandRecordService — abstraction over Supabase + TNGIS mock
// Swap implementation when official TNGIS credentials are available.
// ============================================================
const sb = require('../config/supabase');
const tngis = require('./tamilNilamService');

const MOCK_CROPS = [
  { cropType: 'Rice (Paddy)', cropId: 58, cropExtent: 0.145, irrigationSource: 'Canal',
    expectedSownDate: '2025-12-01', expectedHarvestDate: '2026-02-28' },
  { cropType: 'Groundnut', cropId: 12, cropExtent: 0.22, irrigationSource: 'Rainfed',
    expectedSownDate: '2025-06-15', expectedHarvestDate: '2025-09-30' },
  { cropType: 'Sugarcane', cropId: 41, cropExtent: 0.8, irrigationSource: 'Drip',
    expectedSownDate: '2025-01-10', expectedHarvestDate: '2026-01-05' },
];

async function resolveLocationCodes(villageId, talukId, districtId) {
  if (!villageId) return { distCode: 'KRG', talukCode: 'KRG-C', villageCode: 'V001' };

  const { data: village } = await sb
    .from('villages')
    .select('village_code, taluks(code, districts(code))')
    .eq('id', villageId)
    .maybeSingle();

  if (!village) return { distCode: 'KRG', talukCode: 'KRG-C', villageCode: String(villageId) };

  return {
    distCode: village.taluks?.districts?.code || 'KRG',
    talukCode: village.taluks?.code || 'KRG-C',
    villageCode: village.village_code || String(villageId),
  };
}

function enrichWithCropInfo(record, seed = 0) {
  const crop = MOCK_CROPS[seed % MOCK_CROPS.length];
  return {
    ...record,
    ownerRelation: 'Son of',
    poramboke: record.landType === 'Poramboke',
    taxPerHectare: (120 + (seed % 80)).toFixed(2),
    primarySoilType: record.soilType || 'Red Loam',
    secondarySoilType: 'Sandy Loam',
    cropInfo: crop,
    documents: {
      fmbSketchUrl: null,
      pattaUrl: null,
      aRegisterUrl: 'https://eservices.tn.gov.in/eservicesnew/land/areg.html',
      fmbPortalUrl: 'https://eservices.tn.gov.in/eservicesnew/land/chittaCheckNewRuralFMB_en.html',
    },
  };
}

function mapDbRow(row) {
  const base = {
    id: row.id,
    surveyNumber: row.survey_number,
    subDivision: row.sub_division || '',
    fullSurveyNo: row.sub_division ? `${row.survey_number}/${row.sub_division}` : row.survey_number,
    pattaNumber: row.patta_number || '—',
    ownerName: row.owner_name || '—',
    areaAcres: row.area_acres,
    areaHectares: row.area_hectares,
    landType: row.land_type || '—',
    landUse: row.land_use || '—',
    waterSource: row.water_source || '—',
    soilType: row.soil_type || '—',
    notes: row.notes || '',
    location: {
      district: row.villages?.taluks?.districts?.name,
      taluk: row.villages?.taluks?.name,
      village: row.villages?.name,
    },
    coordinates: row.latitude && row.longitude
      ? { lat: parseFloat(row.latitude), lng: parseFloat(row.longitude) }
      : null,
    polygonCoords: row.polygon_coords || null,
  };
  return enrichWithCropInfo(base, row.id || 0);
}

async function getSurveyNumbers({ village_id, taluk_id, district_id }) {
  let survQ = sb.from('land_parcels').select('survey_number');
  if (village_id) survQ = survQ.eq('village_id', village_id);

  const { data: survRows } = await survQ;
  let numbers = [...new Set((survRows || []).map((r) => r.survey_number))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );

  let usingMockData = false;
  if (numbers.length === 0 && village_id) {
    const codes = await resolveLocationCodes(village_id, taluk_id, district_id);
    numbers = await tngis.getSurveyNumbers(codes.distCode, codes.talukCode, codes.villageCode);
    usingMockData = true;
  }

  return { numbers, usingMockData };
}

async function getSubDivisions({ village_id, taluk_id, district_id, survey_no }) {
  let q = sb.from('land_parcels').select('sub_division').eq('survey_number', survey_no);
  if (village_id) q = q.eq('village_id', village_id);
  const { data } = await q;

  let divs = [...new Set((data || []).map((r) => r.sub_division).filter(Boolean))].sort();
  let usingMockData = false;

  if (divs.length === 0 && survey_no) {
    const codes = await resolveLocationCodes(village_id, taluk_id, district_id);
    divs = await tngis.getSubDivisions(codes.distCode, codes.talukCode, codes.villageCode, survey_no);
    usingMockData = true;
  }

  return { divs, usingMockData };
}

async function getSurveyDetails({ village_id, taluk_id, district_id, survey_no, sub_div }) {
  let q = sb
    .from('land_parcels')
    .select(`
      id, survey_number, sub_division, patta_number, owner_name,
      area_acres, area_hectares, land_type, land_use, water_source, soil_type,
      latitude, longitude, polygon_coords, notes,
      villages!inner ( name, taluks!inner ( name, districts!inner ( name, code ) ) )
    `)
    .eq('survey_number', survey_no)
    .order('sub_division');

  if (village_id) q = q.eq('village_id', village_id);
  if (sub_div) q = q.eq('sub_division', sub_div);

  const { data, error } = await q;
  if (error) throw error;

  if (data?.length) {
    return { records: data.map(mapDbRow), usingMockData: false };
  }

  const codes = await resolveLocationCodes(village_id, taluk_id, district_id);
  const mockList = await tngis.getSurveyDetails(
    codes.distCode, codes.talukCode, codes.villageCode, survey_no, sub_div
  );
  const records = (Array.isArray(mockList) ? mockList : [mockList]).map((m, i) =>
    enrichWithCropInfo({
      ...m,
      location: {
        district: codes.distCode,
        taluk: codes.talukCode,
        village: codes.villageCode,
      },
    }, i)
  );

  return { records, usingMockData: true };
}

module.exports = {
  getSurveyNumbers,
  getSubDivisions,
  getSurveyDetails,
  resolveLocationCodes,
};
