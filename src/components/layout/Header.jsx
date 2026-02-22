// ============================================
// Header Component with Language Switcher
// ============================================

import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineBars3, HiOutlineBell, HiOutlineGlobeAlt } from 'react-icons/hi2';
import { useState, useRef, useEffect } from 'react';

export default function Header({ onMenuToggle }) {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef(null);

    const languages = [
        { code: 'en', label: 'English', flag: '🇬🇧' },
        { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    ];

    const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

    const switchLanguage = (code) => {
        i18n.changeLanguage(code);
        setLangOpen(false);
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (langRef.current && !langRef.current.contains(e.target)) {
                setLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200">
            <div className="flex items-center justify-between px-4 lg:px-6 py-3">
                {/* Left: Menu toggle + Page title */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMenuToggle}
                        className="lg:hidden p-2 rounded-xl text-surface-500 hover:text-surface-900 hover:bg-gray-100 transition-colors"
                        id="menu-toggle-btn"
                    >
                        <HiOutlineBars3 className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-surface-900">
                            {t('dashboard.welcomeBack')}, <span className="text-gradient">{user?.firstName}</span>
                        </h2>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Language Switcher */}
                    <div className="relative" ref={langRef}>
                        <button
                            onClick={() => setLangOpen(!langOpen)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-surface-500 
                         hover:text-surface-900 hover:bg-gray-100 transition-all duration-200"
                            id="language-switcher-btn"
                        >
                            <HiOutlineGlobeAlt className="w-5 h-5" />
                            <span className="text-sm hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
                        </button>

                        {langOpen && (
                            <div className="absolute right-0 mt-2 w-40 glass-card p-1 animate-slide-up">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => switchLanguage(lang.code)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                      ${i18n.language === lang.code
                                                ? 'bg-primary-50 text-primary-600'
                                                : 'text-surface-500 hover:bg-gray-100'
                                            }`}
                                        id={`lang-${lang.code}-btn`}
                                    >
                                        <span>{lang.flag}</span>
                                        <span>{lang.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notifications */}
                    <button
                        className="relative p-2 rounded-xl text-surface-500 hover:text-surface-900 
                       hover:bg-gray-100 transition-colors"
                        id="notifications-btn"
                    >
                        <HiOutlineBell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>
                </div>
            </div>
        </header>
    );
}
