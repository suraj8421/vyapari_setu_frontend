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
    const processImage = useCallback(async (imageDataUrl) => {
        setIsProcessing(true);
        setProgress(30);
        setError(null);

        try {
            // Convert DataURL to Blob for backend upload
            const blob = await fetch(imageDataUrl).then(res => res.blob());
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            
            const formData = new FormData();
            formData.append('document', file);
            formData.append('contextType', contextType || '');

            const res = await scannerAPI.processImage(formData);
            const data = res.data?.data || res.data;

            if (data) {
                const standardized = standardizeData(data.extracted || data);
                onScanComplete?.(standardized);
                toast.success('AI Vision capture successful!');
                return standardized;
            }
        } catch (err) {
            console.error('[useSmartScan] processImage error:', err);
            setError('AI parsing failed');
            toast.error('AI Vision could not read the capture. Please try again.');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    }, [onScanComplete, standardizeData, contextType]);

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
        setError(null);
        try {
            const formData = new FormData();
            formData.append('document', file);
            formData.append('contextType', contextType || '');
            
            const res = await scannerAPI.processDocument(formData);
            const responseData = res?.data?.data || res?.data || {};

            if (responseData.type === 'MULTI_PRODUCT_DOC' && Array.isArray(responseData.items)) {
                const extractedItems = responseData.items.map(item => ({
                    ...item.extracted,
                    productId: item.existingProduct?.id || '',
                    productName: item.extracted?.name || '',
                    unitPrice: contextType === 'sale' 
                        ? (item.extracted?.sellingPrice || item.extracted?.unitPrice || 0)
                        : (item.extracted?.costPrice || item.extracted?.unitPrice || 0),
                    quantity: item.extracted?.quantity || 1,
                    unit: item.extracted?.unit || 'PCS',
                    gstRate: item.extracted?.gstRate || 0,
                }));

                const docMetadata = responseData.metadata || {};
                onScanComplete?.('BULK_IMPORT', extractedItems, docMetadata);
                toast.success(`Scanned ${extractedItems.length} items from document!`);
                return extractedItems;
            }

            const standardized = standardizeData(responseData.extracted || responseData);
            onScanComplete?.(standardized);
            return standardized;
        } catch (err) {
            console.error('[useSmartScan] handleFileUpload error:', err);
            setError('File processing failed');
            toast.error('Failed to parse document. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    }, [onScanComplete, standardizeData, contextType]);


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
