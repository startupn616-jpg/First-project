const sb = require('../config/supabase');
const landRecord = require('../services/landRecordService');

const getSurveyNumbersHandler = async (req, res) => {
  const { village_id, taluk_id, district_id } = req.query;
  try {
    let locQ = sb.from('villages').select('name, village_code, taluks(name, districts(name))');
    if (village_id) locQ = locQ.eq('id', village_id);
    else if (taluk_id) locQ = locQ.eq('taluk_id', taluk_id);

    const { data: locRows } = await locQ.limit(1);
    const loc = locRows?.[0] ?? null;

    if (!loc && village_id)
      return res.status(404).json({ success: false, message: 'Village not found.' });

    const { numbers, usingMockData } = await landRecord.getSurveyNumbers({
      village_id, taluk_id, district_id,
    });

    res.json({
      success: true,
      _usingMockData: usingMockData,
      location: loc ? {
        village_name: loc.name,
        village_code: loc.village_code,
        taluk_name: loc.taluks?.name,
        district_name: loc.taluks?.districts?.name,
      } : null,
      data: numbers,
    });
  } catch (err) {
    console.error('Survey numbers error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch survey numbers.' });
  }
};

const getSubDivisionsHandler = async (req, res) => {
  const { village_id, taluk_id, district_id, survey_no } = req.query;
  if (!survey_no) return res.status(400).json({ success: false, message: 'survey_no required.' });

  try {
    const { divs, usingMockData } = await landRecord.getSubDivisions({
      village_id, taluk_id, district_id, survey_no,
    });
    res.json({ success: true, _usingMockData: usingMockData, data: divs });
  } catch (err) {
    console.error('Sub-divisions error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch sub-divisions.' });
  }
};

const getSurveyDetailsHandler = async (req, res) => {
  const { village_id, taluk_id, district_id, survey_no, sub_div } = req.query;
  if (!survey_no) return res.status(400).json({ success: false, message: 'survey_no required.' });

  try {
    const { records, usingMockData } = await landRecord.getSurveyDetails({
      village_id, taluk_id, district_id, survey_no, sub_div,
    });

    const loc = records[0]?.location || null;

    res.json({
      success: true,
      _usingMockData: usingMockData,
      location: loc ? {
        district: loc.district,
        taluk: loc.taluk,
        village: loc.village,
      } : null,
      data: records,
    });
  } catch (err) {
    console.error('Survey details error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch land details.' });
  }
};

const getPattaDetailsHandler = async (req, res) => {
  const { village_id, patta_no } = req.query;
  if (!patta_no) return res.status(400).json({ success: false, message: 'patta_no required.' });

  try {
    let q = sb
      .from('land_parcels')
      .select('*, villages(name, taluks(name, districts(name)))')
      .eq('patta_number', patta_no)
      .limit(10);
    if (village_id) q = q.eq('village_id', village_id);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Patta details error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch patta details.' });
  }
};

const resolveSurveyAtPointHandler = async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ success: false, message: 'Valid lat and lng are required.' });
  }

  try {
    const record = await require('../services/tamilNilamService').resolveSurveyAtPoint(lat, lng);
    res.json({ success: true, source: 'tngis', data: record });
  } catch (err) {
    if (err.code === 'TNGIS_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, code: err.code, message: err.message });
    }
    if (err.code === 'SURVEY_NOT_FOUND') {
      return res.status(404).json({ success: false, code: err.code, message: err.message });
    }
    console.error('Survey point lookup error:', err.message);
    res.status(502).json({ success: false, message: 'TNGIS survey lookup failed.' });
  }
};

module.exports = {
  getSurveyNumbersHandler,
  getSubDivisionsHandler,
  getSurveyDetailsHandler,
  getPattaDetailsHandler,
  resolveSurveyAtPointHandler,
};
