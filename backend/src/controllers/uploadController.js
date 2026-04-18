const path = require('path');
const sb   = require('../config/supabase');
const { analyzeImage } = require('../utils/aiAnalysis');

const uploadAndAnalyze = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No image file uploaded.' });

  const { survey_number, village_id, latitude, longitude, altitude, location_label } = req.body;
  const imageUrl  = `/uploads/${req.file.filename}`;
  const imagePath = path.join(__dirname, '../../uploads', req.file.filename);
  const gpsData   = latitude && longitude
    ? { lat: parseFloat(latitude), lng: parseFloat(longitude), altitude: altitude ? parseFloat(altitude) : null }
    : null;

  try {
    const ai = await analyzeImage(imagePath, gpsData);

    const row = {
      survey_number:       survey_number    || null,
      village_id:          village_id       || null,
      image_url:           imageUrl,
      original_filename:   req.file.originalname,
      uploaded_by:         req.user.id,
      ai_crop_type:        ai.cropIdentified || ai.cropType      || null,
      ai_land_condition:   ai.healthStatus   || ai.landCondition || null,
      ai_soil_quality:     ai.soilCondition  || ai.soilQuality   || null,
      ai_irrigation_status: ai.irrigationStatus || null,
      ai_confidence:       ai.cropConfidence ?? ai.confidence    ?? null,
      ai_recommendations:  (ai.immediateActions || ai.recommendations || []).join(' | '),
      ai_raw_result:       ai,
      latitude:            gpsData?.lat      || null,
      longitude:           gpsData?.lng      || null,
      altitude:            gpsData?.altitude || null,
      location_label:      location_label   || null,
    };

    const { data, error } = await sb.from('image_analyses').insert(row).select('id').single();
    if (error) throw error;

    res.json({ success: true, message: 'Image analyzed successfully', analysisId: data.id, imageUrl, analysis: ai });
  } catch (err) {
    console.error('Upload/analysis error:', err.message);
    res.status(500).json({ success: false, message: 'Image analysis failed.' });
  }
};

const getAnalyses = async (req, res) => {
  try {
    const { data, error } = await sb
      .from('image_analyses')
      .select('id, image_url, original_filename, ai_crop_type, ai_land_condition, ai_confidence, ai_raw_result, latitude, longitude, location_label, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Get analyses error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch analyses.' });
  }
};

module.exports = { uploadAndAnalyze, getAnalyses };
