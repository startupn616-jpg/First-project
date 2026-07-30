const sb = require('../config/supabase');

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Link a GPS point to the nearest land parcel (within ~2 km by default).
 */
async function findNearestParcel(lat, lng, { village_id, maxDistanceM = 2000 } = {}) {
  if (lat == null || lng == null) return null;

  let q = sb
    .from('land_parcels')
    .select('id, survey_number, sub_division, village_id, latitude, longitude, owner_name, patta_number')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (village_id) q = q.eq('village_id', village_id);

  const { data, error } = await q.limit(500);
  if (error || !data?.length) return null;

  let best = null;
  let bestDist = Infinity;

  for (const row of data) {
    const d = haversineMeters(lat, lng, parseFloat(row.latitude), parseFloat(row.longitude));
    if (d < bestDist) {
      bestDist = d;
      best = row;
    }
  }

  if (!best || bestDist > maxDistanceM) return null;

  return {
    landParcelId: best.id,
    surveyNumber: best.survey_number,
    subDivision: best.sub_division,
    ownerName: best.owner_name,
    pattaNumber: best.patta_number,
    distanceMeters: Math.round(bestDist),
  };
}

module.exports = { findNearestParcel, haversineMeters };
