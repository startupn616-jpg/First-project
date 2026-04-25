import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Header from '../components/Header';
import { useLanguage } from '../context/LanguageContext';
import { uploadImage, fetchAnalyses, fetchDistricts, fetchTaluks, fetchVillages } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RATING_COLORS = {
  Excellent: 'bg-green-100 text-green-800 border-green-300',
  Good:      'bg-gov-100 text-gov-800 border-gov-300',
  Fair:      'bg-yellow-100 text-yellow-800 border-yellow-300',
  Poor:      'bg-orange-100 text-orange-800 border-orange-300',
  Critical:  'bg-red-100 text-red-800 border-red-300',
};

const HEALTH_BAR = (score) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-400';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-500';
};

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '';

// ─── Drop Zone ───────────────────────────────────────────────────────────────

function DropZone({ file, onFile, t }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const validate = (f) => {
    if (!f) return null;
    if (!['image/jpeg','image/png','image/webp'].includes(f.type)) { alert('Only JPG, PNG, WebP supported.'); return null; }
    if (f.size > 10 * 1024 * 1024) { alert('Max 10 MB.'); return null; }
    return f;
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = validate(e.dataTransfer.files[0]); if (f) onFile(f); }}
      onClick={() => !file && inputRef.current.click()}
      className={`relative border-2 border-dashed rounded-xl transition-colors
        ${file ? 'cursor-default' : 'cursor-pointer hover:border-gov-400 hover:bg-gov-50'}
        ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}
      style={{ minHeight: '160px' }}
    >
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { const f = validate(e.target.files[0]); if (f) onFile(f); }} />
      {file ? (
        <div className="relative">
          <img src={URL.createObjectURL(file)} alt="Preview"
            className="w-full rounded-xl object-cover" style={{ maxHeight: '200px' }} />
          <div className="absolute inset-0 flex flex-col items-end justify-start p-2">
            <button onClick={(e) => { e.stopPropagation(); onFile(null); }}
              className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded-lg font-medium">
              {t('drone.remove')}
            </button>
          </div>
          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <span className="text-4xl sm:text-5xl mb-3">🛸</span>
          <p className="text-gray-600 font-semibold mb-1 text-sm">{t('drone.drop_main')}</p>
          <p className="text-gray-400 text-xs">{t('drone.drop_sub')}</p>
          <p className="text-gray-300 text-xs mt-2">{t('drone.drop_formats')}</p>
        </div>
      )}
    </div>
  );
}

// ─── GPS Section ─────────────────────────────────────────────────────────────

function GpsSection({ lat, lng, altitude, locationLabel, onLatChange, onLngChange, onAltChange, onLabelChange, t }) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const detectGPS = () => {
    if (!navigator.geolocation) { setGpsError(t('drone.gps_denied')); return; }
    setGpsLoading(true); setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLatChange(pos.coords.latitude.toFixed(6));
        onLngChange(pos.coords.longitude.toFixed(6));
        if (pos.coords.altitude != null) onAltChange(pos.coords.altitude.toFixed(1));
        setGpsLoading(false);
      },
      () => { setGpsError(t('drone.gps_denied')); setGpsLoading(false); },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const hasCoords = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">📡 {t('drone.gps_section')}</h3>
        <button type="button" onClick={detectGPS} disabled={gpsLoading}
          className="btn-secondary text-xs flex items-center gap-1.5">
          {gpsLoading
            ? <><span className="w-3 h-3 border-2 border-gov-600 border-t-transparent rounded-full spin" /> {t('drone.detecting_gps')}</>
            : t('drone.use_gps')}
        </button>
      </div>
      {gpsError && <p className="text-xs text-red-500">{gpsError}</p>}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">{t('drone.lat')}</label>
          <input type="number" step="0.000001" value={lat} onChange={(e) => onLatChange(e.target.value)}
            placeholder="11.1271" className="form-input text-xs" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">{t('drone.lng')}</label>
          <input type="number" step="0.000001" value={lng} onChange={(e) => onLngChange(e.target.value)}
            placeholder="78.6569" className="form-input text-xs" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">{t('drone.altitude')}</label>
          <input type="number" step="0.1" value={altitude} onChange={(e) => onAltChange(e.target.value)}
            placeholder="0" className="form-input text-xs" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">{t('drone.loc_label')}</label>
        <input type="text" value={locationLabel} onChange={(e) => onLabelChange(e.target.value)}
          placeholder={t('drone.loc_ph')} className="form-input text-sm" />
      </div>
      {hasCoords && (
        <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '180px' }}>
          <MapContainer center={[parseFloat(lat), parseFloat(lng)]} zoom={14}
            zoomControl={false} attributionControl={false} scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
            <Marker position={[parseFloat(lat), parseFloat(lng)]}>
              <Popup>{locationLabel || t('drone.loc_ph')}</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
      <div className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">{icon && <span>{icon}</span>}{label}</div>
      <div className="font-semibold text-gray-800 text-sm leading-tight">{value || '—'}</div>
    </div>
  );
}

// ─── Language Toggle ─────────────────────────────────────────────────────────

function LangToggle({ lang, toggleLang }) {
  return (
    <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
      <button onClick={() => lang !== 'en' && toggleLang()}
        className={`px-2.5 py-1 rounded-md transition-colors ${lang === 'en' ? 'bg-white shadow text-gov-800' : 'text-gray-500 hover:text-gray-700'}`}>
        EN
      </button>
      <button onClick={() => lang !== 'ta' && toggleLang()}
        className={`px-2.5 py-1 rounded-md transition-colors ${lang === 'ta' ? 'bg-white shadow text-gov-800' : 'text-gray-500 hover:text-gray-700'}`}>
        தமிழ்
      </button>
    </div>
  );
}

// ─── Analysis Result ─────────────────────────────────────────────────────────

function AnalysisResult({ result, lat, lng, lang, t }) {
  if (!result) return null;
  const r = result;
  const ta = lang === 'ta';

  const rating = r.overallRating || r.overall_rating || r.rating || 'Unknown';
  const ratingClass = RATING_COLORS[rating] || 'bg-gray-100 text-gray-700 border-gray-300';
  const healthScore = r.healthScore ?? r.health_score ?? 0;

  const cropName = ta
    ? (r.cropIdentified_ta || r.cropIdentified || r.ai_crop_type || r.cropType || '—')
    : (r.cropIdentified || r.ai_crop_type || r.cropType || 'Unknown Crop');

  const healthText = ta
    ? (r.healthStatus_ta || r.healthStatus || r.ai_land_condition || '')
    : (r.healthStatus || r.ai_land_condition || '');

  const observations = ta
    ? (r.keyObservations_ta?.length ? r.keyObservations_ta : r.keyObservations || [])
    : (r.keyObservations || []);

  const immediateActions = ta
    ? (r.immediateActions_ta?.length ? r.immediateActions_ta : r.immediateActions || [])
    : (r.immediateActions || []);

  const preventiveMeasures = ta
    ? (r.preventiveMeasures_ta?.length ? r.preventiveMeasures_ta : r.preventiveMeasures || [])
    : (r.preventiveMeasures || []);

  const diseases = r.diseasesDetected || r.diseases || [];
  const pests    = r.pestsDetected    || r.pests    || [];
  const structures = r.structuresDetected || r.structures || [];

  const hasCoords = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  return (
    <div className="space-y-4">

      {/* Hero */}
      <div className={`border-2 rounded-xl p-4 sm:p-5 ${ratingClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
              {t('result.overall_rating')}
            </div>
            <div className="text-2xl sm:text-3xl font-bold leading-tight break-words">{cropName}</div>
            {healthText && (
              <p className="text-xs mt-1.5 opacity-80 leading-relaxed">{healthText}</p>
            )}
            <div className={`inline-block mt-2 px-3 py-1 rounded-full border font-bold text-sm ${ratingClass}`}>
              {rating}
            </div>
          </div>
          <div className="text-center shrink-0">
            <div className="text-4xl sm:text-5xl font-black leading-none">{healthScore}</div>
            <div className="text-xs opacity-70 mt-1">{t('result.health_score')}</div>
          </div>
        </div>
      </div>

      {/* Health bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{t('result.health_score')}</span>
          <span className="font-semibold text-gray-700">{healthScore}/100</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${HEALTH_BAR(healthScore)}`}
            style={{ width: `${Math.min(100, Math.max(0, healthScore))}%` }} />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <MetricCard label={t('result.land_type')}    value={r.landType}          icon="🌍" />
        <MetricCard label={t('result.growth_stage')} value={r.growthStage}       icon="🌱" />
        <MetricCard label={t('result.coverage')}     value={r.coveragePercent != null ? `${r.coveragePercent}%` : null} icon="📐" />
        <MetricCard label={t('result.irrigation')}   value={r.irrigationStatus}  icon="💧" />
        <MetricCard label={t('result.soil')}         value={r.soilCondition}     icon="🪱" />
        <MetricCard label={t('result.yield')}        value={r.estimatedYield}    icon="⚖️" />
      </div>

      {/* Diseases & Pests */}
      <div className="gov-card">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">🦠 {t('result.diseases_pests')}</h4>
        {diseases.length > 0 || pests.length > 0 ? (
          <div className="space-y-2">
            {diseases.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('result.diseases')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {diseases.map((d, i) => (
                    <span key={i} className="bg-red-100 text-red-700 border border-red-200 text-xs px-2 py-0.5 rounded-full">{d}</span>
                  ))}
                </div>
              </div>
            )}
            {pests.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('result.pests')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {pests.map((p, i) => (
                    <span key={i} className="bg-orange-100 text-orange-700 border border-orange-200 text-xs px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-green-700 font-medium">{t('result.no_threats')}</p>
        )}
      </div>

      {/* Structures */}
      {structures.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2">🏗️ {t('result.structures')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {structures.map((s, i) => (
              <span key={i} className="bg-gray-100 text-gray-600 border border-gray-300 text-xs px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Observations */}
      {observations.length > 0 && (
        <div className="gov-card">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">🔍 {t('result.observations')}</h4>
          <ul className="space-y-1">
            {observations.map((obs, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="text-gray-400 shrink-0 mt-0.5">•</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Immediate actions */}
      {immediateActions.length > 0 && (
        <div className="border-l-4 border-red-400 bg-red-50 rounded-r-xl p-3 sm:p-4">
          <h4 className="font-semibold text-sm text-red-700 mb-2">{t('result.immediate')}</h4>
          <ul className="space-y-1">
            {immediateActions.map((a, i) => (
              <li key={i} className="text-sm text-red-800 flex gap-2">
                <span className="shrink-0">→</span><span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preventive measures */}
      {preventiveMeasures.length > 0 && (
        <div className="border-l-4 border-green-400 bg-green-50 rounded-r-xl p-3 sm:p-4">
          <h4 className="font-semibold text-sm text-green-700 mb-2">{t('result.preventive')}</h4>
          <ul className="space-y-1">
            {preventiveMeasures.map((m, i) => (
              <li key={i} className="text-sm text-green-800 flex gap-2">
                <span className="shrink-0">✓</span><span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence */}
      {r.cropConfidence != null && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{t('result.confidence')}</span>
            <span className="font-semibold">{r.cropConfidence}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${r.cropConfidence}%` }} />
          </div>
        </div>
      )}

      {/* Source badge */}
      {r.analysisSource && (
        <div className="text-xs text-gray-400 text-right">
          🤖 {r.analysisSource === 'llama-vision' ? 'Llama 4 Vision (Groq)' : r.analysisSource === 'claude-vision' ? 'Claude Vision AI' : r.analysisSource}
        </div>
      )}

      {/* Mini-map */}
      {hasCoords && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 mb-2">{t('result.location')}</h4>
          <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '160px' }}>
            <MapContainer center={[parseFloat(lat), parseFloat(lng)]} zoom={14}
              zoomControl={false} attributionControl={false} scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
              <Marker position={[parseFloat(lat), parseFloat(lng)]}>
                <Popup>{cropName} · {rating}<br />{t('result.health_score')}: {healthScore}/100</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Card ─────────────────────────────────────────────────────────────

function HistoryCard({ item, isSelected, onSelect, t }) {
  const rating = item.ai_raw_result?.overallRating || item.overall_rating || '—';
  const crop   = item.ai_raw_result?.cropIdentified || item.ai_crop_type || '—';
  const ratingClass = RATING_COLORS[rating] || 'bg-gray-100 text-gray-600';

  return (
    <button
      onClick={() => onSelect(item)}
      className={`w-full text-left flex gap-3 p-3 rounded-xl border transition-all
        ${isSelected
          ? 'border-gov-500 bg-gov-50 ring-2 ring-gov-400 shadow-md'
          : 'bg-gray-50 border-gray-200 hover:border-gov-300 hover:shadow-sm'}`}
    >
      {item.image_url ? (
        <img src={item.image_url} alt="thumb"
          className="w-14 h-14 object-cover rounded-lg shrink-0 border border-gray-200" />
      ) : (
        <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center text-2xl shrink-0">🚁</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-800 truncate">{crop}</div>
        <div className={`text-xs font-medium px-1.5 py-0.5 rounded inline-block mt-0.5 ${ratingClass}`}>{rating}</div>
        <div className="text-xs text-gray-400 mt-1">{fmtDate(item.created_at)}</div>
        {item.location_label && (
          <div className="text-xs text-gray-500 truncate mt-0.5">📍 {item.location_label}</div>
        )}
        <div className="text-xs text-gov-600 font-medium mt-1.5">{t('drone.view_full')}</div>
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DroneAnalysis() {
  const { t, lang, toggleLang } = useLanguage();

  // Upload / analysis state
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // GPS
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [altitude, setAltitude] = useState('');
  const [locationLabel, setLocationLabel] = useState('');

  // Location hierarchy
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks]       = useState([]);
  const [villages, setVillages]   = useState([]);
  const [districtId, setDistrictId] = useState('');
  const [talukId, setTalukId]       = useState('');
  const [villageId, setVillageId]   = useState('');

  // History
  const [history, setHistory]           = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [viewingHistory, setViewingHistory]     = useState(null); // the full item

  const resultsRef = useRef(null);

  // Load districts + history on mount
  useEffect(() => {
    fetchDistricts().then((r) => setDistricts(r.data.data || [])).catch(() => {});
    setHistoryLoading(true);
    fetchAnalyses()
      .then((r) => setHistory((r.data.data || []).slice(0, 20)))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    setTaluks([]); setTalukId(''); setVillages([]); setVillageId('');
    if (!districtId) return;
    fetchTaluks(districtId).then((r) => setTaluks(r.data.data || [])).catch(() => {});
  }, [districtId]);

  useEffect(() => {
    setVillages([]); setVillageId('');
    if (!talukId) return;
    fetchVillages(talukId).then((r) => setVillages(r.data.data || [])).catch(() => {});
  }, [talukId]);

  const handleAnalyze = async () => {
    if (!file) { setError('Please select a drone image first.'); return; }
    setError(''); setUploading(true); setProgress(0); setResult(null);
    setViewingHistory(null); setSelectedHistoryId(null);

    const fd = new FormData();
    fd.append('image', file);
    if (lat)           fd.append('latitude', lat);
    if (lng)           fd.append('longitude', lng);
    if (altitude)      fd.append('altitude', altitude);
    if (locationLabel) fd.append('location_label', locationLabel);
    if (villageId)     fd.append('village_id', villageId);

    try {
      const res = await uploadImage(fd, setProgress);
      const data = res.data.analysis || res.data;
      setResult(data);
      // Refresh history
      fetchAnalyses().then((r) => setHistory((r.data.data || []).slice(0, 20))).catch(() => {});
      // Scroll to results on mobile
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectHistory = useCallback((item) => {
    setSelectedHistoryId(item.id);
    setViewingHistory(item);
    setResult(item.ai_raw_result || null);
    setLat(item.latitude?.toString() || '');
    setLng(item.longitude?.toString() || '');
    setLocationLabel(item.location_label || '');
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, []);

  const handleNewAnalysis = () => {
    setViewingHistory(null);
    setSelectedHistoryId(null);
    setResult(null);
    setFile(null);
    setLat(''); setLng(''); setAltitude(''); setLocationLabel('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full">
        <div className="mb-4 sm:mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            🚁 {t('drone.title')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('drone.subtitle')}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">

          {/* ── LEFT: Upload + GPS + Location ── */}
          <div className="space-y-4">

            <div className="gov-card">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">📸 {t('drone.image_section')}</h3>
              <DropZone file={file} onFile={setFile} t={t} />
            </div>

            <div className="gov-card">
              <GpsSection
                lat={lat} lng={lng} altitude={altitude} locationLabel={locationLabel}
                onLatChange={setLat} onLngChange={setLng}
                onAltChange={setAltitude} onLabelChange={setLocationLabel}
                t={t}
              />
            </div>

            <div className="gov-card">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">{t('drone.survey_section')}</h3>
              <div className="space-y-2">
                <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} className="form-input text-sm">
                  <option value="">{t('drone.select_district')}</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={talukId} onChange={(e) => setTalukId(e.target.value)}
                  className="form-input text-sm" disabled={!districtId}>
                  <option value="">{t('drone.select_taluk')}</option>
                  {taluks.map((t2) => <option key={t2.id} value={t2.id}>{t2.name}</option>)}
                </select>
                <select value={villageId} onChange={(e) => setVillageId(e.target.value)}
                  className="form-input text-sm" disabled={!talukId}>
                  <option value="">{t('drone.select_village')}</option>
                  {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleAnalyze} disabled={uploading || !file}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin" />
                  {t('drone.analyzing')} {progress > 0 && progress < 100 ? `${progress}%` : ''}
                </>
              ) : t('drone.analyze_btn')}
            </button>

            {uploading && progress > 0 && (
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gov-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            )}

            {/* Mobile: scroll hint after analyze */}
            {result && !viewingHistory && (
              <div className="lg:hidden text-center text-xs text-gov-600 font-medium py-1">
                {t('drone.scroll_hint')}
              </div>
            )}
          </div>

          {/* ── RIGHT: Results ── */}
          <div ref={resultsRef} className="space-y-4">
            {result ? (
              <div className="gov-card">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2 min-w-0">
                    ✅ <span className="truncate">{t('drone.results_title')}</span>
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <LangToggle lang={lang} toggleLang={toggleLang} />
                    {viewingHistory && (
                      <button onClick={handleNewAnalysis}
                        className="text-xs bg-gov-600 hover:bg-gov-700 text-white px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap">
                        {t('drone.new_capture')}
                      </button>
                    )}
                  </div>
                </div>

                {/* History item header */}
                {viewingHistory && (
                  <div className="flex items-center gap-3 mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    {viewingHistory.image_url && (
                      <img src={viewingHistory.image_url} alt=""
                        className="w-12 h-12 object-cover rounded-lg shrink-0 border border-blue-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-blue-700">{t('drone.viewing_from')}</div>
                      <div className="text-xs text-blue-600">{fmtDate(viewingHistory.created_at)}</div>
                      {viewingHistory.location_label && (
                        <div className="text-xs text-blue-500 truncate">📍 {viewingHistory.location_label}</div>
                      )}
                    </div>
                  </div>
                )}

                <AnalysisResult result={result} lat={lat} lng={lng} lang={lang} t={t} />
              </div>
            ) : (
              <div className="gov-card flex flex-col items-center justify-center py-12 sm:py-16 text-center border-dashed border-2 border-gray-200 bg-gray-50">
                <span className="text-5xl sm:text-6xl mb-4 opacity-50">🚁</span>
                <p className="text-gray-500 font-medium">{t('drone.no_result')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('drone.no_result_sub')}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── HISTORY ── */}
        <div className="mt-6 sm:mt-8">
          <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            🕐 {t('drone.history_title')}
          </h2>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full spin" />
              {t('drone.history_loading')}
            </div>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-sm py-4">{t('drone.no_history')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {history.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  isSelected={selectedHistoryId === item.id}
                  onSelect={handleSelectHistory}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
