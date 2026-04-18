const sb    = require('../config/supabase');
const axios = require('axios');

const listLandParcels = async (req, res) => {
  const { village_id, district_id, taluk_id } = req.query;
  try {
    let q = sb
      .from('land_parcels')
      .select(`
        id, survey_number, sub_division, patta_number, owner_name,
        area_acres, area_hectares, land_type, land_use, water_source, soil_type,
        latitude, longitude, notes, created_at,
        villages!inner ( name, taluks!inner ( name, districts!inner ( name ) ) )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (village_id)  q = q.eq('village_id', village_id);
    if (taluk_id)    q = q.eq('villages.taluk_id', taluk_id);
    if (district_id) q = q.eq('villages.taluks.district_id', district_id);

    const { data, error } = await q;
    if (error) throw error;

    // Flatten nested join into flat row objects
    const rows = (data || []).map((r) => ({
      ...r,
      village_name:  r.villages?.name,
      taluk_name:    r.villages?.taluks?.name,
      district_name: r.villages?.taluks?.districts?.name,
      villages: undefined,
    }));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List parcels error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch land parcels.' });
  }
};

const createLandParcel = async (req, res) => {
  const {
    village_id, survey_number, sub_division, patta_number, owner_name,
    area_acres, area_hectares, land_type, land_use, water_source, soil_type,
    latitude, longitude, polygon_coords, notes,
  } = req.body;

  if (!village_id || !survey_number)
    return res.status(400).json({ success: false, message: 'village_id and survey_number are required.' });

  try {
    const { data, error } = await sb
      .from('land_parcels')
      .insert({
        village_id,
        survey_number: survey_number.trim(),
        sub_division:  sub_division?.trim()  || '',
        patta_number:  patta_number?.trim()  || null,
        owner_name:    owner_name?.trim()    || null,
        area_acres:    area_acres    || null,
        area_hectares: area_hectares || null,
        land_type:     land_type     || null,
        land_use:      land_use      || 'Agricultural',
        water_source:  water_source?.trim() || null,
        soil_type:     soil_type?.trim()    || null,
        latitude:      latitude      || null,
        longitude:     longitude     || null,
        polygon_coords: polygon_coords ? JSON.stringify(polygon_coords) : null,
        notes:         notes?.trim() || null,
        added_by:      req.user.id,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505')
        return res.status(409).json({ success: false, message: 'Duplicate entry for this survey number / sub-division.' });
      throw error;
    }

    res.status(201).json({ success: true, message: 'Land parcel added.', id: data.id });
  } catch (err) {
    console.error('Create parcel error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create land parcel.' });
  }
};

const updateLandParcel = async (req, res) => {
  const { id } = req.params;
  const {
    survey_number, sub_division, patta_number, owner_name,
    area_acres, area_hectares, land_type, land_use, water_source, soil_type,
    latitude, longitude, polygon_coords, notes,
  } = req.body;

  const patch = {};
  if (survey_number  != null) patch.survey_number  = survey_number;
  if (sub_division   != null) patch.sub_division   = sub_division;
  if (patta_number   != null) patch.patta_number   = patta_number;
  if (owner_name     != null) patch.owner_name     = owner_name;
  if (area_acres     != null) patch.area_acres     = area_acres;
  if (area_hectares  != null) patch.area_hectares  = area_hectares;
  if (land_type      != null) patch.land_type      = land_type;
  if (land_use       != null) patch.land_use       = land_use;
  if (water_source   != null) patch.water_source   = water_source;
  if (soil_type      != null) patch.soil_type      = soil_type;
  if (latitude       != null) patch.latitude       = latitude;
  if (longitude      != null) patch.longitude      = longitude;
  if (polygon_coords != null) patch.polygon_coords = JSON.stringify(polygon_coords);
  if (notes          != null) patch.notes          = notes;
  patch.updated_at = new Date().toISOString();

  try {
    const { data, error } = await sb
      .from('land_parcels')
      .update(patch)
      .eq('id', id)
      .select('id')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Record not found.' });

    res.json({ success: true, message: 'Land parcel updated.' });
  } catch (err) {
    console.error('Update parcel error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update land parcel.' });
  }
};

const deleteLandParcel = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await sb.from('land_parcels').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Land parcel deleted.' });
  } catch (err) {
    console.error('Delete parcel error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete land parcel.' });
  }
};

const autoFetchFromTamilNilam = async (req, res) => {
  const { district_name, taluk_name, village_name } = req.query;
  try {
    const nominatimRes = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: `${village_name}, ${taluk_name}, ${district_name}, Tamil Nadu, India`,
        format: 'json', limit: 1,
      },
      headers: { 'User-Agent': 'AILAND-TN-GovApp/1.0' },
      timeout: 8000,
    });

    const coords = nominatimRes.data?.[0]
      ? { lat: parseFloat(nominatimRes.data[0].lat), lng: parseFloat(nominatimRes.data[0].lon) }
      : null;

    res.json({
      success: true,
      prefilled: {
        latitude: coords?.lat ?? null, longitude: coords?.lng ?? null,
        land_use: 'Agricultural', land_type: 'Dry',
        water_source: 'Borewell',  soil_type: 'Red Loam',
      },
      message: coords
        ? `GPS coordinates found for ${village_name} via OpenStreetMap. Verify before saving.`
        : 'Could not geocode the village. Please enter GPS coordinates manually.',
    });
  } catch (err) {
    console.error('Auto-fetch error:', err.message);
    res.json({ success: false, prefilled: null, message: 'Auto-fetch failed. Please enter details manually.' });
  }
};

module.exports = { listLandParcels, createLandParcel, updateLandParcel, deleteLandParcel, autoFetchFromTamilNilam };
