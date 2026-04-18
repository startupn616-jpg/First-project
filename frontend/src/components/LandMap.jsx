// LandMap — Satellite imagery basemap + optional TNGIS WMS survey boundary overlay
import React, { useEffect } from 'react';
import {
  MapContainer, TileLayer, WMSTileLayer,
  Marker, Popup, Polygon, ZoomControl, useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fly-to animation when selected land changes
function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 17, { animate: true, duration: 1.2 });
  }, [center, map]);
  return null;
}

// TNGIS WMS URL from env — provides Tamil Nadu survey boundary tile overlay
// Same layer as the Tamil Nilam Geo-info app uses (yellow-green/cyan lines on satellite map)
const WMS_URL   = import.meta.env.VITE_TNGIS_WMS_URL;
const WMS_LAYER = import.meta.env.VITE_TNGIS_WMS_LAYER || 'tngis:survey_cadastral';

/**
 * LandMap
 * Props:
 *   land          – single parcel (with .coordinates + optional .polygonCoords)
 *   lands         – array of parcels
 *   center        – { lat, lng } explicit centre override
 *   zoom          – initial zoom
 *   height        – CSS height string
 *   showWMS       – show TNGIS WMS layer (default true when URL configured)
 */
export default function LandMap({ land, lands = [], center, zoom = 16, height = '400px', showWMS = true }) {
  const TN_CENTER  = [10.9094, 78.6574];
  const allParcels = land ? [land] : lands;

  const mapCenter =
    center        ? [center.lat, center.lng] :
    land?.coordinates ? [land.coordinates.lat, land.coordinates.lng] :
    lands[0]?.coordinates ? [lands[0].coordinates.lat, lands[0].coordinates.lng] :
    TN_CENTER;

  return (
    <div style={{ height }} className="w-full rounded-xl overflow-hidden border border-gray-300 shadow-md">
      <MapContainer center={mapCenter} zoom={zoom} zoomControl={false} style={{ height: '100%', width: '100%' }}>

        {/* ── Basemap: ESRI World Imagery (satellite) — free, no API key ── */}
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        {/* ── Labels overlay on satellite (shows road names, place names) ── */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          opacity={0.6}
          maxZoom={19}
        />

        {/* ── TNGIS WMS: Tamil Nadu survey boundary tiles ──
             This draws the cyan/yellow/pink survey plot lines like in the Tamil Nilam Geo-info app.
             Enabled when VITE_TNGIS_WMS_URL is set in frontend/.env               */}
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

        {/* Fly to selected parcel */}
        {land?.coordinates && (
          <FlyTo center={[land.coordinates.lat, land.coordinates.lng]} />
        )}

        {/* Render each parcel: polygon + marker */}
        {allParcels.map((parcel, idx) => {
          if (!parcel?.coordinates) return null;
          const pos = [parcel.coordinates.lat, parcel.coordinates.lng];

          return (
            <React.Fragment key={parcel.id || idx}>
              {/* Survey boundary polygon — cyan like Tamil Nilam app */}
              {parcel.polygonCoords?.length > 2 && (
                <Polygon
                  positions={parcel.polygonCoords.map((p) => [p.lat, p.lng])}
                  pathOptions={{
                    color: '#00e5ff',      // cyan boundary (matches Tamil Nilam style)
                    weight: 2.5,
                    opacity: 1,
                    fillColor: '#00e5ff',
                    fillOpacity: 0.12,
                  }}
                />
              )}

              {/* Centre marker */}
              <Marker position={pos}>
                <Popup maxWidth={300}>
                  <div className="text-sm leading-relaxed py-1">
                    <div className="font-black text-gov-800 text-base mb-1">
                      Survey No: {parcel.fullSurveyNo || parcel.surveyNumber}
                    </div>
                    {parcel.subDivision && (
                      <div className="text-xs text-indigo-600 mb-1">Sub Div: {parcel.subDivision}</div>
                    )}
                    <hr className="my-1.5" />
                    <div><strong>Owner:</strong> {parcel.ownerName}</div>
                    <div><strong>Patta:</strong> {parcel.pattaNumber}</div>
                    <div><strong>Area:</strong> {parcel.areaAcres} Acres ({parcel.areaHectares} Ha)</div>
                    <div><strong>Type:</strong> {parcel.landType}</div>
                    <div><strong>Water:</strong> {parcel.waterSource}</div>
                    <div><strong>Soil:</strong> {parcel.soilType}</div>
                    <div className="text-xs text-gray-400 mt-1.5">
                      {parcel.coordinates.lat.toFixed(6)}, {parcel.coordinates.lng.toFixed(6)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
