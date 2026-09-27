const TALUK_SIDES = ['North', 'South', 'East', 'West', 'Central'];

function dummyTaluks(district) {
  const code = district?.code || 'TN';
  return TALUK_SIDES.map((side, index) => ({
    id: `dt_${code}_${index}`,
    name: `${district?.name || 'District'} ${side}`,
    code: `${code}-T${index}`,
    district_id: district?.id,
    _dummy: true,
  }));
}

function dummyVillages(taluk, districtName) {
  const code = taluk?.code || 'TN-T0';
  const distCode = String(code).split('-')[0];
  const talukIndex = Number(String(taluk.id || '').split('_').pop() || 0);
  const base = (taluk?.name || 'Taluk').replace(/\s+(North|South|East|West|Central)$/i, '');
  return Array.from({ length: 8 }, (_, index) => ({
    id: `dv_${distCode}_${talukIndex}_${index}`,
    name: `${base} Village ${index + 1}`,
    village_code: `${code}-V${String(index + 1).padStart(3, '0')}`,
    taluk_id: taluk.id,
    _dummy: true,
  }));
}

function parseDummyTaluk(id) {
  const match = String(id || '').match(/^dt_([A-Z0-9]+)_(\d+)$/);
  if (!match) return null;
  return { distCode: match[1], talukIndex: Number(match[2]) };
}

function parseDummyVillage(id) {
  const match = String(id || '').match(/^dv_([A-Z0-9]+)_(\d+)_(\d+)$/);
  if (!match) return null;
  return {
    distCode: match[1],
    talukIndex: Number(match[2]),
    villageIndex: Number(match[3]),
  };
}

function dummyTalukFromId(talukId, districtName) {
  const parsed = parseDummyTaluk(talukId);
  if (!parsed) return null;
  const side = TALUK_SIDES[parsed.talukIndex] || 'Central';
  return {
    id: talukId,
    name: `${districtName || parsed.distCode} ${side}`,
    code: `${parsed.distCode}-T${parsed.talukIndex}`,
    _dummy: true,
  };
}

module.exports = {
  dummyTaluks,
  dummyVillages,
  parseDummyTaluk,
  parseDummyVillage,
  dummyTalukFromId,
};
