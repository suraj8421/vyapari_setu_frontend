// ============================================
// Login Page
// ============================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';

export default function LoginPage() {
    const { t, i18n } = useTranslation();
    const { login, loading, error, setError } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userData = await login(form.email, form.password);
            if (userData?.role === 'SUPERADMIN') {
                navigate('/superadmin');
            } else {
                navigate('/dashboard');
            }
        } catch (_) {
            // Error handled by context
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-background-cream">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl 
                          bg-gradient-to-br from-primary-500 to-accent-500 
                          shadow-2xl shadow-primary-500/30 mb-4">
                        <span className="text-3xl font-bold text-white">V</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gradient mb-1">{t('common.appName')}</h1>
                    <p className="text-surface-500 text-sm">{t('common.tagline')}</p>
                </div>

                {/* Card */}
                <div className="glass-card p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-surface-900">{t('auth.loginTitle')}</h2>
                        <p className="text-sm text-surface-500 mt-1">{t('auth.loginSubtitle')}</p>
                    </div>

                    {/* Language Toggle */}
                    <div className="flex justify-center gap-2 mb-6">
                        {['en', 'hi'].map((lang) => (
                            <button
                                key={lang}
                                onClick={() => i18n.changeLanguage(lang)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all
                  ${i18n.language === lang
                                        ? 'bg-primary-50 text-primary-600 border border-primary-200'
                                        : 'text-surface-500 hover:text-surface-900 border border-gray-200'
                                    }`}
                            >
                                {lang === 'en' ? '🇬🇧 English' : '🇮🇳 हिंदी'}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="input-label">{t('auth.email')}</label>
                            <div className="relative">
                                <HiOutlineEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                                <input
                                    type="email"
                                    id="login-email"
                                    className="input-field pl-11"
                                    placeholder="admin@khata.com"
                                    value={form.email}
                                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(null); }}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="input-label">{t('auth.password')}</label>
                            <div className="relative">
                                <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="login-password"
                                    className="input-field pl-11 pr-11"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(null); }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                                >
                                    {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            id="login-submit-btn"
                            className="btn-primary w-full py-3 text-base disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeOpacity="0.3" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                                    </svg>
                                    {t('auth.loggingIn')}
                                </span>
                            ) : (
                                t('auth.signIn')
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-surface-500 mt-6">
                        {t('auth.noAccount')}{' '}
                        <Link to="/register" className="text-primary-600 hover:text-primary-500 font-medium">
                            {t('auth.signUp')}
                        </Link>
                    </p>
                </div>

                {/* Demo credentials hint */}
                <div className="mt-4 p-3 rounded-xl bg-surface-800/50 border border-surface-700/50 text-center">
                    <p className="text-xs text-surface-500">Demo Credentials</p>
                    <p className="text-xs text-surface-400 mt-1">
                        Super Admin: <span className="text-primary-400">super@vyaparisetu.com</span> / <span className="text-primary-400">admin123</span>
                    </p>
                    <p className="text-xs text-surface-400">
                        Admin: <span className="text-primary-400">admin@vyaparisetu.com</span> / <span className="text-primary-400">admin123</span>
                    </p>
                    <p className="text-xs text-surface-400">
                        Staff: <span className="text-primary-400">staff@vyaparisetu.com</span> / <span className="text-primary-400">admin123</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
