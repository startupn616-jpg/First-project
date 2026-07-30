const path = require('path');
const sb = require('../config/supabase');
const { extractGpsFromImage } = require('../utils/exifGps');
const { resolveSurveyAtPoint } = require('../services/tamilNilamService');
const { enqueueAnalysis, getJobStatus } = require('../utils/analysisQueue');

async function buildAnalysisRow(req, file, body) {
  const imageUrl = `/uploads/${file.filename}`;
  const imagePath = path.join(__dirname, '../../uploads', file.filename);

  const exifGps = await extractGpsFromImage(imagePath);

  let lat = body.latitude ? parseFloat(body.latitude) : null;
  let lng = body.longitude ? parseFloat(body.longitude) : null;
  let altitude = body.altitude ? parseFloat(body.altitude) : null;

  if (exifGps) {
    if (lat == null || Number.isNaN(lat)) lat = exifGps.lat;
    if (lng == null || Number.isNaN(lng)) lng = exifGps.lng;
    if (altitude == null && exifGps.altitude != null) altitude = exifGps.altitude;
  }

  const gpsData = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
    ? { lat, lng, altitude }
    : null;

  const villageId = body.village_id ? parseInt(body.village_id, 10) : null;
  let landLink = null;
  if (gpsData) {
    try {
      const officialSurvey = await resolveSurveyAtPoint(gpsData.lat, gpsData.lng);
      landLink = {
        surveyNumber: officialSurvey.surveyNumber,
        subDivision: officialSurvey.subDivision,
        ownerName: officialSurvey.ownerName,
        pattaNumber: officialSurvey.pattaNumber,
        source: 'tngis',
      };
    } catch (err) {
      if (err.code !== 'TNGIS_NOT_CONFIGURED' && err.code !== 'SURVEY_NOT_FOUND') {
        console.warn('TNGIS survey lookup failed:', err.message);
      }
    }
  }

  const row = {
    survey_number: body.survey_number || landLink?.surveyNumber || null,
    village_id: villageId || null,
    land_parcel_id: null,
    image_url: imageUrl,
    original_filename: file.originalname,
    uploaded_by: req.user.id,
    latitude: gpsData?.lat ?? null,
    longitude: gpsData?.lng ?? null,
    altitude: gpsData?.altitude ?? null,
    location_label: body.location_label || null,
    analysis_status: 'processing',
    ai_raw_result: { exif: exifGps, parcelLink: landLink, source: body.source || 'upload' },
  };

  return { row, imagePath, gpsData, landLink, exifGps };
}

const uploadAndAnalyze = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No image file uploaded.' });

  try {
    const { row, imagePath, gpsData, landLink, exifGps } = await buildAnalysisRow(req, req.file, req.body);

    const { data, error } = await sb.from('image_analyses').insert(row).select('id').single();
    if (error) throw error;

    enqueueAnalysis(data.id, imagePath, gpsData);

    res.status(202).json({
      success: true,
      message: gpsData
        ? 'Image uploaded. AI analysis started (GPS from EXIF or form).'
        : 'Image uploaded without GPS — pin manually on map or re-upload geotagged DJI Fly photos.',
      analysisId: data.id,
      status: 'processing',
      imageUrl: row.image_url,
      gps: gpsData,
      exif: exifGps,
      parcelLink: landLink,
    });
  } catch (err) {
    console.error('Upload/analysis error:', err.message);
    res.status(500).json({ success: false, message: 'Image upload failed.' });
  }
};

const uploadBulk = async (req, res) => {
  const files = req.files || [];
  if (!files.length)
    return res.status(400).json({ success: false, message: 'No images uploaded.' });

  const results = [];
  for (const file of files) {
    try {
      const { row, imagePath, gpsData, landLink, exifGps } = await buildAnalysisRow(req, file, req.body);
      const { data, error } = await sb.from('image_analyses').insert(row).select('id').single();
      if (error) throw error;
      enqueueAnalysis(data.id, imagePath, gpsData);
      results.push({
        analysisId: data.id,
        filename: file.originalname,
        status: 'processing',
        imageUrl: row.image_url,
        gps: gpsData,
        parcelLink: landLink,
        exif: exifGps,
      });
    } catch (err) {
      results.push({ filename: file.originalname, status: 'failed', error: err.message });
    }
  }

  res.status(202).json({
    success: true,
    message: `${results.filter((r) => r.status === 'processing').length} of ${files.length} images queued for AI analysis.`,
    data: results,
  });
};

const getAnalysisById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid analysis id.' });

  try {
    let query = sb.from('image_analyses').select('*').eq('id', id);
    if (req.user.role !== 'admin') query = query.eq('uploaded_by', req.user.id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Analysis not found.' });

    const job = getJobStatus(id);
    const status = data.analysis_status || job?.status || 'completed';
    const analysis = data.ai_raw_result?.cropIdentified != null
      ? data.ai_raw_result
      : (status === 'completed' ? data.ai_raw_result : null);

    res.json({
      success: true,
      data: {
        ...data,
        analysis_status: status,
        analysis,
      },
    });
  } catch (err) {
    console.error('Get analysis error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch analysis.' });
  }
};

const reviewAnalysis = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cropName = String(req.body.crop_name || '').trim();
  const cropNameTamil = String(req.body.crop_name_ta || '').trim();
  const landCondition = String(req.body.land_condition || '').trim();
  const notes = String(req.body.notes || '').trim();

  if (!id) return res.status(400).json({ success: false, message: 'Invalid analysis id.' });
  if (!cropName) {
    return res.status(400).json({ success: false, message: 'Enter a crop or image name before saving the review.' });
  }

  try {
    let query = sb.from('image_analyses').select('*').eq('id', id);
    if (req.user.role !== 'admin') query = query.eq('uploaded_by', req.user.id);
    const { data: existing, error: fetchError } = await query.maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ success: false, message: 'Analysis not found.' });

    const aiResult = {
      ...(existing.ai_raw_result || {}),
      cropIdentified: cropName,
      cropIdentified_ta: cropNameTamil || existing.ai_raw_result?.cropIdentified_ta || null,
      healthStatus: landCondition || existing.ai_raw_result?.healthStatus || '',
      additionalNotes: notes || existing.ai_raw_result?.additionalNotes || '',
      analysisSource: 'manual-review',
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString(),
    };

    const patch = {
      analysis_status: 'completed',
      ai_crop_type: cropName.substring(0, 100),
      ai_land_condition: landCondition ? landCondition.substring(0, 100) : existing.ai_land_condition,
      ai_recommendations: notes ? notes.substring(0, 1000) : existing.ai_recommendations,
      ai_raw_result: aiResult,
    };

    const { data, error } = await sb
      .from('image_analyses')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    res.json({
      success: true,
      message: 'Manual review saved. The image record is now available for Data Entry reference.',
      data,
    });
  } catch (err) {
    console.error('Review analysis error:', err.message);
    res.status(500).json({ success: false, message: 'Could not save the manual review.' });
  }
};

const getAnalyses = async (req, res) => {
  try {
    let query = sb
      .from('image_analyses')
      .select(`
        id, image_url, original_filename, survey_number, village_id, land_parcel_id,
        latitude, longitude, altitude, location_label, analysis_status,
        ai_crop_type, ai_land_condition, ai_confidence, ai_raw_result, created_at
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    if (req.user.role !== 'admin') query = query.eq('uploaded_by', req.user.id);
    const { data, error } = await query;

    if (error) throw error;

    const mapped = (data || []).map((row) => {
      const raw = row.ai_raw_result || {};
      const ai = raw.cropIdentified != null ? raw : raw;
      return {
        ...row,
        crop_type: row.ai_crop_type || ai.cropIdentified,
        overall_rating: ai.overallRating,
        health_score: ai.healthScore,
      };
    });

    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error('Get analyses error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch analyses.' });
  }
};

module.exports = { uploadAndAnalyze, uploadBulk, getAnalysisById, getAnalyses, reviewAnalysis };
