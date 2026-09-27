import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TN_CENTER = [10.9094, 78.6574];

const OFFICIAL_CADASTRAL =
  'https://tngis.tn.gov.in/data/xyz_tiles/cadastral_xyz/{z}/{x}/{y}.png';

const BASEMAPS = {
  street: {
    url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
    attr: '&copy; OpenStreetMap',
  },
  satellite: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attr: '&copy; Google',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attr: '&copy; OpenTopoMap',
  },
};

function uniqueLands(lands) {
  const seen = new Set();
  return (lands || []).filter((land) => {
    const key = String(land.id || land.fullSurveyNo || land.surveyNumber);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toLatLng(point) {
  if (Array.isArray(point) && point.length >= 2) {
    const a = Number(point[0]);
    const b = Number(point[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    if (Math.abs(a) > 20 && Math.abs(b) < 20) return [b, a];
    return [a, b];
  }
  if (point?.lat != null && point?.lng != null) {
    return [Number(point.lat), Number(point.lng)];
  }
  return null;
}

function ringOf(land) {
  return (land.polygonCoords || []).map(toLatLng).filter(Boolean);
}

function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const yi = ring[i][0];
    const xi = ring[i][1];
    const yj = ring[j][0];
    const xj = ring[j][1];
    const hit = ((yi > lat) !== (yj > lat))
      && (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function isActive(selectedLand, land) {
  if (!selectedLand) return false;
  return selectedLand.id === land.id || selectedLand.fullSurveyNo === land.fullSurveyNo;
}

function latLngToWorld(lat, lng, z) {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n;
  return { x, y };
}

function drawCadastralTile(ctx, coords, lands) {
  const { x: tileX, y: tileY, z } = coords;
  if (z < 14 || !lands.length) return;

  const showLabels = z >= 16;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  lands.forEach((land) => {
    const ring = ringOf(land);
    if (ring.length < 3) return;

    const pixels = ring.map(([lat, lng]) => {
      const world = latLngToWorld(lat, lng, z);
      return {
        x: (world.x - tileX) * 256,
        y: (world.y - tileY) * 256,
      };
    });

    const minX = Math.min(...pixels.map((p) => p.x));
    const maxX = Math.max(...pixels.map((p) => p.x));
    const minY = Math.min(...pixels.map((p) => p.y));
    const maxY = Math.max(...pixels.map((p) => p.y));
    if (maxX < -8 || minX > 264 || maxY < -8 || minY > 264) return;

    ctx.beginPath();
    pixels.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.strokeStyle = '#f43f8a';
    ctx.lineWidth = z >= 17 ? 1.15 : 0.8;
    ctx.stroke();

    if (!showLabels) return;
    const cx = pixels.reduce((sum, p) => sum + p.x, 0) / pixels.length;
    const cy = pixels.reduce((sum, p) => sum + p.y, 0) / pixels.length;
    if (cx < -20 || cx > 276 || cy < -20 || cy > 276) return;

    const label = String(land.surveyNumber || land.fullSurveyNo || '');
    if (!label) return;
    ctx.font = `700 ${z >= 18 ? 12 : 10}px "Noto Sans","Segoe UI",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(label, cx, cy);
    ctx.fillStyle = '#dc2626';
    ctx.fillText(label, cx, cy);
  });
}

function MapReady() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize({ animate: false });
    const timers = [60, 300, 800].map((ms) => setTimeout(fix, ms));
    window.addEventListener('resize', fix);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fix) : null;
    ro?.observe(map.getContainer());
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', fix);
      ro?.disconnect();
    };
  }, [map]);
  return null;
}

function FlyToView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.flyTo(center, zoom || map.getZoom(), { duration: 0.75 });
    const t = setTimeout(() => map.invalidateSize({ animate: false }), 180);
    return () => clearTimeout(t);
  }, [center, zoom, map]);
  return null;
}

function OfficialCadastralTiles({ onStatus }) {
  const loads = useRef(0);
  const errors = useRef(0);
  return (
    <TileLayer
      url={OFFICIAL_CADASTRAL}
      attribution="© TNGIS"
      opacity={1}
      zIndex={5}
      maxZoom={22}
      maxNativeZoom={19}
      eventHandlers={{
        tileload: () => {
          loads.current += 1;
          if (loads.current === 1) onStatus('ok');
        },
        tileerror: () => {
          errors.current += 1;
          if (loads.current === 0 && errors.current >= 2) onStatus('blocked');
        },
      }}
    />
  );
}

function VillageCadastralTiles({ lands }) {
  const map = useMap();
  const plotKey = lands.map((land) => land.id || land.fullSurveyNo).join('|');
  useEffect(() => {
    if (!lands.length) return undefined;
    const layer = L.gridLayer({
      tileSize: 256,
      className: 'gi-cadastral-grid',
    });
    layer.createTile = (coords) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      canvas.style.pointerEvents = 'none';
      drawCadastralTile(canvas.getContext('2d'), coords, lands);
      return canvas;
    };
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, plotKey]);
  return null;
}

function MapClickSelect({ lands, onSelect }) {
  const map = useMap();
  useEffect(() => {
    const onClick = (event) => {
      const { lat, lng } = event.latlng;
      const hit = lands.find((land) => {
        const ring = ringOf(land);
        return ring.length >= 3 && pointInRing(lat, lng, ring);
      });
      if (hit) onSelect?.(hit);
    };
    map.on('click', onClick);
    return () => map.off('click', onClick);
  }, [map, lands, onSelect]);
  return null;
}

export default function PattaCadastralMap({
  lands = [],
  selectedLand,
  onSelect,
  basemap = 'street',
  viewCenter = TN_CENTER,
  viewZoom = 7,
}) {
  const tiles = BASEMAPS[basemap] || null;
  const plots = uniqueLands(lands);
  const [cadastralStatus, setCadastralStatus] = useState('unknown');
  const useVillageTiles = plots.length > 0 && cadastralStatus !== 'ok';

  return (
    <div className="absolute inset-0 bg-[#f7f4ee]">
      <MapContainer
        center={viewCenter || TN_CENTER}
        zoom={viewZoom || 7}
        zoomControl={false}
        attributionControl={false}
        preferCanvas
        style={{ height: '100%', width: '100%', background: '#f7f4ee' }}
      >
        {tiles && (
          <TileLayer
            key={basemap}
            attribution={tiles.attr}
            url={tiles.url}
            maxZoom={19}
          />
        )}
        {cadastralStatus !== 'blocked' && (
          <OfficialCadastralTiles onStatus={setCadastralStatus} />
        )}
        {useVillageTiles && <VillageCadastralTiles lands={plots} />}
        {selectedLand && ringOf(selectedLand).length >= 3 && (
          <Polygon
            positions={ringOf(selectedLand)}
            pathOptions={{
              color: '#be123c',
              weight: 2.2,
              fillColor: '#fda4af',
              fillOpacity: 0.18,
              opacity: 1,
            }}
          />
        )}
        <ZoomControl position="topleft" />
        <MapReady />
        <FlyToView center={viewCenter} zoom={viewZoom} />
        <MapClickSelect lands={plots} onSelect={onSelect} />
      </MapContainer>
      {cadastralStatus === 'blocked' && !plots.length && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] rounded-full bg-white/95 px-3 py-1 text-[11px] text-gray-600 shadow">
          Official TNGIS cadastral tiles are origin-locked. Select a village to open the survey sheet.
        </div>
      )}
    </div>
  );
}
