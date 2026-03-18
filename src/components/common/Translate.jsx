
// ============================================
// Translate Component for Dynamic Translation
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const translationCache = {};

export default function Translate({ text }) {
    const { i18n, t } = useTranslation();
    const [translatedText, setTranslatedText] = useState(text);

    useEffect(() => {
        // If text is empty, return empty
        if (!text) {
            setTranslatedText('');
            return;
        }

        // If language starts with 'en', just show original (assuming English is source)
        if (i18n.language && i18n.language.startsWith('en')) {
            setTranslatedText(text);
            return;
        }

        // 1. Check if it exists in i18n dictionary (for static demo data)
        // Corrected keys to match en.js structure (product_list and category_list)
        const productKey = `product_list.${text}`;
        if (i18n.exists(productKey)) {
            setTranslatedText(t(productKey));
            return;
        }

        const categoryKey = `category_list.${text}`;
        if (i18n.exists(categoryKey)) {
            setTranslatedText(t(categoryKey));
            return;
        }

        // 2. Check local cache
        const cacheKey = `${text}_${i18n.language}`;
        if (translationCache[cacheKey]) {
            setTranslatedText(translationCache[cacheKey]);
            return;
        }

        // 3. Fallback: Call Backend Translate API
        let isMounted = true;
        const fetchTranslation = async () => {
            try {
                const token = localStorage.getItem('token');
                // Use environment variable for URL if possible, otherwise default
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

                const res = await fetch(`${baseUrl}/translate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ text, targetLang: i18n.language })
                });

                if (!res.ok) throw new Error('Failed');

                const data = await res.json();
                if (isMounted && data.status === 'success') {
                    translationCache[cacheKey] = data.data;
                    setTranslatedText(data.data);
                } else if (isMounted) {
                    setTranslatedText(text); // Fallback
                }
            } catch (err) {
                // console.error(err); // Silence errors in production
                if (isMounted) setTranslatedText(text);
            }
        };

        fetchTranslation();

        return () => { isMounted = false; };

    }, [text, i18n.language]); // Removed 't' to avoid loops if t changes frequently (it shouldn't but safer)

    return <>{translatedText}</>;
}
