const path = require('path');
const sb = require('../config/supabase');
const { analyzeImage } = require('./aiAnalysis');

const pending = new Map();

const cap = (s, n = 100) => (s || '').substring(0, n) || null;

async function runAnalysisJob(analysisId, imagePath, gpsData) {
  pending.set(analysisId, { status: 'processing', startedAt: Date.now() });

  try {
    const ai = await analyzeImage(imagePath, gpsData);

    const patch = {
      analysis_status: 'completed',
      ai_crop_type: cap(ai.cropIdentified),
      ai_land_condition: cap(ai.healthStatus),
      ai_soil_quality: cap(ai.soilCondition),
      ai_irrigation_status: cap(ai.irrigationStatus),
      ai_confidence: ai.cropConfidence ?? null,
      ai_recommendations: (ai.immediateActions || []).join(' | '),
      ai_raw_result: ai,
    };

    const { error } = await sb.from('image_analyses').update(patch).eq('id', analysisId);
    if (error) throw error;

    pending.set(analysisId, { status: 'completed', result: ai });
    return ai;
  } catch (err) {
    console.error('[AI Queue] Job failed:', analysisId, err.message);
    await sb.from('image_analyses').update({
      analysis_status: 'failed',
      ai_recommendations: err.message?.substring(0, 200),
    }).eq('id', analysisId);
    pending.set(analysisId, { status: 'failed', error: err.message });
    throw err;
  } finally {
    setTimeout(() => pending.delete(analysisId), 60 * 60 * 1000).unref?.();
  }
}

function enqueueAnalysis(analysisId, imagePath, gpsData) {
  setImmediate(() => {
    runAnalysisJob(analysisId, imagePath, gpsData).catch(() => {});
  });
}

function getJobStatus(analysisId) {
  return pending.get(analysisId) || null;
}

module.exports = { enqueueAnalysis, getJobStatus, runAnalysisJob };
