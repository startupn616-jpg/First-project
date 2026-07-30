import { useEffect, useMemo, useRef } from 'react';
import {
  GoogleMap,
  MarkerF,
  PolygonF,
  CircleF,
  PolylineF,
  useJsApiLoader,
} from '@react-google-maps/api';

const containerStyle = { height: '100%', width: '100%' };

export default function GoogleSurveyMap({
  apiKey,
  center,
  zoom,
  userLocation,
  lands,
  analysisPins,
  dronePos,
  droneTrail,
  onMapClick,
}) {
  const mapRef = useRef(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'ailand-google-map',
    googleMapsApiKey: apiKey,
  });
  const options = useMemo(() => ({
    mapTypeId: 'satellite',
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
  }), []);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(zoom);
    }
  }, [center, zoom]);

  if (loadError) {
    return <div className="h-full grid place-items-center bg-red-50 p-5 text-center text-sm text-red-700">Google Maps could not load. Verify the API key, Maps JavaScript API access, billing, and localhost referrer restriction.</div>;
  }
  if (!isLoaded) {
    return <div className="h-full grid place-items-center bg-gray-100 text-sm text-gray-500">Loading Google Maps…</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={options}
      onLoad={(map) => { mapRef.current = map; }}
      onUnmount={() => { mapRef.current = null; }}
      onClick={(event) => {
        const lat = event.latLng?.lat();
        const lng = event.latLng?.lng();
        if (Number.isFinite(lat) && Number.isFinite(lng)) onMapClick?.({ lat, lng });
      }}
    >
      {userLocation && (
        <>
          <CircleF center={userLocation} radius={60} options={{ strokeColor: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.25 }} />
          <MarkerF position={userLocation} title="Your current location" />
        </>
      )}

      {lands.map((land) => {
        if (!land.coordinates) return null;
        return (
          <MarkerF
            key={`parcel-${land.id || land.fullSurveyNo}`}
            position={land.coordinates}
            title={`Survey ${land.fullSurveyNo}`}
          />
        );
      })}

      {lands.map((land) => (
        land.polygonCoords?.length > 2 && (
          <PolygonF
            key={`boundary-${land.id || land.fullSurveyNo}`}
            paths={land.polygonCoords}
            options={{ strokeColor: '#00e5ff', strokeWeight: 2.5, fillColor: '#00e5ff', fillOpacity: 0.15 }}
          />
        )
      ))}

      {analysisPins.map((pin) => {
        const lat = Number(pin.latitude);
        const lng = Number(pin.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return (
          <MarkerF
            key={`analysis-${pin.id}`}
            position={{ lat, lng }}
            title={`${pin.crop_type || 'Field analysis'} · Survey ${pin.survey_number || 'unmatched'}`}
          />
        );
      })}

      {droneTrail.length > 1 && (
        <PolylineF path={droneTrail.map(([lat, lng]) => ({ lat, lng }))} options={{ strokeColor: '#f59e0b', strokeWeight: 3 }} />
      )}
      {dronePos && <MarkerF position={{ lat: dronePos[0], lng: dronePos[1] }} title="Tracked device location" />}
    </GoogleMap>
  );
}
