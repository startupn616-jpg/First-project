import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import {
  fetchDistricts, fetchTaluks, fetchVillages,
  adminListLand, adminCreateLand, adminUpdateLand, adminDeleteLand, adminAutoFetch,
} from '../services/api';

const LAND_TYPES  = ['Dry', 'Wet', 'Garden', 'Poramboke', 'Waste'];
const WATER_SRCS  = ['Borewell', 'Canal', 'Well', 'Rainfed', 'Tank', 'River', 'Drip Irrigation'];
const SOIL_TYPES  = ['Red Loam', 'Clay Loam', 'Black Cotton', 'Sandy Loam', 'Alluvial', 'Laterite', 'Red Sandy'];
const LAND_USES   = ['Agricultural', 'Residential', 'Commercial', 'Horticultural', 'Waste Land'];

const EMPTY_FORM = {
  village_id: '', survey_number: '', sub_division: '', patta_number: '',
  owner_name: '', area_acres: '', area_hectares: '',
  land_type: 'Dry', land_use: 'Agricultural',
  water_source: '', soil_type: '', latitude: '', longitude: '', notes: '',
};

export default function DataEntry() {
  // Dropdowns
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks]       = useState([]);
  const [villages, setVillages]   = useState([]);
  const [districtId, setDistrictId] = useState('');
  const [talukId, setTalukId]     = useState('');

  // Form state
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [fetching, setFetching]   = useState(false);
  const [fetchMsg, setFetchMsg]   = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // Records list
  const [records, setRecords]     = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [filterVillage, setFilterVillage]   = useState('');

  useEffect(() => {
    fetchDistricts().then((r) => setDistricts(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setTaluks([]); setTalukId(''); setVillages([]);
    setForm((f) => ({ ...f, village_id: '' }));
    if (!districtId) return;
    fetchTaluks(districtId).then((r) => setTaluks(r.data.data)).catch(() => {});
  }, [districtId]);

  useEffect(() => {
    setVillages([]); setForm((f) => ({ ...f, village_id: '' })); setFilterVillage('');
    if (!talukId) return;
    fetchVillages(talukId).then((r) => setVillages(r.data.data)).catch(() => {});
  }, [talukId]);

  const loadRecords = useCallback(async (villageId) => {
    setLoadingRecords(true);
    try {
      const res = await adminListLand(villageId ? { village_id: villageId } : {});
      setRecords(res.data.data);
    } catch {}
    setLoadingRecords(false);
  }, []);

  useEffect(() => {
    loadRecords(filterVillage || undefined);
  }, [filterVillage, loadRecords]);

  const handleAcresChange = (val) => {
    setForm((f) => ({
      ...f,
      area_acres: val,
      area_hectares: val ? (parseFloat(val) * 0.404686).toFixed(4) : '',
    }));
  };

  const detectGPS = () => {
    if (!navigator.geolocation) { setError('GPS not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({
        ...f,
        latitude:  pos.coords.latitude.toFixed(6),
        longitude: pos.coords.longitude.toFixed(6),
      })),
      () => setError('Enable GPS and try again.')
    );
  };

  const autoFetch = async () => {
    const district = districts.find((d) => String(d.id) === String(districtId));
    const taluk    = taluks.find((t) => String(t.id) === String(talukId));
    const village  = villages.find((v) => String(v.id) === String(form.village_id));

    if (!village) { setError('Select village first.'); return; }

    setFetching(true); setFetchMsg(''); setError('');

    try {
      const res = await adminAutoFetch({
        district_name: district?.name || '',
        taluk_name:    taluk?.name    || '',
        village_name:  village?.name  || '',
        survey_number: form.survey_number || '',
      });

      const d = res.data;
      if (d.prefilled) {
        setForm((f) => ({
          ...f,
          latitude:     d.prefilled.latitude  ? String(d.prefilled.latitude)  : f.latitude,
          longitude:    d.prefilled.longitude ? String(d.prefilled.longitude) : f.longitude,
          land_type:    d.prefilled.land_type  || f.land_type,
          land_use:     d.prefilled.land_use   || f.land_use,
          water_source: d.prefilled.water_source || f.water_source,
          soil_type:    d.prefilled.soil_type    || f.soil_type,
          patta_number: f.patta_number || d.prefilled.patta_number || '',
        }));
      }
      setFetchMsg(d.message || 'Auto-fetch complete. Verify the values below.');
    } catch {
      setFetchMsg('Auto-fetch failed — enter details manually.');
    }
    setFetching(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!form.village_id || !form.survey_number) {
      setError('Village and Survey Number are required.'); return;
    }

    setSaving(true);
    try {
      if (editId) {
        await adminUpdateLand(editId, form);
        setSuccess('Record updated successfully.');
      } else {
        await adminCreateLand(form);
        setSuccess('Survey record added to database.');
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      loadRecords(filterVillage || undefined);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    }
    setSaving(false);
  };

  const handleEdit = (rec) => {
    setEditId(rec.id);
    setForm(Object.fromEntries(
      Object.keys(EMPTY_FORM).map((key) => [key, rec[key] ?? EMPTY_FORM[key]])
    ));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this survey record?')) return;
    try {
      await adminDeleteLand(id);
      loadRecords(filterVillage || undefined);
    } catch { alert('Delete failed.'); }
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_FORM); setError(''); setSuccess(''); };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-5">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-800">
            {editId ? '✏️ Edit Survey Record' : '➕ Add Survey Record'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manually enter land survey data — stored in your Supabase database
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-5">

          {/* ── Data Entry Form ── */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSave} className="gov-card space-y-4">

              {error   && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠️ {error}</div>}
              {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">✅ {success}</div>}

              {/* Location */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">📍 Location</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">District</label>
                    <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} className="form-input text-sm">
                      <option value="">— Select —</option>
                      {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Taluk</label>
                    <select value={talukId} onChange={(e) => setTalukId(e.target.value)} className="form-input text-sm" disabled={!districtId}>
                      <option value="">— Select —</option>
                      {taluks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Village *</label>
                    <select value={form.village_id} onChange={(e) => setForm((f) => ({ ...f, village_id: e.target.value }))}
                      className="form-input text-sm" disabled={!talukId} required>
                      <option value="">— Select —</option>
                      {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Survey info */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">🔢 Survey Details</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Survey Number *</label>
                    <input type="text" value={form.survey_number}
                      onChange={(e) => setForm((f) => ({ ...f, survey_number: e.target.value }))}
                      className="form-input" placeholder="e.g. 216" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sub Division</label>
                    <input type="text" value={form.sub_division}
                      onChange={(e) => setForm((f) => ({ ...f, sub_division: e.target.value }))}
                      className="form-input" placeholder="e.g. 1A1 (optional)" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Patta Number</label>
                    <input type="text" value={form.patta_number}
                      onChange={(e) => setForm((f) => ({ ...f, patta_number: e.target.value }))}
                      className="form-input" placeholder="e.g. PT-5501" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Owner Name</label>
                    <input type="text" value={form.owner_name}
                      onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                      className="form-input" placeholder="Land owner full name" />
                  </div>
                </div>
              </div>

              {/* Area */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">📐 Area</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Area (Acres)</label>
                    <input type="number" step="0.0001" min="0" value={form.area_acres}
                      onChange={(e) => handleAcresChange(e.target.value)}
                      className="form-input" placeholder="e.g. 2.5000" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Area (Hectares)</label>
                    <input type="number" step="0.0001" min="0" value={form.area_hectares}
                      onChange={(e) => setForm((f) => ({ ...f, area_hectares: e.target.value }))}
                      className="form-input bg-gray-50" placeholder="Auto-calculated" />
                  </div>
                </div>
              </div>

              {/* Land details */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">🌾 Land Details</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Land Type</label>
                    <select value={form.land_type} onChange={(e) => setForm((f) => ({ ...f, land_type: e.target.value }))} className="form-input">
                      {LAND_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Land Use</label>
                    <select value={form.land_use} onChange={(e) => setForm((f) => ({ ...f, land_use: e.target.value }))} className="form-input">
                      {LAND_USES.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Water Source</label>
                    <select value={form.water_source} onChange={(e) => setForm((f) => ({ ...f, water_source: e.target.value }))} className="form-input">
                      <option value="">— Select —</option>
                      {WATER_SRCS.map((w) => <option key={w}>{w}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Soil Type</label>
                    <select value={form.soil_type} onChange={(e) => setForm((f) => ({ ...f, soil_type: e.target.value }))} className="form-input">
                      <option value="">— Select —</option>
                      {SOIL_TYPES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* GPS Coordinates */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">🗺️ GPS Coordinates</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={autoFetch} disabled={fetching || !form.village_id}
                      className="text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 disabled:opacity-50">
                      {fetching ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full spin" /> Fetching…</> : '🌐 Auto-fill from Maps'}
                    </button>
                    <button type="button" onClick={detectGPS}
                      className="text-xs px-2.5 py-1 bg-gov-700 hover:bg-gov-800 text-white rounded-lg">
                      📡 Use My GPS
                    </button>
                  </div>
                </div>
                {fetchMsg && (
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    ℹ️ {fetchMsg}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Latitude</label>
                    <input type="number" step="0.000001" value={form.latitude}
                      onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                      className="form-input" placeholder="e.g. 12.822031" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Longitude</label>
                    <input type="number" step="0.000001" value={form.longitude}
                      onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                      className="form-input" placeholder="e.g. 77.880307" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Tip: Open Google Maps, long-press on the land, copy the coordinates shown.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="form-input h-16 resize-none" placeholder="Any additional remarks…" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="btn-primary flex items-center gap-2">
                  {saving
                    ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin" /> Saving…</>
                    : editId ? '💾 Update Record' : '💾 Save to Database'}
                </button>
                {editId && (
                  <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel</button>
                )}
              </div>
            </form>
          </div>

          {/* ── Records list ── */}
          <div className="lg:col-span-2">
            <div className="gov-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800">📋 Saved Records</h2>
                <span className="badge-green">{records.length} total</span>
              </div>

              <select value={filterVillage} onChange={(e) => setFilterVillage(e.target.value)}
                className="form-input text-xs mb-3">
                <option value="">All Villages</option>
                {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>

              {loadingRecords && (
                <div className="text-center py-6">
                  <div className="w-6 h-6 border-3 border-gov-700 border-t-transparent rounded-full spin mx-auto" />
                </div>
              )}

              {!loadingRecords && records.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">🗂️</div>
                  <p className="text-sm">No records yet. Add your first survey record.</p>
                </div>
              )}

              <div className="space-y-2 max-h-[560px] overflow-y-auto">
                {records.map((rec) => (
                  <div key={rec.id}
                    className={`rounded-lg border p-3 text-sm transition-colors
                      ${editId === rec.id ? 'border-gov-500 bg-gov-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-bold text-gov-800">
                          {rec.sub_division ? `${rec.survey_number}/${rec.sub_division}` : rec.survey_number}
                        </span>
                        <span className={`ml-2 ${rec.land_type === 'Wet' ? 'badge-blue' : 'badge-yellow'}`}>
                          {rec.land_type}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(rec)}
                          className="text-xs px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(rec.id)}
                          className="text-xs px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded">
                          Del
                        </button>
                      </div>
                    </div>
                    <div className="text-gray-600 text-xs space-y-0.5">
                      <div>👤 {rec.owner_name || '—'} &nbsp;|&nbsp; 📜 {rec.patta_number || '—'}</div>
                      <div>📍 {rec.village_name}, {rec.taluk_name}</div>
                      {rec.area_acres && <div>📐 {rec.area_acres} acres</div>}
                      {rec.latitude && <div className="text-gray-400">{parseFloat(rec.latitude).toFixed(5)}, {parseFloat(rec.longitude).toFixed(5)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
