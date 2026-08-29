import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  ['📷', 'Upload or capture images', 'Upload DJI/media-gallery images or capture a field photo with your phone camera.'],
  ['🤖', 'Analyze crops with AI', 'Review crop, soil, irrigation, pest, and field-health observations.'],
  ['🗺️', 'Locate the survey parcel', 'Match GPS coordinates to nearby land parcels and survey numbers.'],
];

export default function Landing() {
  const { isAuthenticated, loading } = useAuth();
  const destination = isAuthenticated ? '/map' : '/login';

  return (
    <main className="min-h-screen bg-gradient-to-br from-gov-950 via-gov-800 to-gov-600 text-white">
      <header className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="w-10 h-10 bg-white rounded-full grid place-items-center text-gov-800 font-black text-xs">AV</span>
          <span>
            <span className="font-black text-xl block leading-tight">Agro Vision TN</span>
            <span className="text-gov-200 text-xs">தமிழ்நாடு வேளாண்மை & நில அளவீடு</span>
          </span>
        </Link>
        {!loading && (
          <Link to={destination} className="rounded-lg bg-white text-gov-800 px-4 py-2 text-sm font-semibold hover:bg-gov-50">
            {isAuthenticated ? 'Open dashboard' : 'Officer login'}
          </Link>
        )}
      </header>

      <section className="max-w-6xl mx-auto px-5 pt-14 pb-20 text-center">
        <p className="inline-block rounded-full border border-gov-400 bg-gov-900/30 px-3 py-1 text-xs font-semibold tracking-wide">
          TAMIL NADU LAND & AGRICULTURE SURVEY
        </p>
        <h1 className="mt-5 text-4xl sm:text-6xl font-black leading-tight">
          From field image to<br />survey parcel.
        </h1>
        <p className="max-w-2xl mx-auto mt-5 text-gov-100 text-base sm:text-lg leading-relaxed">
          Agro Vision TN — a single workspace for geotagged agricultural image analysis, Tamil Nilam survey lookup, and parcel mapping.
        </p>
        <Link to={destination} className="inline-flex mt-8 rounded-xl bg-green-400 hover:bg-green-300 text-gov-950 px-6 py-3 font-bold">
          {isAuthenticated ? 'Go to dashboard' : 'Sign in to start'}
        </Link>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-16 grid md:grid-cols-3 gap-4">
        {FEATURES.map(([icon, title, description]) => (
          <article key={title} className="rounded-2xl border border-gov-500/70 bg-white/10 backdrop-blur p-5 text-left">
            <span className="text-3xl">{icon}</span>
            <h2 className="mt-3 font-bold text-lg">{title}</h2>
            <p className="mt-1 text-sm text-gov-100 leading-relaxed">{description}</p>
          </article>
        ))}
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-16">
        <h2 className="text-center text-xl sm:text-2xl font-bold mb-2">தமிழ் பணிப்பாய்வு</h2>
        <p className="text-center text-gov-200 text-sm mb-5">படம் பதிவேற்றம் → GPS இடம் → AI பகுப்பாய்வு → அதிகாரி சரிபார்ப்பு → நிலப் பதிவு</p>
        <img
          src="/agro-vision-tn-workflow-ta.jpg"
          alt="Agro Vision TN Tamil workflow"
          className="w-full rounded-2xl border border-gov-500/50 shadow-xl bg-white"
        />
      </section>

      <p className="pb-6 text-center text-xs text-gov-300">
        DJI Neo 2 media is supported through post-capture image upload and EXIF GPS extraction. Flight control is not available.
      </p>
    </main>
  );
}
