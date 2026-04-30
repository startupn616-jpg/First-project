// ============================================================
// DroneTrack — Public live-tracking page (no login needed)
// Works like "Where is my Train" — share the link with anyone
// Auto-refreshes every 3 seconds
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, Circle, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

const droneIcon = L.divIcon({
  html: '<div style="font-size:36px;line-height:1;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.55))">🚁</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  className: '',
});

const TN_CENTER = [12.5189, 78.2138]; // Krishnagiri district centre

function AutoPan({ pos }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (!pos) return;
    if (first.current) { map.setView(pos, 16); first.current = false; }
    else map.panTo(pos, { animate: true, duration: 0.8 });
  }, [pos, map]);
  return null;
}

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function elapsed(iso) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60)  return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

export default function DroneTrack() {
  const { sessionId } = useParams();
  const [data, setData]         = useState(null);
  const [error, setError]       = useState('');
  const [lastPing, setLastPing] = useState(null);
  const [copied, setCopied]     = useState(false);
  const [tick, setTick]         = useState(0); // elapsed timer

  const fetchTrack = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/drone/track/${sessionId}`);
      setData(res.data);
      setLastPing(new Date());
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Session not found or expired.');
    }
  }, [sessionId]);

  useEffect(() => {
    fetchTrack();
    const id = setInterval(fetchTrack, 3000);
    return () => clearInterval(id);
  }, [fetchTrack]);

  // Tick every second for elapsed timer
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const latest  = data?.latestPosition;
  const trail   = data?.trail || [];
  const dronePos = latest ? [latest.lat, latest.lng] : null;
  const trailPts = trail.map((p) => [p.lat, p.lng]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-6">
        <div className="text-6xl mb-4">🚁</div>
        <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
        <p className="text-gray-400 text-center max-w-sm">{error}</p>
        <p className="text-gray-500 text-sm mt-4">The tracking session may have expired (sessions expire after 2 hours of inactivity).</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-5xl mb-3 animate-pulse">🚁</div>
          <p className="text-gray-400">Loading tracking data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">

      {/* ── Header bar ── */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">🚁</span>
          <div className="min-w-0">
            <div className="font-bold text-white text-base truncate">{data.name}</div>
            <div className="text-xs text-gray-400">
              {fmtDate(data.startedAt)} · Started {fmt(data.startedAt)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {data.isActive ? (
            <span className="flex items-center gap-1.5 bg-green-500/20 text-green-400 border border-green-500/40 px-3 py-1 rounded-full text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold">
              ENDED · {fmt(data.stoppedAt)}
            </span>
          )}
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            {copied ? '✅ Copied!' : '🔗 Share Link'}
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── Left panel ── */}
        <div className="w-full lg:w-72 bg-gray-800 border-r border-gray-700 flex flex-col overflow-y-auto">

          {/* Status cards */}
          <div className="p-4 space-y-3">

            {/* Coordinates */}
            <div className="bg-gray-700 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">📍 Current Position</div>
              {dronePos ? (
                <>
                  <div className="font-mono text-green-400 text-sm">
                    {latest.lat.toFixed(6)}, {latest.lng.toFixed(6)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Last update: {fmt(latest.ts)}
                  </div>
                </>
              ) : (
                <div className="text-gray-500 text-sm">Waiting for GPS…</div>
              )}
            </div>

            {/* Altitude + Speed */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-700 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">✈️ Altitude</div>
                <div className="text-xl font-black text-blue-400">
                  {latest?.altitude != null ? `${latest.altitude.toFixed(0)}m` : '—'}
                </div>
              </div>
              <div className="bg-gray-700 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">💨 Speed</div>
                <div className="text-xl font-black text-yellow-400">
                  {latest?.speed != null ? `${latest.speed.toFixed(1)} m/s` : '—'}
                </div>
              </div>
            </div>

            {/* Heading */}
            {latest?.heading != null && (
              <div className="bg-gray-700 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">🧭 Heading</div>
                <div className="text-lg font-bold text-white">{latest.heading.toFixed(0)}°</div>
              </div>
            )}

            {/* Session stats */}
            <div className="bg-gray-700 rounded-xl p-3 space-y-1.5">
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">📊 Session Info</div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">GPS Points</span>
                <span className="font-bold text-white">{data.totalPoints}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Elapsed</span>
                <span className="font-bold text-white">{elapsed(data.startedAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Trail shown</span>
                <span className="font-bold text-white">{trail.length} pts</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Ping</span>
                <span className="font-bold text-green-400">every 3s</span>
              </div>
            </div>

            {/* Last ping */}
            {lastPing && (
              <div className="text-center text-xs text-gray-500">
                Last synced: {lastPing.toLocaleTimeString('en-IN')}
              </div>
            )}
          </div>

          {/* Trail log */}
          {trail.length > 0 && (
            <div className="border-t border-gray-700 p-4">
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">🛤️ Flight Trail</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {[...trail].reverse().slice(0, 20).map((pt, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-500 font-mono">
                    <span>{pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</span>
                    <span className="text-gray-600">{fmt(pt.ts)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div className="flex-1" style={{ minHeight: '400px' }}>
          <MapContainer
            center={dronePos || TN_CENTER}
            zoom={dronePos ? 16 : 10}
            zoomControl={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              opacity={0.6}
              maxZoom={19}
            />

            {dronePos && <AutoPan pos={dronePos} />}

            {/* Trail line */}
            {trailPts.length > 1 && (
              <Polyline
                positions={trailPts}
                pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '8 5', opacity: 0.9 }}
              />
            )}

            {/* Start point marker */}
            {trailPts.length > 0 && (
              <Circle
                center={trailPts[0]}
                radius={8}
                pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }}
              >
                <Popup>🟢 Flight start</Popup>
              </Circle>
            )}

            {/* Live drone marker */}
            {dronePos && (
              <Marker position={dronePos} icon={droneIcon}>
                <Popup>
                  <div className="text-sm font-semibold">🚁 {data.name}</div>
                  <div className="text-xs mt-1">
                    {latest.lat.toFixed(6)}, {latest.lng.toFixed(6)}<br />
                    {latest.altitude != null && <>Alt: {latest.altitude.toFixed(0)}m<br /></>}
                    {latest.speed    != null && <>Speed: {latest.speed.toFixed(1)} m/s<br /></>}
                    <span className="text-gray-500">{fmt(latest.ts)}</span>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-center text-xs text-gray-500">
        AILAND · Tamil Nadu Agriculture & Land Survey · Drone tracking updates every 3 seconds
      </div>
    </div>
  );
}
