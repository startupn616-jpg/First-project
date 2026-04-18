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
    if (isAuthenticated) navigate('/', { replace: true });
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
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t('login.err_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gov-950 via-gov-800 to-gov-600 flex flex-col items-center justify-center px-4">

      {/* Lang toggle top-right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleLang}
          className="text-xs bg-gov-700/80 hover:bg-gov-600 border border-gov-500 text-white px-3 py-1.5 rounded-lg font-semibold"
        >
          {t('lang_switch')}
        </button>
      </div>

      {/* Government header */}
      <div className="text-center mb-6 text-white">
        <div className="text-xs uppercase tracking-widest text-gov-300 mb-1">{t('gov_name')}</div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{t('app_name')}</h1>
        <p className="text-gov-200 text-sm mt-1">{t('app_subtitle')}</p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-gov-600 via-green-400 to-earth-500" />

        <div className="p-6 sm:p-8">
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
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
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
