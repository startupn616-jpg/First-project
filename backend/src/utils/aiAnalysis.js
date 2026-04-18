// ============================================================
// AI Image Analysis Utility — AILAND Tamil Nadu
// Uses Claude Vision API (claude-sonnet-4-6) when
// ANTHROPIC_API_KEY is set; falls back to mock data otherwise.
// ============================================================

const fs = require('fs');
const path = require('path');

let Anthropic;
let anthropicClient;
try {
  Anthropic = require('@anthropic-ai/sdk');
  if (process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
} catch (_) {
  Anthropic = null;
}

// ── Tamil Nadu crop profiles (mock / fallback) ────────────────

const CROP_PROFILES = [
  {
    name: 'Paddy (Rice / நெல்)',
    season: 'Kuruvai (Jun–Oct) / Samba (Aug–Feb)',
    healthStatus: 'Crop showing moderate vegetative growth with adequate tillering',
    growthStage: 'Tillering',
    diseases: ['Brown Plant Hopper (BPH) risk moderate'],
    pests: ['Stem borer'],
    recommendations: [
      'Maintain 5–7 cm water level during tillering stage',
      'Check for brown plant hopper (BPH) infestation',
      'Apply urea at 45 days after transplanting',
      'Ensure proper drainage before harvest',
    ],
  },
  {
    name: 'Sugarcane (கரும்பு)',
    season: 'Year-round (Planted Jan–Mar)',
    healthStatus: 'Mature canopy with dense stalk formation visible',
    growthStage: 'Grand Growth',
    diseases: ['Red rot risk low'],
    pests: ['Early shoot borer'],
    recommendations: [
      'Ensure drip irrigation is functioning properly',
      'Check for red rot disease in stalks',
      'Apply potassium fertilizer for juice quality',
      'Schedule harvesting based on brix content',
    ],
  },
  {
    name: 'Tomato (தக்காளி)',
    season: 'Rabi (Oct–Mar)',
    healthStatus: 'Row-planted crop at flowering stage, canopy moderate',
    growthStage: 'Flowering',
    diseases: ['Leaf curl virus (whitefly-transmitted) risk'],
    pests: ['Whitefly', 'Fruit borer'],
    recommendations: [
      'Monitor for leaf curl virus (spread by whitefly)',
      'Stake plants to prevent lodging',
      'Apply calcium spray to prevent blossom end rot',
      'Maintain drip irrigation schedule',
    ],
  },
  {
    name: 'Banana (வாழை)',
    season: 'Year-round',
    healthStatus: 'Large-leaf plantation with good bunch development',
    growthStage: 'Bunch Development',
    diseases: ['Panama wilt risk moderate', 'Sigatoka leaf spot'],
    pests: ['Pseudostem weevil'],
    recommendations: [
      'Remove dried leaves to prevent panama disease',
      'Ensure 3–4 suckers per mat',
      'Apply bunch cover for protection',
      'Check for sigatoka leaf spot',
    ],
  },
  {
    name: 'Cotton (பருத்தி)',
    season: 'Kharif (Jun–Dec)',
    healthStatus: 'Bushy plants at flowering and early boll formation',
    growthStage: 'Boll Formation',
    diseases: ['Alternaria leaf spot risk low'],
    pests: ['Bollworm', 'Aphids'],
    recommendations: [
      'Monitor for bollworm using pheromone traps',
      'Apply recommended pesticide at square stage',
      'Maintain soil moisture at flowering',
      'Harvest when 60% bolls are open',
    ],
  },
  {
    name: 'Groundnut (கடலை)',
    season: 'Kharif (Jun–Oct) / Rabi (Dec–Mar)',
    healthStatus: 'Low-growing crop with pegging stage development',
    growthStage: 'Pegging',
    diseases: ['Tikka leaf spot moderate risk'],
    pests: ['White grub'],
    recommendations: [
      'Ensure good soil aeration for pod development',
      'Apply gypsum at pegging stage (30 days)',
      'Monitor for tikka leaf spot',
      'Harvest when leaves turn yellow',
    ],
  },
  {
    name: 'Coconut (தேங்காய்)',
    season: 'Year-round (perennial)',
    healthStatus: 'Mature palm stand with developing nut bunches',
    growthStage: 'Nut Development',
    diseases: ['Root wilt risk low'],
    pests: ['Rhinoceros beetle', 'Red palm weevil'],
    recommendations: [
      'Apply organic manure in May–June',
      'Monitor for rhinoceros beetle damage',
      'Ensure proper drainage around root zone',
      'Harvest nuts at 12-month maturity',
    ],
  },
  {
    name: 'Maize (மக்காச்சோளம்)',
    season: 'Kharif (Jun–Sep)',
    healthStatus: 'Tall cereal crop at tasselling with good canopy',
    growthStage: 'Tasselling',
    diseases: ['Turcicum blight risk moderate'],
    pests: ['Fall Armyworm (FAW)'],
    recommendations: [
      'Apply top dressing at knee-high stage',
      'Check for fall armyworm (FAW) damage',
      'Ensure proper spacing to avoid nutrient competition',
      'Harvest at moisture content below 20%',
    ],
  },
  {
    name: 'Turmeric (மஞ்சள்)',
    season: 'Kharif (Jun–Jul planting, Harvest Mar–May)',
    healthStatus: 'Dense low canopy with active rhizome development',
    growthStage: 'Rhizome Development',
    diseases: ['Leaf blotch', 'Rhizome rot risk moderate'],
    pests: ['Thrips'],
    recommendations: [
      'Provide shade net for quality rhizome development',
      'Apply mulch to retain soil moisture',
      'Monitor for leaf blotch and rhizome rot',
      'Cure rhizomes properly after harvest',
    ],
  },
  {
    name: 'Tapioca (மரவள்ளி)',
    season: 'Year-round (planted Jun–Jul)',
    healthStatus: 'Branching shrub with active tuberous root formation',
    growthStage: 'Tuber Bulking',
    diseases: ['Mosaic virus risk low'],
    pests: ['Mites (under dry conditions)'],
    recommendations: [
      'Avoid waterlogging to prevent root rot',
      'Apply potassium fertilizer for starch content',
      'Monitor for mites under dry conditions',
      'Harvest at 8–10 months for best starch yield',
    ],
  },
];

// ── Tamil translations for mock data ─────────────────────────

const CROP_TAMIL_NAME = {
  'Paddy (Rice / நெல்)':      'நெல்',
  'Sugarcane (கரும்பு)':       'கரும்பு',
  'Tomato (தக்காளி)':          'தக்காளி',
  'Banana (வாழை)':             'வாழை',
  'Cotton (பருத்தி)':           'பருத்தி',
  'Groundnut (கடலை)':          'கடலை',
  'Coconut (தேங்காய்)':        'தேங்காய்',
  'Maize (மக்காச்சோளம்)':     'மக்காச்சோளம்',
  'Turmeric (மஞ்சள்)':         'மஞ்சள்',
  'Tapioca (மரவள்ளி)':        'மரவள்ளி',
};

const GROWTH_STAGE_TA = {
  'Tillering':        'தூர் விடும் நிலை',
  'Grand Growth':     'முழு வளர்ச்சி நிலை',
  'Flowering':        'பூக்கும் நிலை',
  'Bunch Development':'கொத்து வளர்ச்சி நிலை',
  'Boll Formation':   'காய் உருவாக்க நிலை',
  'Pegging':          'காய் உட்புகும் நிலை',
  'Nut Development':  'தேங்காய் வளர்ச்சி நிலை',
  'Tasselling':       'தாது சிகை நிலை',
  'Rhizome Development': 'கிழங்கு வளர்ச்சி நிலை',
  'Tuber Bulking':    'கிழங்கு உருவாக்கம்',
};

// ── Claude Vision Analysis ────────────────────────────────────

const CLAUDE_PROMPT = `You are an expert agricultural analyst specializing in Tamil Nadu drone/aerial imagery.
Analyze this aerial/drone image and return ONLY a valid JSON object (no markdown, no code fences, no extra text).

Required JSON structure:
{
  "landType": "Agricultural/Barren/Mixed/Urban/Forest/Water body",
  "cropIdentified": "Name of primary crop detected, or null if none",
  "cropConfidence": <integer 0–100>,
  "healthScore": <integer 0–100>,
  "healthStatus": "Detailed text description of crop/land health",
  "growthStage": "Seedling/Vegetative/Tillering/Flowering/Fruiting/Maturity/Harvesting/Fallow/Not Applicable",
  "coveragePercent": <integer 0–100>,
  "irrigationStatus": "Adequate/Needs Attention/Over-irrigated/Drip Detected/Flood Irrigation Detected/No Irrigation Visible",
  "soilCondition": "Description of visible soil condition",
  "diseasesDetected": ["array of visible disease signs or empty array"],
  "pestsDetected": ["array of visible pest indicators or empty array"],
  "structuresDetected": ["buildings", "roads", "water bodies", "irrigation canals", etc. — empty array if none],
  "keyObservations": ["3–5 key factual observations about the image"],
  "immediateActions": ["2–4 specific actionable recommendations for Tamil Nadu farmers"],
  "preventiveMeasures": ["2–3 preventive steps to maintain crop/land health"],
  "overallRating": "Excellent|Good|Fair|Poor|Critical",
  "estimatedYield": "e.g. 2.5–3.0 tonnes/acre, or null if indeterminate",
  "weatherIndicators": "Description of visible season/weather signs (dry, moist, post-rain, etc.)",
  "additionalNotes": "Any other relevant observation",
  "cropIdentified_ta": "தமிழில் பயிரின் பெயர் (null if no crop)",
  "healthStatus_ta": "பயிர் மற்றும் நில ஆரோக்கிய நிலையின் தமிழ் விளக்கம்",
  "keyObservations_ta": ["தமிழில் 3–5 முக்கிய கண்டுபிடிப்புகள்"],
  "immediateActions_ta": ["தமிழில் 2–4 உடனடி செயல் பரிந்துரைகள்"],
  "preventiveMeasures_ta": ["தமிழில் 2–3 தடுப்பு நடவடிக்கைகள்"]
}

Focus on:
- Tamil Nadu specific crops (Paddy, Sugarcane, Banana, Cotton, Groundnut, Coconut, Tomato, Maize, Turmeric, Tapioca, etc.)
- Visible soil colour and texture clues
- Water/irrigation indicators
- Plant canopy density and colour
- Any stress indicators (yellowing, wilting, patchiness)
- Man-made structures and land use patterns`;

/**
 * Calls the real Claude Vision API with the image.
 * @param {string} imagePath - Absolute path to the image file on disk
 * @param {Object} gpsData   - Optional { lat, lng, altitude }
 * @returns {Promise<Object>}
 */
const analyzeWithClaude = async (imagePath, gpsData) => {
  const imageBuffer = await fs.promises.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // Determine media type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mediaTypeMap = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.webp': 'image/webp',
    '.gif':  'image/gif',
  };
  const mediaType = mediaTypeMap[ext] || 'image/jpeg';

  // Optionally append GPS context to the prompt
  let promptText = CLAUDE_PROMPT;
  if (gpsData && (gpsData.lat || gpsData.lng)) {
    promptText += `\n\nGPS context: Latitude ${gpsData.lat || 'N/A'}, Longitude ${gpsData.lng || 'N/A'}`;
    if (gpsData.altitude) promptText += `, Altitude ${gpsData.altitude}m`;
    promptText += '. Use this to refine regional crop identification if helpful.';
  }

  const response = await anthropicClient.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: promptText,
          },
        ],
      },
    ],
  });

  const rawText = response.content[0].text.trim();

  // Strip markdown code fences if Claude wraps the JSON
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(jsonText);

  // Normalise / fill any missing fields to keep downstream code stable
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
    cropIdentified_ta:     parsed.cropIdentified_ta     || null,
    healthStatus_ta:       parsed.healthStatus_ta       || '',
    keyObservations_ta:    Array.isArray(parsed.keyObservations_ta)    ? parsed.keyObservations_ta    : [],
    immediateActions_ta:   Array.isArray(parsed.immediateActions_ta)   ? parsed.immediateActions_ta   : [],
    preventiveMeasures_ta: Array.isArray(parsed.preventiveMeasures_ta) ? parsed.preventiveMeasures_ta : [],
    analysisSource:     'claude-vision',
    analysisTimestamp:  new Date().toISOString(),
    note: 'AI analysis by Claude Vision. Field verification by an officer is recommended.',
  };
};

// ── Mock / fallback analysis ──────────────────────────────────

const analyzeWithMock = async () => {
  // Simulate processing time (500ms–1.2s)
  const delay = 500 + Math.random() * 700;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const crop = CROP_PROFILES[Math.floor(Math.random() * CROP_PROFILES.length)];

  const IRRIGATION_OPTIONS = [
    'Adequate – Moisture levels optimal',
    'Needs Attention – Soil appears dry',
    'Over-irrigated – Reduce water supply',
    'Drip Irrigation Detected',
    'Flood Irrigation Detected',
  ];
  const SOIL_OPTIONS = [
    'High Fertility – Good organic content, well-structured loam',
    'Moderate Fertility – Supplement with balanced fertilizers',
    'Low Fertility – Soil amendment required, add organic matter',
    'Slightly Acidic pH – Apply lime treatment',
    'Good Structure – Well-drained red loam typical of Tamil Nadu',
  ];
  const RATINGS = ['Excellent', 'Good', 'Fair', 'Poor'];

  const healthScore = Math.floor(55 + Math.random() * 40);
  const yieldMin = (1.5 + Math.random() * 1.5).toFixed(1);
  const yieldMax = (parseFloat(yieldMin) + 0.5 + Math.random() * 1.0).toFixed(1);

  return {
    landType:           'Agricultural',
    cropIdentified:     crop.name,
    cropConfidence:     Math.floor(72 + Math.random() * 25),
    healthScore,
    healthStatus:       crop.healthStatus,
    growthStage:        crop.growthStage,
    coveragePercent:    Math.floor(50 + Math.random() * 45),
    irrigationStatus:   IRRIGATION_OPTIONS[Math.floor(Math.random() * IRRIGATION_OPTIONS.length)],
    soilCondition:      SOIL_OPTIONS[Math.floor(Math.random() * SOIL_OPTIONS.length)],
    diseasesDetected:   crop.diseases,
    pestsDetected:      crop.pests,
    structuresDetected: [],
    keyObservations: [
      `${crop.name} detected with ${healthScore}% health index`,
      `Crop is at ${crop.growthStage} stage`,
      'Field boundaries clearly visible from drone altitude',
      'No major structural damage detected',
    ],
    immediateActions:   crop.recommendations.slice(0, 4),
    preventiveMeasures: crop.recommendations.slice(-2),
    overallRating:      RATINGS[Math.floor(Math.random() * RATINGS.length)],
    estimatedYield:     `${yieldMin}–${yieldMax} tonnes/acre`,
    weatherIndicators:  'Dry conditions with moderate sunlight — likely summer season',
    additionalNotes:    `Seasonal profile: ${crop.season}`,
    cropIdentified_ta:     CROP_TAMIL_NAME[crop.name] || crop.name,
    healthStatus_ta:       `${CROP_TAMIL_NAME[crop.name] || crop.name} பயிரில் ${healthScore}% ஆரோக்கிய குறியீட்டுடன் ${GROWTH_STAGE_TA[crop.growthStage] || crop.growthStage} நிலையில் உள்ளது.`,
    keyObservations_ta: [
      `${CROP_TAMIL_NAME[crop.name] || crop.name} ${healthScore}% ஆரோக்கிய குறியீட்டுடன் கண்டறியப்பட்டது`,
      `பயிர் ${GROWTH_STAGE_TA[crop.growthStage] || crop.growthStage} நிலையில் உள்ளது`,
      'வயல் எல்லைகள் ட்ரோன் உயரத்தில் இருந்து தெளிவாக தெரிகின்றன',
      'பெரிய கட்டமைப்பு சேதம் எதுவும் இல்லை',
    ],
    immediateActions_ta: [
      'வயலில் நீர் மட்டத்தை சரியான அளவில் பராமரிக்கவும்',
      'பூச்சி மற்றும் நோய் தாக்குதலை தொடர்ந்து கண்காணிக்கவும்',
      'பரிந்துரைக்கப்பட்ட உரங்களை சரியான நேரத்தில் இடவும்',
      'விளைச்சல் நேரத்தில் சரியான அறுவடை மேற்கொள்ளவும்',
    ],
    preventiveMeasures_ta: [
      'ஆரம்ப கட்டத்திலேயே நோய் அறிகுறிகளை கண்காணிக்கவும்',
      'நோய் எதிர்ப்பு திறன் உள்ள விதை வகைகளை தேர்வு செய்யவும்',
    ],
    analysisSource:     'mock',
    analysisTimestamp:  new Date().toISOString(),
    note: 'Mock AI analysis (ANTHROPIC_API_KEY not set). Field verification is recommended.',
  };
};

// ── Public API ────────────────────────────────────────────────

const analyzeImage = async (imagePath, gpsData) => {
  if (anthropicClient) {
    try {
      console.log('[AI] Running Claude Vision analysis on:', path.basename(imagePath));
      const result = await analyzeWithClaude(imagePath, gpsData);
      console.log('[AI] Claude analysis complete. Rating:', result.overallRating);
      return result;
    } catch (err) {
      console.error('[AI] Claude Vision error — falling back to mock:', err.message);
      // Graceful fallback so the upload still succeeds
      return analyzeWithMock();
    }
  }

  console.log('[AI] ANTHROPIC_API_KEY not set — using mock analysis.');
  return analyzeWithMock();
};

module.exports = { analyzeImage };
