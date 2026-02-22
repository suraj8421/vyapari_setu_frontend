
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

        // If language is English, just show original (assuming English is source)
        if (i18n.language === 'en') {
            setTranslatedText(text);
            return;
        }

        // 1. Check if it exists in i18n dictionary (for static demo data)
        // We assume keys might be 'products.product_list.Text' or 'products.category_list.Text'
        // But here we need a generic check or just assume it wasn't found if we are here.
        // Actually, we can check if t returns a different string.

        // Let's try to lookup in 'products.product_list' and 'products.category_list' first as fallback
        const staticProduct = t(`products.product_list.${text}`, { defaultValue: null });
        if (staticProduct && staticProduct !== text) {
            setTranslatedText(staticProduct);
            return;
        }

        const staticCategory = t(`products.category_list.${text}`, { defaultValue: null });
        if (staticCategory && staticCategory !== text) {
            setTranslatedText(staticCategory);
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
