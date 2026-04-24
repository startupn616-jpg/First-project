const fs   = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PROMPT = `You are an expert agricultural analyst for Tamil Nadu, India.
Analyze this farm/field image and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

Required JSON:
{
  "landType": "Agricultural|Barren|Mixed|Urban|Forest|Water body",
  "cropIdentified": "exact crop name you see, or null",
  "cropConfidence": <0-100>,
  "healthScore": <0-100>,
  "healthStatus": "one sentence about crop or land health",
  "growthStage": "Seedling|Vegetative|Tillering|Flowering|Fruiting|Maturity|Harvesting|Fallow|Not Applicable",
  "coveragePercent": <0-100>,
  "irrigationStatus": "Adequate|Needs Attention|Over-irrigated|Drip Detected|Flood Irrigation Detected|No Irrigation Visible",
  "soilCondition": "brief soil description",
  "diseasesDetected": [],
  "pestsDetected": [],
  "structuresDetected": [],
  "keyObservations": ["obs1", "obs2", "obs3"],
  "immediateActions": ["action1", "action2", "action3"],
  "preventiveMeasures": ["measure1", "measure2"],
  "overallRating": "Excellent|Good|Fair|Poor|Critical",
  "estimatedYield": "e.g. 2.0-2.5 tonnes/acre or null",
  "weatherIndicators": "brief season or weather observation",
  "additionalNotes": "any other relevant detail",
  "cropIdentified_ta": "Tamil name of crop or null",
  "healthStatus_ta": "health status in Tamil",
  "immediateActions_ta": ["Tamil action1", "Tamil action2"]
}

Look carefully at the image and identify the exact crop (cabbage, tomato, paddy/rice, sugarcane, banana, cotton, groundnut, coconut, maize, turmeric, tapioca, onion, chilli, brinjal, mango, etc.). Be accurate.`;

const analyzeImage = async (imagePath, gpsData) => {
  const imageBuffer = await fs.promises.readFile(imagePath);
  const base64Data  = imageBuffer.toString('base64');

  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'image/jpeg';

  let promptText = PROMPT;
  if (gpsData?.lat && gpsData?.lng) {
    promptText += `\n\nGPS: Lat ${gpsData.lat}, Lng ${gpsData.lng}. Region is Tamil Nadu, India.`;
  }

  console.log('[AI] Sending to Groq Llama Vision:', path.basename(imagePath));

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 2048,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
        ],
      },
    ],
  });

  const rawText = response.choices[0].message.content.trim();
  console.log('[AI] Groq raw (first 200 chars):', rawText.substring(0, 200));

  // Strip markdown fences, extract {...} block
  let jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start  = jsonText.indexOf('{');
  const end    = jsonText.lastIndexOf('}');
  if (start !== -1 && end > start) jsonText = jsonText.slice(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error('[AI] JSON parse failed. Full response:\n', rawText);
    throw new Error(`Llama returned invalid JSON: ${err.message}`);
  }

  console.log('[AI] Success — Crop:', parsed.cropIdentified, '| Rating:', parsed.overallRating);

  return {
    landType:           parsed.landType           || 'Agricultural',
    cropIdentified:     parsed.cropIdentified      || null,
    cropConfidence:     parsed.cropConfidence      ?? 0,
    healthScore:        parsed.healthScore         ?? 50,
    healthStatus:       parsed.healthStatus        || '',
    growthStage:        parsed.growthStage         || 'Unknown',
    coveragePercent:    parsed.coveragePercent     ?? 0,
    irrigationStatus:   parsed.irrigationStatus    || 'Unknown',
    soilCondition:      parsed.soilCondition       || '',
    diseasesDetected:   Array.isArray(parsed.diseasesDetected)   ? parsed.diseasesDetected   : [],
    pestsDetected:      Array.isArray(parsed.pestsDetected)      ? parsed.pestsDetected      : [],
    structuresDetected: Array.isArray(parsed.structuresDetected) ? parsed.structuresDetected : [],
    keyObservations:    Array.isArray(parsed.keyObservations)    ? parsed.keyObservations    : [],
    immediateActions:   Array.isArray(parsed.immediateActions)   ? parsed.immediateActions   : [],
    preventiveMeasures: Array.isArray(parsed.preventiveMeasures) ? parsed.preventiveMeasures : [],
    overallRating:      parsed.overallRating       || 'Fair',
    estimatedYield:     parsed.estimatedYield      || null,
    weatherIndicators:  parsed.weatherIndicators   || '',
    additionalNotes:    parsed.additionalNotes     || '',
    cropIdentified_ta:    parsed.cropIdentified_ta  || null,
    healthStatus_ta:      parsed.healthStatus_ta    || '',
    immediateActions_ta:  Array.isArray(parsed.immediateActions_ta) ? parsed.immediateActions_ta : [],
    preventiveMeasures_ta: [],
    keyObservations_ta:    [],
    analysisSource:     'llama-vision',
    analysisTimestamp:  new Date().toISOString(),
    note: 'AI analysis by Llama 4 Vision (Groq). Verify findings in the field.',
  };
};

module.exports = { analyzeImage };
