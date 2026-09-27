import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import PattaCadastralMap from '../components/PattaCadastralMap';
import { useLanguage } from '../context/LanguageContext';
import {
  DISTRICT_CENTERS, TALUK_CENTERS, VILLAGE_CENTERS, TN_CENTER,
} from '../data/geoCenters';
import {
  fetchDistricts, fetchTaluks, fetchVillages,
  fetchSurveyNumbers, fetchSubDivisions, fetchVillageParcels,
} from '../services/api';

function Field({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800 text-right">{value || '—'}</span>
    </div>
  );
}

const BASEMAP_OPTIONS = [
  { id: 'street', label: 'Street Map' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'none', label: 'No Map' },
];

export default function SurveyMaps() {
  const { t } = useLanguage();

  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [villages, setVillages] = useState([]);
  const [surveyNums, setSurveyNums] = useState([]);
  const [subDivisions, setSubDivisions] = useState([]);

  const [districtId, setDistrictId] = useState('');
  const [talukId, setTalukId] = useState('');
  const [villageId, setVillageId] = useState('');
  const [surveyNo, setSurveyNo] = useState('');
  const [subDivision, setSubDivision] = useState('');

  const [lands, setLands] = useState([]);
  const [selectedLand, setSelectedLand] = useState(null);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [basemap, setBasemap] = useState('street');
  const [viewCenter, setViewCenter] = useState(TN_CENTER);
  const [viewZoom, setViewZoom] = useState(7);
  const requestId = useRef(0);

  const loadParcels = (params) => {
    const id = ++requestId.current;
    setLoadingDetails(true);
    setError('');
    fetchVillageParcels(params)
      .then((r) => {
        if (id !== requestId.current) return;
        const records = r.data.data || [];
        setLands(records);
        setSelectedLand(null);
        setSurveyNo('');
        if (records[0]?.coordinates) {
          setViewCenter([records[0].coordinates.lat, records[0].coordinates.lng]);
          setViewZoom(params.village_id ? 17 : params.taluk_id ? 16 : 15);
        }
      })
      .catch(() => {
        if (id !== requestId.current) return;
        setError(t('survey_maps.err_load'));
      })
      .finally(() => {
        if (id !== requestId.current) return;
        setLoadingDetails(false);
      });
  };

  useEffect(() => {
    fetchDistricts().then((r) => setDistricts(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setTaluks([]); setTalukId(''); setVillages([]); setVillageId('');
    setSurveyNums([]); setSurveyNo(''); setSubDivisions([]); setSubDivision('');
    setSelectedLand(null); setError('');
    setLands([]);
    if (!districtId) {
      setViewCenter(TN_CENTER);
      setViewZoom(7);
      return;
    }
    fetchTaluks(districtId).then((r) => setTaluks(r.data.data || [])).catch(() => {});
    const dist = districts.find((d) => String(d.id) === String(districtId));
    if (dist?.code && DISTRICT_CENTERS[dist.code]) {
      setViewCenter(DISTRICT_CENTERS[dist.code]);
    }
    setViewZoom(10);
  }, [districtId]);

  useEffect(() => {
    setVillages([]); setVillageId(''); setSurveyNums([]); setSurveyNo('');
    setSubDivisions([]); setSubDivision('');
    setLands([]);
    if (!talukId) return;
    fetchVillages(talukId).then((r) => setVillages(r.data.data || [])).catch(() => {});
    const taluk = taluks.find((item) => String(item.id) === String(talukId));
    if (taluk?.code && TALUK_CENTERS[taluk.code]) {
      setViewCenter(TALUK_CENTERS[taluk.code]);
    }
    setViewZoom(13);
  }, [talukId]);

  useEffect(() => {
    setSurveyNums([]); setSurveyNo(''); setSubDivisions([]); setSubDivision('');
    setError('');
    if (!villageId) return;
    setLoadingSurveys(true);
    fetchSurveyNumbers({ village_id: villageId, taluk_id: talukId, district_id: districtId })
      .then((r) => setSurveyNums(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingSurveys(false));
    const village = villages.find((v) => String(v.id) === String(villageId));
    if (village?.village_code && VILLAGE_CENTERS[village.village_code]) {
      setViewCenter(VILLAGE_CENTERS[village.village_code]);
      setViewZoom(17);
    } else {
      setViewZoom(16);
    }
    loadParcels({ village_id: villageId, taluk_id: talukId, district_id: districtId });
  }, [villageId]);

  useEffect(() => {
    setSubDivisions([]); setSubDivision('');
    if (!surveyNo) return;
    fetchSubDivisions({
      village_id: villageId, taluk_id: talukId, district_id: districtId, survey_no: surveyNo,
    }).then((r) => setSubDivisions(r.data.data || [])).catch(() => {});
    const match = lands.find((land) => String(land.surveyNumber) === String(surveyNo));
    if (match) {
      setSelectedLand(match);
      if (match.coordinates) {
        setViewCenter([Number(match.coordinates.lat), Number(match.coordinates.lng)]);
        setViewZoom(18);
      }
    }
  }, [surveyNo, lands]);

  const selectPlot = (land) => {
    setSelectedLand(land);
    if (land?.surveyNumber) setSurveyNo(String(land.surveyNumber));
  };

  const surveyOptions = Array.from(new Set([
    ...surveyNums,
    ...lands.map((l) => l.surveyNumber).filter(Boolean),
  ]));

  return (
    <div className="h-screen bg-[#0b3d66] flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="relative min-h-[420px] lg:min-h-0 h-full bg-[#dce6ee]">
          <PattaCadastralMap
            lands={lands}
            selectedLand={selectedLand}
            onSelect={selectPlot}
            basemap={basemap}
            viewCenter={viewCenter}
            viewZoom={viewZoom}
          />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="rounded-full bg-[#0b3d66] text-white text-xs font-semibold px-4 py-1.5 shadow">
              Click on the map to know more details
            </div>
          </div>
          {loadingDetails && (
            <div className="absolute inset-0 z-[550] grid place-items-center bg-black/20 pointer-events-none">
              <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow">
                {t('survey_maps.loading')}
              </span>
            </div>
          )}
          {selectedLand && (
            <div className="absolute left-3 bottom-3 z-[560] w-[min(92vw,320px)] rounded-xl bg-white shadow-xl border border-gray-200 p-3 text-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-[#0b3d66]">Land Parcel Information</h3>
                <button type="button" className="text-gray-400 hover:text-gray-700" onClick={() => setSelectedLand(null)}>×</button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div><strong>District</strong><br />{selectedLand.location?.district || '—'}</div>
                <div><strong>Taluk</strong><br />{selectedLand.location?.taluk || '—'}</div>
                <div><strong>Village</strong><br />{selectedLand.location?.village || '—'}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><strong>Survey No</strong><br />{selectedLand.fullSurveyNo}</div>
                <div><strong>Patta No</strong><br />{selectedLand.pattaNumber}</div>
                <div><strong>Owner</strong><br />{selectedLand.ownerName}</div>
              </div>
            </div>
          )}
        </div>

        <aside className="bg-white border-l border-gray-200 overflow-y-auto p-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0b3d66]">Layers and Tools</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('survey_maps.title')}</p>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 mb-2">Basemaps</div>
            <div className="grid grid-cols-2 gap-2">
              {BASEMAP_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBasemap(option.id)}
                  className={`text-xs rounded-full border px-3 py-1.5 font-semibold ${
                    basemap === option.id
                      ? 'bg-[#0b3d66] text-white border-[#0b3d66]'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <form className="space-y-2.5" onSubmit={(e) => e.preventDefault()}>
            <div className="text-xs font-semibold text-gray-500">{t('survey_maps.lookup')}</div>
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} className="form-input text-sm">
              <option value="">{t('survey_maps.select_district')}</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={talukId} onChange={(e) => setTalukId(e.target.value)} className="form-input text-sm" disabled={!districtId}>
              <option value="">{t('survey_maps.select_taluk')}</option>
              {taluks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={villageId} onChange={(e) => setVillageId(e.target.value)} className="form-input text-sm" disabled={!talukId}>
              <option value="">{t('survey_maps.select_village')}</option>
              {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select value={surveyNo} onChange={(e) => setSurveyNo(e.target.value)} className="form-input text-sm" disabled={!villageId || !lands.length}>
              <option value="">{loadingSurveys ? t('survey_maps.loading') : t('survey_maps.select_survey')}</option>
              {surveyOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {subDivisions.length > 0 && (
              <select value={subDivision} onChange={(e) => setSubDivision(e.target.value)} className="form-input text-sm">
                <option value="">{t('survey_maps.select_sub')}</option>
                {subDivisions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
            {!!lands.length && (
              <p className="text-[11px] text-gray-400">{lands.length} {t('survey_maps.parcels')}</p>
            )}
          </form>

          {selectedLand ? (
            <div className="text-xs rounded-xl border border-gray-200 p-3">
              <h3 className="font-semibold text-sm text-[#0b3d66] mb-2">{t('survey_maps.a_register')}</h3>
              <Field label={t('survey_maps.survey_no')} value={selectedLand.fullSurveyNo} />
              <Field label={t('survey_maps.patta_no')} value={selectedLand.pattaNumber} />
              <Field label={t('survey_maps.owner')} value={selectedLand.ownerName} />
              <Field label={t('survey_maps.father')} value={selectedLand.fatherName} />
              <Field label={t('survey_maps.extent_ac')} value={selectedLand.areaAcres} />
              <Field label={t('survey_maps.extent_ha')} value={selectedLand.areaHectares} />
              <Field label={t('survey_maps.classification')} value={selectedLand.classification || selectedLand.landType} />
              <Field label={t('survey_maps.land_use')} value={selectedLand.landUse} />
              <Field label={t('survey_maps.water')} value={selectedLand.waterSource} />
            </div>
          ) : (
            <p className="text-xs text-gray-400">Select District → Taluk → Village. The map flies like GI Viewer. Survey numbers appear at village zoom. Click a plot for Patta details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
