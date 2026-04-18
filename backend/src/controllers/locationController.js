const sb = require('../config/supabase');

const getDistricts = async (req, res) => {
  try {
    const { data, error } = await sb.from('districts').select('id, name, code').order('name');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Get districts error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch districts.' });
  }
};

const getTaluks = async (req, res) => {
  const { district_id } = req.query;
  if (!district_id)
    return res.status(400).json({ success: false, message: 'district_id is required.' });

  try {
    const { data, error } = await sb
      .from('taluks')
      .select('id, name, code, district_id')
      .eq('district_id', district_id)
      .order('name');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Get taluks error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch taluks.' });
  }
};

const getVillages = async (req, res) => {
  const { taluk_id } = req.query;
  if (!taluk_id)
    return res.status(400).json({ success: false, message: 'taluk_id is required.' });

  try {
    const { data, error } = await sb
      .from('villages')
      .select('id, name, village_code, taluk_id')
      .eq('taluk_id', taluk_id)
      .order('name');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Get villages error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch villages.' });
  }
};

module.exports = { getDistricts, getTaluks, getVillages };
