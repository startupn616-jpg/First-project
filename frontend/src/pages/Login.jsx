import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { loginApi } from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const { t, toggleLang, lang } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/map', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError(t('login.err_empty'));
      return;
    }
    setLoading(true);
    try {
      const res = await loginApi(username.trim(), password);
      flushSync(() => { login(res.data.token, res.data.user); });
      navigate('/map', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t('login.err_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#071b35] flex flex-col items-center justify-center px-4">
      <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-cyan-400/30 blur-3xl animate-pulse" />
      <div className="absolute -bottom-28 -right-20 w-[28rem] h-[28rem] rounded-full bg-green-400/25 blur-3xl animate-pulse" />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

      {/* Lang toggle top-right */}
      <div className="absolute z-10 top-4 right-4">
        <button
          onClick={toggleLang}
          className="text-xs bg-gov-700/80 hover:bg-gov-600 border border-gov-500 text-white px-3 py-1.5 rounded-lg font-semibold"
        >
          {t('lang_switch')}
        </button>
      </div>

      {/* Government header */}
      <div className="relative z-10 text-center mb-6 text-white">
        <div className="mx-auto mb-3 h-16 w-16 rounded-2xl border border-white/30 bg-white/15 shadow-[0_16px_35px_rgba(0,0,0,0.35)] backdrop-blur grid place-items-center text-3xl transform rotate-3">🌾</div>
        <div className="text-xs uppercase tracking-widest text-gov-200 mb-1">{t('gov_name')}</div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-lg">{t('app_name')}</h1>
        <p className="text-gov-200 text-sm mt-1">{t('app_subtitle')}</p>
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm bg-white/95 backdrop-blur rounded-3xl border border-white/70 shadow-[0_28px_70px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-gov-600 via-green-400 to-earth-500" />

        <div className="p-6 sm:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-gov-50 px-3 py-1 text-xs font-semibold text-gov-700">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Secure officer portal
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">{t('login.title')}</h2>
          <p className="text-xs text-gray-500 mb-6">{t('login.subtitle')}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t('login.username')}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder={t('login.username_ph')}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t('login.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10"
                  placeholder={t('login.password_ph')}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  {showPassword ? t('login.hide') : t('login.show')}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2 py-3 shadow-lg shadow-gov-700/30 hover:-translate-y-0.5 transition-transform"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spin" />
                  {t('login.submitting')}
                </>
              ) : t('login.submit')}
            </button>
          </form>

          <div className="mt-6 p-3 bg-gov-50 rounded-lg border border-gov-100">
            <p className="text-xs font-semibold text-gov-700 mb-1.5">{t('login.test_creds')}</p>
            <div className="text-xs text-gray-600 space-y-0.5">
              <div>👤 <strong>admin</strong> / Admin@123</div>
              <div>👤 <strong>officer1</strong> / Officer@123</div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-gov-400 text-xs mt-6">
        {t('copyright', { year: new Date().getFullYear() })}
      </p>
    </div>
  );
}
