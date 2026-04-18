import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import LandMap from '../components/LandMap';
import {
  fetchDistricts, fetchTaluks, fetchVillages,
  fetchSurveyNumbers, fetchSubDivisions, fetchSurveyDetails,
} from '../services/api';

// ── Sub-component: A-Register / FMB / Patta quick-action buttons ──
function RecordButtons({ pattaNo, districtName, talukName, villageName, surveyNo }) {
  // Link to the official Tamil Nilam portal with pre-filled params where possible
  const base = 'https://eservices.tn.gov.in/eservicesnew/land';

  const actions = [
    {
      icon: '🏛️',
      label: 'A Register',
      labelTa: 'அ பதிவேடு',
      color: 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-indigo-200',
      href: `${base}/aregister.html`,
    },
    {
      icon: '📐',
      label: 'FMB Sketch',
      labelTa: 'வரைபடம்',
      color: 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-200',
      href: `${base}/fmb.html`,
    },
    {
      icon: '📜',
      label: 'Patta Number',
      labelTa: 'பட்டா',
      color: 'bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-200',
      href: `${base}/patta.html`,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {actions.map(({ icon, label, labelTa, color, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center
                      transition-colors cursor-pointer select-none ${color}`}
        >
          <span className="text-2xl mb-1">{icon}</span>
          <span className="text-xs font-bold leading-tight">{label}</span>
          <span className="text-[10px] opacity-70 leading-tight">{labelTa}</span>
        </a>
      ))}
    </div>
  );
}

// ── Sub-component: Detail table row ──
function Row({ label, value, highlight }) {
  return (
    <div className={`flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm
                     ${highlight ? 'bg-gov-50 -mx-3 px-3 rounded' : ''}`}>
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="text-gray-800 font-semibold text-right max-w-[55%]">{value || '—'}</span>
    </div>
  );
}

// ── Dropdown with loading spinner ──
function Select({ label, labelTa, value, onChange, options, disabled, loading, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label} {labelTa && <span className="text-gray-400 font-normal">({labelTa})</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled || loading}
          className="form-input pr-8 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">{loading ? 'Loading…' : placeholder}</option>
          {options.map((opt) =>
            typeof opt === 'string'
              ? <option key={opt} value={opt}>{opt}</option>
              : <option key={opt.id} value={opt.id}>{opt.name}</option>
          )}
        </select>
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-gov-600 border-t-transparent rounded-full spin" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandSearch() {
  // ── Location dropdowns (from Supabase) ──
  const [districts, setDistricts]   = useState([]);
  const [taluks, setTaluks]         = useState([]);
  const [villages, setVillages]     = useState([]);
  const [districtId, setDistrictId] = useState('');
  const [talukId, setTalukId]       = useState('');
  const [villageId, setVillageId]   = useState('');

  // ── Survey dropdowns (from TNGIS API) ──
  const [surveyNumbers, setSurveyNumbers]   = useState([]);
  const [subDivisions, setSubDivisions]     = useState([]);
  const [surveyNo, setSurveyNo]             = useState('');
  const [subDiv, setSubDiv]                 = useState('');

  // ── Loading states ──
  const [loadingTaluks, setLoadingTaluks]   = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [loadingSubDivs, setLoadingSubDivs] = useState(false);
  const [searching, setSearching]           = useState(false);

  // ── Results ──
  const [location, setLocation] = useState(null);  // { district, taluk, village }
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [searched, setSearched] = useState(false);
  const [error, setError]       = useState('');
  const [isMockData, setIsMockData] = useState(false);

  // Load districts on mount
  useEffect(() => {
    fetchDistricts().then((r) => setDistricts(r.data.data)).catch(() => {});
  }, []);

  // Load taluks on district change
  useEffect(() => {
    setTaluks([]); setTalukId('');
    setVillages([]); setVillageId('');
    setSurveyNumbers([]); setSurveyNo('');
    setSubDivisions([]); setSubDiv('');
    setResults([]); setSelected(null);
    if (!districtId) return;
    setLoadingTaluks(true);
    fetchTaluks(districtId)
      .then((r) => setTaluks(r.data.data))
      .catch(() => {})
      .finally(() => setLoadingTaluks(false));
  }, [districtId]);

  // Load villages on taluk change
  useEffect(() => {
    setVillages([]); setVillageId('');
    setSurveyNumbers([]); setSurveyNo('');
    setSubDivisions([]); setSubDiv('');
    setResults([]); setSelected(null);
    if (!talukId) return;
    setLoadingVillages(true);
    fetchVillages(talukId)
      .then((r) => setVillages(r.data.data))
      .catch(() => {})
      .finally(() => setLoadingVillages(false));
  }, [talukId]);

  // Fetch survey numbers from TNGIS when village is selected
  useEffect(() => {
    setSurveyNumbers([]); setSurveyNo('');
    setSubDivisions([]); setSubDiv('');
    setResults([]); setSelected(null);
    if (!villageId) return;
    setLoadingSurveys(true);
    fetchSurveyNumbers({ village_id: villageId, taluk_id: talukId, district_id: districtId })
      .then((r) => {
        setSurveyNumbers(r.data.data);
        setLocation(r.data.location);
      })
      .catch(() => {})
      .finally(() => setLoadingSurveys(false));
  }, [villageId]);

  // Fetch sub-divisions when survey number is selected
  useEffect(() => {
    setSubDivisions([]); setSubDiv('');
    setResults([]); setSelected(null);
    if (!villageId || !surveyNo) return;
    setLoadingSubDivs(true);
    fetchSubDivisions({ village_id: villageId, taluk_id: talukId, district_id: districtId, survey_no: surveyNo })
      .then((r) => setSubDivisions(r.data.data))
      .catch(() => {})
      .finally(() => setLoadingSubDivs(false));
  }, [surveyNo]);

  // Auto-search when sub-division or survey number (if no sub-divs) is chosen
  useEffect(() => {
    if (surveyNo && (subDiv || subDivisions.length === 0 || (subDivisions.length === 1 && !subDivisions[0]))) {
      handleSearch();
    }
  }, [subDiv, subDivisions]);

  const handleSearch = async () => {
    if (!surveyNo) return;
    setError('');
    setSearching(true);
    setSearched(false);

    try {
      const res = await fetchSurveyDetails({
        village_id: villageId,
        taluk_id: talukId,
        district_id: districtId,
        survey_no: surveyNo,
        sub_div: subDiv || undefined,
      });
      setResults(res.data.data);
      setIsMockData(res.data._usingMockData);
      if (res.data.data.length === 1) setSelected(res.data.data[0]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch land details.');
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const landTypeBadge = (type) => ({
    Wet: 'badge-blue', Dry: 'badge-yellow',
    Garden: 'badge-green', Poramboke: 'badge-gray',
  }[type] || 'badge-gray');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-5">
        {/* Page heading */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">🔎 Land Search</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Select District → Taluk → Village — survey numbers are fetched live from TNGIS
          </p>
        </div>

        {isMockData && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <div>
              <strong>Demo mode:</strong> TNGIS API not configured. Showing realistic sample data.
              Set <code className="bg-amber-100 px-1 rounded">TNGIS_API_KEY</code> in backend <code>.env</code> to connect to live data.
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* ── Cascading dropdowns ── */}
        <div className="gov-card mb-5">
          {/* Top bar: District / Taluk / Village — matching Tamil Nilam app header style */}
          <div className="bg-gov-700 -m-5 mb-4 px-4 py-3 rounded-t-xl">
            <div className="grid grid-cols-3 gap-3 text-white text-center text-xs font-semibold">
              <span>District</span>
              <span>Taluk</span>
              <span>Village</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <Select
              label="District" labelTa="மாவட்டம்"
              value={districtId} onChange={(e) => setDistrictId(e.target.value)}
              options={districts} placeholder="— Select —"
            />
            <Select
              label="Taluk" labelTa="தாலுகா"
              value={talukId} onChange={(e) => setTalukId(e.target.value)}
              options={taluks} disabled={!districtId} loading={loadingTaluks}
              placeholder={districtId ? '— Select —' : '← First pick District'}
            />
            <Select
              label="Village" labelTa="கிராமம்"
              value={villageId} onChange={(e) => setVillageId(e.target.value)}
              options={villages} disabled={!talukId} loading={loadingVillages}
              placeholder={talukId ? '— Select —' : '← First pick Taluk'}
            />
          </div>

          {/* Survey Number + Sub Division — fetched from TNGIS, shown as dropdown */}
          <div className="border-t border-gray-100 pt-4">
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <Select
                label="Survey Number" labelTa="கணக்கெண்"
                value={surveyNo} onChange={(e) => setSurveyNo(e.target.value)}
                options={surveyNumbers} disabled={!villageId} loading={loadingSurveys}
                placeholder={villageId ? (loadingSurveys ? 'Fetching from TNGIS…' : '— Select Survey No —') : '← First pick Village'}
              />
              <Select
                label="Sub Division" labelTa="உட்பிரிவு"
                value={subDiv} onChange={(e) => setSubDiv(e.target.value)}
                options={subDivisions.filter(Boolean)} disabled={!surveyNo || loadingSubDivs}
                loading={loadingSubDivs}
                placeholder={surveyNo ? (loadingSubDivs ? 'Loading…' : '— Select Sub Division —') : '← First pick Survey No'}
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={!surveyNo || searching}
              className="btn-primary flex items-center gap-2"
            >
              {searching ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin" /> Fetching…</>
              ) : '📋 Get Land Details'}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        {searched && results.length === 0 && !error && (
          <div className="gov-card text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🗂️</div>
            <p className="font-medium text-gray-600">No records found</p>
            <p className="text-sm mt-1">Check the survey number or try a different sub-division.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid lg:grid-cols-5 gap-5">
            {/* Results list */}
            <div className="lg:col-span-2 space-y-2">
              {results.map((land, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(land)}
                  className={`w-full text-left gov-card border-2 transition-all
                    ${selected === land ? 'border-gov-600 bg-gov-50' : 'border-transparent hover:border-gov-300'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-gov-800 font-black text-lg">
                        {land.fullSurveyNo}
                      </span>
                      {land.subDivision && (
                        <span className="ml-2 text-xs text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                          Sub Div: {land.subDivision}
                        </span>
                      )}
                    </div>
                    <span className={landTypeBadge(land.landType)}>{land.landType}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <div>👤 {land.ownerName}</div>
                    <div>📜 Patta: {land.pattaNumber}</div>
                    <div>📐 {land.areaAcres} Acres · {land.waterSource}</div>
                    {land.coordinates && (
                      <div className="text-xs text-gray-400">
                        📌 {land.coordinates.lat.toFixed(5)}, {land.coordinates.lng.toFixed(5)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Detail + map panel */}
            {selected && (
              <div className="lg:col-span-3 fade-in">
                {/* Land record details */}
                <div className="gov-card mb-4">
                  {/* Header strip like Tamil Nilam app */}
                  <div className="bg-gov-700 text-white -m-5 mb-4 px-4 py-3 rounded-t-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gov-300">Survey Number</div>
                      <div className="font-black text-2xl">{selected.fullSurveyNo}</div>
                    </div>
                    <span className={`${landTypeBadge(selected.landType)} text-xs`}>
                      {selected.landType}
                    </span>
                  </div>

                  <Row label="Patta Number"  value={selected.pattaNumber}  highlight />
                  <Row label="Owner Name"    value={selected.ownerName} />
                  <Row label="District"      value={location?.district} />
                  <Row label="Taluk"         value={location?.taluk} />
                  <Row label="Village"       value={location?.village} />
                  <Row label="Area"          value={`${selected.areaAcres} Acres (${selected.areaHectares} Ha)`} />
                  <Row label="Land Use"      value={selected.landUse} />
                  <Row label="Water Source"  value={selected.waterSource} />
                  <Row label="Soil Type"     value={selected.soilType} />
                  {selected.coordinates && (
                    <Row
                      label="GPS Coordinates"
                      value={`${selected.coordinates.lat.toFixed(6)}, ${selected.coordinates.lng.toFixed(6)}`}
                    />
                  )}

                  {/* A-Register / FMB / Patta buttons — matching Tamil Nilam app */}
                  <RecordButtons
                    pattaNo={selected.pattaNumber}
                    districtName={location?.district}
                    talukName={location?.taluk}
                    villageName={location?.village}
                    surveyNo={selected.surveyNumber}
                  />
                </div>

                {/* Satellite map with polygon */}
                {selected.coordinates && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      📍 Location &amp; Boundary
                    </p>
                    <LandMap land={selected} height="340px" zoom={17} />
                    <p className="text-xs text-gray-400 text-center mt-1.5">
                      Satellite imagery · Green polygon = survey boundary · Click marker for info
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
