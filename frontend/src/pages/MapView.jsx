import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapContainer, TileLayer, WMSTileLayer,
  Marker, Popup, Polygon, ZoomControl, Circle, Polyline, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Header from '../components/Header';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchDistricts, fetchTaluks, fetchVillages,
  fetchSurveyNumbers, fetchSurveyDetails,
  startDroneSession, updateDronePosition, getActiveDrones,
  stopDroneSession, fetchAnalyses,
} from '../services/api';

const DISTRICT_CENTERS = {
  KRG: [12.5189, 78.2138], CHE: [13.0827, 80.2707], CBE: [11.0168, 76.9558],
  MDU: [9.9252,  78.1198], SLM: [11.6643, 78.1460], TRY: [10.7905, 78.7047],
  VLR: [12.9165, 79.1325], ERD: [11.3428, 77.7272], TNV: [8.7139,  77.7567],
  TNJ: [10.7870, 79.1378], DDL: [10.3620, 77.9803], KCP: [12.8342, 79.7036],
  TPR: [11.1085, 77.3411], NMK: [11.2188, 78.1670], DPR: [12.1278, 78.1564],
  CDL: [11.7508, 79.7695], NGP: [10.7672, 79.8449], TVR: [10.7719, 79.6351],
  PDK: [10.3736, 78.8158], SVG: [9.8432,  78.4847], VNR: [9.5854,  77.9524],
  RMD: [9.3639,  78.8395], TDK: [8.7642,  78.1348], KNK: [8.0883,  77.5385],
  OOT: [11.4102, 76.6950], ARL: [11.1427, 79.0747], PBR: [11.2317, 78.8779],
  KRR: [10.9601, 78.0766], TVL: [13.1435, 79.9088], VLM: [11.9401, 79.4861],
  KLK: [11.7381, 78.9560], CPT: [12.6918, 79.9773], RNP: [12.9222, 79.3323],
  TPT: [12.4959, 78.5708], MYD: [11.1018, 79.6442], TKS: [8.9602,  77.3151],
  TVN: [12.2253, 79.0747],
};

const TALUK_CENTERS = {
  'KRG-C': [12.5189, 78.2138], HSR: [12.7426, 77.8253], SLG: [12.6500, 77.9400],
  BRG: [12.4860, 78.0780],     PCH: [12.3650, 78.0050], VPN: [12.5990, 78.2170],
  KLM: [12.6260, 77.9780],     UTG: [12.2880, 78.3700],
  'CBE-N': [11.0500, 76.9800], 'CBE-S': [10.9401, 76.9420], PLH: [10.6514, 76.9613],
  MTP: [11.2985, 76.9354],     'MDU-N': [9.9600, 78.1300], 'MDU-S': [9.8900, 78.1100],
  'SLM-C': [11.6643, 78.1460], 'TRY-C': [10.7905, 78.7047], 'TNJ-C': [10.7870, 79.1378],
  KBK: [10.9610, 79.3788],     'TNV-C': [8.7139, 77.7567],
};

const droneIcon = L.divIcon({
  html: '<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🚁</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  className: '',
});

const PIN_COLOR = (rating) => {
  if (!rating) return '#6b7280';
  const r = rating.toLowerCase();
  if (r === 'excellent' || r === 'good') return '#16a34a';
  if (r === 'fair') return '#ca8a04';
  return '#dc2626';
};

const WMS_URL   = import.meta.env.VITE_TNGIS_WMS_URL;
const WMS_LAYER = import.meta.env.VITE_TNGIS_WMS_LAYER || 'tngis:survey_cadastral';

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 16, { animate: true, duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

export default function MapView() {
  const { t } = useLanguage();

  const [lands, setLands]               = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [gpsError, setGpsError]         = useState('');
  const [flyTarget, setFlyTarget]       = useState(null);
  const [flyZoom, setFlyZoom]           = useState(16);
  const [mapLoading, setMapLoading]     = useState(false);
  const [showWMS, setShowWMS]           = useState(!!WMS_URL);

  const [districts, setDistricts]     = useState([]);
  const [taluks, setTaluks]           = useState([]);
  const [villages, setVillages]       = useState([]);
  const [surveyNums, setSurveyNums]   = useState([]);
  const [districtId, setDistrictId]   = useState('');
  const [talukId, setTalukId]         = useState('');
  const [villageId, setVillageId]     = useState('');
  const [surveyNo, setSurveyNo]       = useState('');
  const [loadingSurveys, setLoadingSurveys] = useState(false);

  const [trackCopied, setTrackCopied]          = useState(false);
  const [sessionName, setSessionName]         = useState('');
  const [activeSession, setActiveSession]     = useState(null);
  const [dronePos, setDronePos]               = useState(null);
  const [droneTrail, setDroneTrail]           = useState([]);
  const [droneLat, setDroneLat]               = useState('');
  const [droneLng, setDroneLng]               = useState('');
  const [droneAlt, setDroneAlt]               = useState('');
  const [droneError, setDroneError]           = useState('');
  const [droneLoading, setDroneLoading]       = useState(false);
  const [autoGps, setAutoGps]                 = useState(false);
  const pollRef  = useRef(null);
  const watchRef = useRef(null);

  const [analysisPins, setAnalysisPins] = useState([]);

  const TN_CENTER = [10.9094, 78.6574];

  useEffect(() => {
    fetchDistricts().then((r) => setDistricts(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchAnalyses()
      .then((r) => {
        const items = r.data.data || r.data || [];
        setAnalysisPins(items.filter((a) => a.latitude != null && a.longitude != null));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTaluks([]); setTalukId(''); setVillages([]); setVillageId('');
    setSurveyNums([]); setSurveyNo('');
    if (!districtId) return;
    fetchTaluks(districtId).then((r) => setTaluks(r.data.data || [])).catch(() => {});
    const dist = districts.find((d) => String(d.id) === String(districtId));
    if (dist?.code && DISTRICT_CENTERS[dist.code]) {
      setFlyTarget(DISTRICT_CENTERS[dist.code]);
      setFlyZoom(11);
    }
  }, [districtId]);

  useEffect(() => {
    setVillages([]); setVillageId(''); setSurveyNums([]); setSurveyNo('');
    if (!talukId) return;
    fetchVillages(talukId).then((r) => setVillages(r.data.data || [])).catch(() => {});
    const taluk = taluks.find((t) => String(t.id) === String(talukId));
    if (taluk?.code && TALUK_CENTERS[taluk.code]) {
      setFlyTarget(TALUK_CENTERS[taluk.code]);
      setFlyZoom(13);
    }
  }, [talukId]);

  useEffect(() => {
    setSurveyNums([]); setSurveyNo('');
    if (!villageId) return;
    setLoadingSurveys(true);
    fetchSurveyNumbers({ village_id: villageId, taluk_id: talukId, district_id: districtId })
      .then((r) => setSurveyNums(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingSurveys(false));
  }, [villageId]);

  const pollDrone = useCallback(async () => {
    if (!activeSession) return;
    try {
      const res = await getActiveDrones();
      const sessions = res.data.data || [];
      const current = sessions.find((s) => s.sessionId === activeSession.id);
      const pos = current?.latestPosition;
      if (pos?.lat != null && pos?.lng != null) {
        const pt = [pos.lat, pos.lng];
        setDronePos(pt);
        setDroneTrail((prev) => [...prev.slice(-49), pt]);
      }
    } catch { /* silent */ }
  }, [activeSession]);

  useEffect(() => {
    if (activeSession) {
      pollRef.current = setInterval(pollDrone, 5000);
      pollDrone();
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [activeSession, pollDrone]);

  const handleStartSession = async () => {
    if (!sessionName.trim()) { setDroneError(t('map.session_ph')); return; }
    setDroneLoading(true); setDroneError('');
    try {
      const res = await startDroneSession(sessionName.trim());
      setActiveSession({ id: res.data.sessionId, name: res.data.name });
      setDroneTrail([]); setDronePos(null);
    } catch (e) {
      setDroneError(e.response?.data?.message || 'Failed to start session.');
    } finally {
      setDroneLoading(false);
    }
  };

  const handleSendPosition = async () => {
    if (!droneLat || !droneLng) { setDroneError('Enter Lat & Lng.'); return; }
    setDroneError('');
    try {
      await updateDronePosition({
        sessionId: activeSession.id,
        lat: parseFloat(droneLat),
        lng: parseFloat(droneLng),
        altitude: droneAlt ? parseFloat(droneAlt) : undefined,
      });
      const pt = [parseFloat(droneLat), parseFloat(droneLng)];
      setDronePos(pt);
      setDroneTrail((prev) => [...prev.slice(-49), pt]);
      setFlyTarget(pt);
      setFlyZoom(16);
    } catch (e) {
      setDroneError(e.response?.data?.message || 'Failed to send position.');
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    stopAutoGps();
    try {
      await stopDroneSession(activeSession.id);
    } catch { /* silent */ } finally {
      setActiveSession(null); setDronePos(null); setDroneTrail([]);
      clearInterval(pollRef.current);
    }
  };

  const startAutoGps = () => {
    if (!navigator.geolocation || !activeSession) return;
    setDroneError('');
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const alt = pos.coords.altitude;
        setDroneLat(lat.toFixed(6));
        setDroneLng(lng.toFixed(6));
        if (alt != null) setDroneAlt(alt.toFixed(1));
        try {
          await updateDronePosition({ sessionId: activeSession.id, lat, lng, altitude: alt ?? undefined });
          const pt = [lat, lng];
          setDronePos(pt);
          setDroneTrail((prev) => [...prev.slice(-99), pt]);
          setFlyTarget(pt);
          setFlyZoom(16);
        } catch { /* silent */ }
      },
      () => setDroneError(t('drone.gps_denied')),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
    setAutoGps(true);
  };

  const stopAutoGps = () => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setAutoGps(false);
  };

  useEffect(() => () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); }, []);

  const loadLands = async () => {
    if (!villageId && !surveyNo) return;
    setMapLoading(true);
    try {
      const res = await fetchSurveyDetails({
        village_id: villageId || undefined,
        taluk_id: talukId || undefined,
        district_id: districtId || undefined,
        survey_no: surveyNo || undefined,
      });
      setLands(res.data.data || []);
      if (res.data.data?.length > 0 && res.data.data[0].coordinates) {
        const c = res.data.data[0].coordinates;
        setFlyTarget([c.lat, c.lng]);
        setFlyZoom(17);
      }
    } catch { }
    setMapLoading(false);
  };

  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError(t('map.gps_err')); return; }
    setGpsLoading(true); setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTarget([loc.lat, loc.lng]);
        setFlyZoom(17);
        setGpsLoading(false);
      },
      () => { setGpsError(t('map.gps_err')); setGpsLoading(false); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [t]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-5 flex-1 w-full">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">🗺️ {t('map.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('map.subtitle')}</p>
        </div>

        {/* Main layout — map first on mobile, sidebars wrap below */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_240px] gap-4">

          {/* ── Left: GPS + Survey + Layers (below map on mobile) ── */}
          <div className="order-2 lg:order-1 space-y-3">

            {/* GPS */}
            <div className="gov-card">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">{t('map.gps_section')}</h3>
              <button onClick={detectGPS} disabled={gpsLoading}
                className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                {gpsLoading
                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full spin" /> {t('map.detecting')}</>
                  : t('map.detect_gps')}
              </button>
              {gpsError && <p className="text-xs text-red-500 mt-2">{gpsError}</p>}
              {userLocation && (
                <div className="mt-2 text-xs text-gov-700 bg-gov-50 rounded p-2">
                  {t('map.gps_ok')}<br />
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </div>
              )}
            </div>

            {/* Survey search */}
            <div className="gov-card">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">{t('map.survey_section')}</h3>
              <div className="space-y-2">
                <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} className="form-input text-xs">
                  <option value="">{t('drone.select_district')}</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={talukId} onChange={(e) => setTalukId(e.target.value)} className="form-input text-xs" disabled={!districtId}>
                  <option value="">{t('drone.select_taluk')}</option>
                  {taluks.map((tk) => <option key={tk.id} value={tk.id}>{tk.name}</option>)}
                </select>
                <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className="form-input text-xs" disabled={!talukId}>
                  <option value="">{t('drone.select_village')}</option>
                  {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <select
                  value={surveyNo}
                  onChange={(e) => setSurveyNo(e.target.value)}
                  className="form-input text-xs"
                  disabled={!villageId || loadingSurveys}
                >
                  <option value="">{loadingSurveys ? t('map.loading_map') : 'Survey Number'}</option>
                  {surveyNums.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <button
                  onClick={loadLands}
                  disabled={mapLoading || !villageId}
                  className="btn-primary w-full text-sm flex items-center justify-center gap-1"
                >
                  {mapLoading
                    ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full spin" /> {t('map.loading_map')}</>
                    : t('map.show_map')}
                </button>
              </div>
            </div>

            {/* WMS toggle */}
            <div className="gov-card">
              <h3 className="font-semibold text-xs text-gray-500 uppercase mb-2">{t('map.layers')}</h3>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={showWMS} onChange={(e) => setShowWMS(e.target.checked)}
                  className="rounded border-gray-300 text-gov-700 focus:ring-gov-500" />
                <span>{t('map.tngis_layer')}</span>
              </label>
              {!WMS_URL && (
                <p className="text-xs text-gray-400 mt-1.5">{t('map.tngis_hint')}</p>
              )}
            </div>

            {/* Legend */}
            <div className="gov-card text-xs text-gray-500 space-y-1.5">
              <p className="font-semibold text-gray-600 uppercase text-xs">{t('map.legend')}</p>
              <div className="flex items-center gap-2">
                <div className="w-4 rounded" style={{ height: '2px', border: '2px solid #00e5ff' }} />
                <span>{t('map.leg_boundary')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>{t('map.leg_gps')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>{t('map.leg_good')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <span>{t('map.leg_fair')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>{t('map.leg_poor')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🚁</span>
                <span>{t('map.leg_drone')}</span>
              </div>
            </div>

            {/* Parcel list */}
            {lands.length > 0 && (
              <div className="gov-card">
                <h3 className="font-semibold text-xs text-gray-500 uppercase mb-2">
                  {t('map.plots_shown', { n: lands.length, s: lands.length > 1 ? 's' : '' })}
                </h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {lands.map((land, i) => (
                    <button key={i} className="w-full text-left text-xs p-2 rounded-lg bg-gov-50 hover:bg-gov-100"
                      onClick={() => land.coordinates && setFlyTarget([land.coordinates.lat, land.coordinates.lng])}>
                      <div className="font-bold text-gov-800">Sy {land.fullSurveyNo}</div>
                      <div className="text-gray-500 truncate">{land.ownerName}</div>
                      <div className="text-gray-400">{land.areaAcres} acres · {land.landType}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Center: Map (first on mobile) ── */}
          <div className="order-1 lg:order-2">
            <div className="rounded-xl overflow-hidden border border-gray-300 shadow-lg"
              style={{ height: 'clamp(300px, 60vh, 580px)' }}>
              <MapContainer center={TN_CENTER} zoom={7} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='Tiles &copy; Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  opacity={0.6} maxZoom={19}
                />

                {showWMS && WMS_URL && (
                  <WMSTileLayer
                    url={WMS_URL}
                    layers={WMS_LAYER}
                    format="image/png"
                    transparent={true}
                    opacity={0.85}
                    version="1.1.1"
                    attribution="TNGIS &amp; NIC"
                  />
                )}

                <ZoomControl position="bottomright" />
                {flyTarget && <FlyTo center={flyTarget} zoom={flyZoom} />}

                {userLocation && (
                  <>
                    <Circle center={[userLocation.lat, userLocation.lng]} radius={60}
                      pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.25 }} />
                    <Marker position={[userLocation.lat, userLocation.lng]}>
                      <Popup>
                        <strong>📍 {t('map.gps_ok')}</strong><br />
                        {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                      </Popup>
                    </Marker>
                  </>
                )}

                {lands.map((land, i) => {
                  if (!land.coordinates) return null;
                  return (
                    <React.Fragment key={i}>
                      {land.polygonCoords?.length > 2 && (
                        <Polygon
                          positions={land.polygonCoords.map((p) => [p.lat, p.lng])}
                          pathOptions={{ color: '#00e5ff', weight: 2.5, fillColor: '#00e5ff', fillOpacity: 0.15 }}
                        />
                      )}
                      <Marker position={[land.coordinates.lat, land.coordinates.lng]}>
                        <Popup maxWidth={240}>
                          <div className="text-sm">
                            <strong>Survey: {land.fullSurveyNo}</strong><br />
                            {land.ownerName}<br />
                            {land.areaAcres} acres · {land.landType}
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}

                {analysisPins.map((pin, i) => {
                  const pinLat = parseFloat(pin.latitude);
                  const pinLng = parseFloat(pin.longitude);
                  if (isNaN(pinLat) || isNaN(pinLng)) return null;
                  const rating = pin.overall_rating || pin.overallRating || '';
                  const color = PIN_COLOR(rating);
                  const healthScore = pin.health_score ?? pin.healthScore ?? '—';
                  const crop = pin.crop_type || pin.cropType || 'Unknown';
                  const dateStr = pin.created_at
                    ? new Date(pin.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '';
                  return (
                    <Circle
                      key={pin.id || i}
                      center={[pinLat, pinLng]}
                      radius={25}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
                    >
                      <Popup maxWidth={220}>
                        <div className="text-sm">
                          <strong>🚁 {crop}</strong><br />
                          Rating: <strong>{rating || '—'}</strong><br />
                          Health: {healthScore}/100<br />
                          {dateStr && <span className="text-gray-500 text-xs">{dateStr}</span>}
                          {pin.location_label && <><br /><span className="text-gray-500 text-xs">📍 {pin.location_label}</span></>}
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}

                {droneTrail.length > 1 && (
                  <Polyline
                    positions={droneTrail}
                    pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '6 4', opacity: 0.85 }}
                  />
                )}

                {dronePos && (
                  <Marker position={dronePos} icon={droneIcon}>
                    <Popup>
                      <strong>🚁 {activeSession?.name || 'Active Drone'}</strong><br />
                      Lat: {dronePos[0].toFixed(6)}<br />
                      Lng: {dronePos[1].toFixed(6)}
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
              <span>Satellite: ESRI World Imagery · Boundaries: TNGIS WMS</span>
              <span>{t('map.pins_count', { n: analysisPins.length, s: analysisPins.length !== 1 ? 's' : '' })} · Zoom for detail</span>
            </div>
          </div>

          {/* ── Right: Drone Tracker (last on mobile) ── */}
          <div className="order-3 space-y-3">
            <div className="gov-card">
              <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-1.5">
                {t('map.drone_tracker')}
                {activeSession && (
                  <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium animate-pulse">
                    {t('map.live_badge')}
                  </span>
                )}
              </h3>

              {!activeSession ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder={t('map.session_ph')}
                    className="form-input text-xs"
                  />
                  <button
                    onClick={handleStartSession}
                    disabled={droneLoading}
                    className="btn-primary w-full text-sm flex items-center justify-center gap-1.5"
                  >
                    {droneLoading
                      ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full spin" /> {t('map.starting')}</>
                      : t('map.start_session')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
                    <div className="font-semibold">✅ {activeSession.name}</div>
                    {dronePos && (
                      <div className="mt-1 text-gray-700 font-mono">
                        📍 {dronePos[0].toFixed(5)}, {dronePos[1].toFixed(5)}
                      </div>
                    )}
                    {droneTrail.length > 0 && (
                      <div className="text-green-700 mt-0.5">
                        {t('map.trail_info', { n: droneTrail.length })}
                      </div>
                    )}
                  </div>

                  <div className="border border-blue-200 rounded-lg p-2 bg-blue-50">
                    <p className="text-xs font-semibold text-blue-700 mb-1.5">📡 {t('map.auto_gps').replace('📡 ', '')}</p>
                    <p className="text-xs text-blue-600 mb-2">{t('map.auto_gps_desc')}</p>
                    {autoGps ? (
                      <button
                        onClick={stopAutoGps}
                        className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 font-medium flex items-center justify-center gap-1.5"
                      >
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        {t('map.auto_gps_on')}
                      </button>
                    ) : (
                      <button
                        onClick={startAutoGps}
                        className="w-full text-xs btn-primary flex items-center justify-center gap-1.5"
                      >
                        {t('map.auto_gps')}
                      </button>
                    )}
                  </div>

                  <details className="text-xs">
                    <summary className="text-gray-500 cursor-pointer select-none font-medium py-1">
                      {t('map.manual_entry')}
                    </summary>
                    <div className="space-y-1.5 mt-2">
                      <input type="number" value={droneLat} onChange={(e) => setDroneLat(e.target.value)}
                        placeholder={t('drone.lat')} step="0.000001" className="form-input text-xs" />
                      <input type="number" value={droneLng} onChange={(e) => setDroneLng(e.target.value)}
                        placeholder={t('drone.lng')} step="0.000001" className="form-input text-xs" />
                      <input type="number" value={droneAlt} onChange={(e) => setDroneAlt(e.target.value)}
                        placeholder={t('drone.altitude')} step="0.1" className="form-input text-xs" />
                      <button onClick={handleSendPosition}
                        className="btn-secondary w-full text-xs flex items-center justify-center gap-1">
                        {t('map.send_pos')}
                      </button>
                    </div>
                  </details>

                  {/* Share live tracking link */}
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/track/${activeSession.id}`;
                      navigator.clipboard.writeText(url).then(() => {
                        setTrackCopied(true);
                        setTimeout(() => setTrackCopied(false), 2500);
                      });
                    }}
                    className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {trackCopied ? '✅ Link Copied!' : '🔗 Share Live Tracking Link'}
                  </button>

                  <button onClick={handleStopSession}
                    className="w-full text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-2 font-medium transition-colors">
                    {t('map.stop_session')}
                  </button>
                </div>
              )}

              {droneError && <p className="text-xs text-red-500 mt-2">{droneError}</p>}
            </div>

            {/* Analysis pins summary */}
            <div className="gov-card">
              <h3 className="font-semibold text-xs text-gray-500 uppercase mb-2">{t('map.analysis_pins')}</h3>
              {analysisPins.length === 0 ? (
                <p className="text-xs text-gray-400">{t('map.no_pins')}</p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {analysisPins.slice(0, 15).map((pin, i) => {
                    const rating = pin.overall_rating || pin.overallRating || '—';
                    const crop = pin.crop_type || pin.cropType || 'Unknown';
                    const color = PIN_COLOR(rating);
                    return (
                      <button
                        key={pin.id || i}
                        className="w-full text-left text-xs p-2 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                          const lat = parseFloat(pin.latitude);
                          const lng = parseFloat(pin.longitude);
                          if (!isNaN(lat) && !isNaN(lng)) {
                            setFlyTarget([lat, lng]);
                            setFlyZoom(16);
                          }
                        }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-700 truncate">{crop}</div>
                          <div className="text-gray-400">{rating}</div>
                        </div>
                      </button>
                    );
                  })}
                  {analysisPins.length > 15 && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      {t('map.more_pins', { n: analysisPins.length - 15 })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
