import { useState, useCallback, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { toast } from 'react-hot-toast';
import { scannerAPI } from '../services/api';

/**
 * useSmartScan Hook
 * The central logic engine for context-aware scanning.
 */
export const useSmartScan = ({ contextType, onScanComplete }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    // Voice recognition ref
    const recognitionRef = useRef(null);
    const [isListening, setIsListening] = useState(false);

    // ─── Standardized Data Parser ───────────────────────────────────
    // Maps raw extraction strings/objects to the required schema
    const standardizeData = useCallback((raw) => {
        const data = {
            name: raw.name || '',
            price: Number(raw.price || raw.amount || raw.rate || 0),
            quantity: Number(raw.quantity || raw.qty || 1),
            unit: raw.unit || 'PCS',
            gst: Number(raw.gst || raw.gstRate || 0),
            hsn: raw.hsn || raw.hsnCode || '',
            barcode: raw.barcode || '',
            phone: raw.phone || raw.mobile || '',
            email: raw.email || '',
            address: raw.address || '',
            items: raw.items || []
        };

        // Context-specific intelligent defaults
        if (contextType === 'expense' && !data.name) data.name = 'Miscellaneous Expense';
        if (contextType === 'supplier' && !data.name) data.name = 'New Supplier';

        return data;
    }, [contextType]);

    // ─── Barcode Logic ──────────────────────────────────────────────
    const handleBarcodeDetected = useCallback(async (barcode) => {
        setIsProcessing(true);
        try {
            const res = await scannerAPI.lookupBarcode(barcode);
            const product = res.data;
            
            if (product) {
                const standardized = standardizeData({
                    name: product.name,
                    price: product.sellingPrice,
                    barcode: product.barcode,
                    unit: product.unit,
                    gst: product.gstRate,
                    hsn: product.hsnCode
                });
                onScanComplete?.(standardized);
                return { success: true, data: standardized };
            } else {
                // Return just the barcode so the parent can open "Create New"
                const fallback = standardizeData({ barcode });
                onScanComplete?.(fallback);
                return { success: true, isNew: true, barcode };
            }
        } catch (err) {
            setError('Barcode lookup failed');
            return { success: false };
        } finally {
            setIsProcessing(false);
        }
    }, [onScanComplete, standardizeData]);

    // ─── OCR Logic (Label/Bill) ─────────────────────────────────────
    const processImage = useCallback(async (imageSource) => {
        setIsProcessing(true);
        setProgress(0);
        setError(null);

        try {
            const { data: { text } } = await Tesseract.recognize(imageSource, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') setProgress(Math.floor(m.progress * 100));
                }
            });

            // Simple heuristic parsing (can be made much more complex with Regex)
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            const raw = {};

            // Heuristic Examples:
            // 1. Find Price/Amount (e.g., "Total: 500" or "Rs. 200")
            const amountMatch = text.match(/(?:total|amount|rs|₹|price)[\s:]*([\d,.]+)/i);
            if (amountMatch) raw.price = amountMatch[1].replace(/,/g, '');

            // 2. Find Phone (e.g., "+91 9876543210")
            const phoneMatch = text.match(/(?:\+91|0)?\s?[6-9]\d{9}/);
            if (phoneMatch) raw.phone = phoneMatch[0].replace(/\s/g, '');

            // 3. Find Email
            const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (emailMatch) raw.email = emailMatch[0];

            // 4. Name (usually first line if it's a card or top of receipt)
            raw.name = lines[0];

            const standardized = standardizeData(raw);
            onScanComplete?.(standardized);
            return standardized;
        } catch (err) {
            setError('OCR processing failed');
            toast.error('Could not read text from image');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    }, [onScanComplete, standardizeData]);

    // ─── Voice Logic ────────────────────────────────────────────────
    const startVoice = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Voice recognition not supported in this browser');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Voice Transcript:', transcript);
            
            // Simple voice parsing logic: "Product Name [at] Price [quantity] Unit"
            // Example: "Amul Butter 500 grams 240 rupees"
            const raw = { name: transcript };
            
            const priceMatch = transcript.match(/(\d+)\s*(?:rupees|rs|inr)/i);
            if (priceMatch) raw.price = priceMatch[1];

            const qtyMatch = transcript.match(/(\d+)\s*(?:kg|grams|liters|pcs|box|units)/i);
            if (qtyMatch) raw.quantity = qtyMatch[1];

            const standardized = standardizeData(raw);
            onScanComplete?.(standardized);
        };

        recognition.onerror = (event) => {
            console.error('Voice Error:', event.error);
            setIsListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
    }, [onScanComplete, standardizeData]);

    const stopVoice = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    // ─── File Upload Logic ──────────────────────────────────────────
    const handleFileUpload = useCallback(async (file) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await scannerAPI.processDocument(formData);
            const standardized = standardizeData(res.data); // Backend returns structured multi-item data
            onScanComplete?.(standardized);
            return standardized;
        } catch (err) {
            setError('File processing failed');
            toast.error('Failed to parse document');
        } finally {
            setIsProcessing(false);
        }
    }, [onScanComplete, standardizeData]);

    return {
        isProcessing,
        progress,
        error,
        handleBarcodeDetected,
        processImage,
        startVoice,
        stopVoice,
        isListening,
        handleFileUpload
    };
};
