const sb = require('../config/supabase');

const getSurveyNumbersHandler = async (req, res) => {
  const { village_id, taluk_id, district_id } = req.query;
  try {
    let locQ = sb.from('villages').select('name, village_code, taluks(name, districts(name))');
    if (village_id)  locQ = locQ.eq('id', village_id);
    else if (taluk_id) locQ = locQ.eq('taluk_id', taluk_id);

    let survQ = sb.from('land_parcels').select('survey_number');
    if (village_id)  survQ = survQ.eq('village_id', village_id);
    if (taluk_id)    survQ = survQ.eq('villages.taluk_id', taluk_id);

    const [{ data: locRows }, { data: survRows }] = await Promise.all([locQ.limit(1), survQ]);
    const loc = locRows?.[0] ?? null;

    if (!loc && village_id)
      return res.status(404).json({ success: false, message: 'Village not found.' });

    const numbers = [...new Set((survRows || []).map((r) => r.survey_number))].sort();

    res.json({
      success: true,
      location: loc ? {
        village_name:  loc.name,
        village_code:  loc.village_code,
        taluk_name:    loc.taluks?.name,
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
  const { village_id, survey_no } = req.query;
  if (!survey_no) return res.status(400).json({ success: false, message: 'survey_no required.' });

  try {
    let q = sb.from('land_parcels').select('sub_division').eq('survey_number', survey_no);
    if (village_id) q = q.eq('village_id', village_id);
    const { data, error } = await q;
    if (error) throw error;

    const divs = [...new Set((data || []).map((r) => r.sub_division).filter(Boolean))].sort();
    res.json({ success: true, data: divs });
  } catch (err) {
    console.error('Sub-divisions error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch sub-divisions.' });
  }
};

const getSurveyDetailsHandler = async (req, res) => {
  const { village_id, taluk_id, district_id, survey_no, sub_div } = req.query;
  if (!survey_no) return res.status(400).json({ success: false, message: 'survey_no required.' });

  try {
    let q = sb
      .from('land_parcels')
      .select(`
        id, survey_number, sub_division, patta_number, owner_name,
        area_acres, area_hectares, land_type, land_use, water_source, soil_type,
        latitude, longitude, polygon_coords, notes,
        villages!inner ( name, taluks!inner ( name, districts!inner ( name ) ) )
      `)
      .eq('survey_number', survey_no)
      .order('sub_division');

    if (village_id)  q = q.eq('village_id', village_id);
    if (taluk_id)    q = q.eq('villages.taluk_id', taluk_id);
    if (district_id) q = q.eq('villages.taluks.district_id', district_id);
    if (sub_div)     q = q.eq('sub_division', sub_div);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data || []);
    const mapped = rows.map((row) => ({
      id:           row.id,
      surveyNumber: row.survey_number,
      subDivision:  row.sub_division || '',
      fullSurveyNo: row.sub_division ? `${row.survey_number}/${row.sub_division}` : row.survey_number,
      pattaNumber:  row.patta_number  || '—',
      ownerName:    row.owner_name    || '—',
      areaAcres:    row.area_acres,
      areaHectares: row.area_hectares,
      landType:     row.land_type     || '—',
      landUse:      row.land_use      || '—',
      waterSource:  row.water_source  || '—',
      soilType:     row.soil_type     || '—',
      notes:        row.notes || '',
      location: {
        district: row.villages?.taluks?.districts?.name,
        taluk:    row.villages?.taluks?.name,
        village:  row.villages?.name,
      },
      coordinates: row.latitude && row.longitude
        ? { lat: parseFloat(row.latitude), lng: parseFloat(row.longitude) } : null,
      polygonCoords: row.polygon_coords || null,
    }));

    const loc = rows[0] ? {
      district: rows[0].villages?.taluks?.districts?.name,
      taluk:    rows[0].villages?.taluks?.name,
      village:  rows[0].villages?.name,
    } : null;

    res.json({ success: true, location: loc, data: mapped });
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

module.exports = { getSurveyNumbersHandler, getSubDivisionsHandler, getSurveyDetailsHandler, getPattaDetailsHandler };
