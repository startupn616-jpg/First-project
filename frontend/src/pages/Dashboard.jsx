import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const TN_CENTER = [11.1271, 78.6569];

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [userLocation, setUserLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('loading');
  const [mapCenter, setMapCenter] = useState(TN_CENTER);
  const [mapZoom, setMapZoom] = useState(7);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus('default'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(14);
        setGpsStatus('found');
      },
      () => setGpsStatus('default'),
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  const MODULES = [
    {
      to: '/drone', icon: '🚁',
      title: t('dashboard.drone_title'), badge: t('dashboard.drone_badge'), badgeClass: 'badge-blue',
      desc: t('dashboard.drone_desc'), borderColor: 'border-blue-300', hoverBorder: 'hover:border-blue-500', bgGradient: 'from-blue-50 to-sky-50',
    },
    {
      to: '/map', icon: '🗺️',
      title: t('dashboard.map_title'), badge: t('dashboard.map_badge'), badgeClass: 'badge-green',
      desc: t('dashboard.map_desc'), borderColor: 'border-green-300', hoverBorder: 'hover:border-green-500', bgGradient: 'from-green-50 to-emerald-50',
    },
    {
      to: '/data-entry', icon: '📝',
      title: t('dashboard.data_title'), badge: t('dashboard.data_badge'), badgeClass: 'badge-yellow',
      desc: t('dashboard.data_desc'), borderColor: 'border-yellow-300', hoverBorder: 'hover:border-yellow-500', bgGradient: 'from-yellow-50 to-amber-50',
    },
  ];

  const QUICK_STATS = [
    { label: t('dashboard.stat_districts'), value: '37',      icon: '🏛️' },
    { label: t('dashboard.stat_villages'),  value: '15,000+', icon: '🏘️' },
    { label: t('dashboard.stat_analyses'),  value: 'Live',    icon: '🚁' },
    { label: t('dashboard.stat_ai'),        value: 'Claude',  icon: '🤖' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 flex-1 w-full">

        {/* Welcome banner */}
        <div className="gov-card mb-5 sm:mb-6 overflow-hidden p-0 border border-gov-200 shadow-md">
          <div className="grid md:grid-cols-2">

            {/* Left: welcome text + stats */}
            <div className="p-4 sm:p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌾</span>
                <span className="badge-green text-xs font-semibold uppercase tracking-wider px-2 py-0.5">
                  {t('dashboard.badge')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gov-800 leading-tight">
                {t('dashboard.welcome')}, {user?.fullName?.split(' ')[0] || user?.username}
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-2 leading-relaxed">
                {t('dashboard.subtitle')}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {QUICK_STATS.map((s) => (
                  <div key={s.label} className="bg-gov-50 border border-gov-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="text-lg">{s.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-gov-800 leading-tight">{s.value}</div>
                      <div className="text-xs text-gray-500 leading-tight">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: GPS mini-map */}
            <div className="relative min-h-[220px] sm:min-h-[300px]">
              {gpsStatus === 'loading' ? (
                <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-gov-600 border-t-transparent rounded-full spin" />
                  <p className="text-sm text-gray-500 font-medium">{t('dashboard.gps_loading')}</p>
                </div>
              ) : (
                <>
                  <MapContainer center={mapCenter} zoom={mapZoom} zoomControl={false}
                    attributionControl={false} scrollWheelZoom={false} dragging={false}
                    style={{ height: '100%', width: '100%', minHeight: '220px' }}>
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={19}
                    />
                    {userLocation ? (
                      <Marker position={userLocation}>
                        <Popup><strong>📍 {t('dashboard.gps_found')}</strong><br />{userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}</Popup>
                      </Marker>
                    ) : (
                      <Marker position={TN_CENTER}>
                        <Popup><strong>🌾 Tamil Nadu</strong><br />{t('dashboard.gps_none')}</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
                    <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                      {gpsStatus === 'found'
                        ? `📍 ${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`
                        : `🗺️ ${t('dashboard.gps_none')}`}
                    </div>
                    <Link to="/map"
                      className="pointer-events-auto bg-gov-700 hover:bg-gov-800 text-white text-xs px-2 py-1 rounded-md transition-colors">
                      {t('dashboard.full_map')}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Module cards */}
        <h2 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {t('dashboard.modules_heading')}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-8">
          {MODULES.map((mod) => (
            <Link key={mod.to} to={mod.to}
              className={`gov-card bg-gradient-to-br ${mod.bgGradient} border-2 ${mod.borderColor} ${mod.hoverBorder}
                transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group block`}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-200 select-none leading-none">
                  {mod.icon}
                </span>
                <span className={`${mod.badgeClass} text-xs font-semibold`}>{mod.badge}</span>
              </div>
              <h3 className="font-bold text-gray-800 text-sm sm:text-base mb-1">{mod.title}</h3>
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{mod.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-gov-700 text-sm font-semibold group-hover:gap-2 transition-all">
                <span>{t('dashboard.open')}</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          {t('dashboard.footer')}
        </div>
      </main>
    </div>
  );
}
