// ============================================
// AI Bill Scanner (OCR + Voice Input)
// ============================================
// Features:
//   1. Tesseract.js OCR — extracts text from bill/label images
//   2. Web Speech API — voice-to-text for quick entry
//   3. Smart field detection — maps extracted text to form fields
//   4. Review form with field-level checkboxes before saving

// Static import so Vite can resolve it at build time
import * as Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { useState, useRef, useCallback, useEffect } from 'react';

// Set up PDF.js worker using a CDN for convenience (matches installed version)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
    HiOutlineSparkles,
    HiOutlineMicrophone,
    HiOutlinePhoto,
    HiOutlineXMark,
    HiOutlineArrowPath,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineDocumentText,
    HiOutlineCpuChip,
} from 'react-icons/hi2';

// ── Smart Field Extraction ────────────────────────────────────
// Attempts to parse raw OCR text into structured product fields
function extractFieldsFromOCR(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const fields = {};

    // Try to extract product name (first non-numeric, non-symbol line)
    const nameLine = lines.find(l => /^[a-zA-Z\u0900-\u097F]/.test(l) && l.length > 3);
    if (nameLine) fields.name = nameLine;

    // Try to extract price (₹ or Rs or numeric with decimals)
    for (const line of lines) {
        const priceMatch = line.match(/(?:₹|Rs\.?\s*)(\d[\d,]*(?:\.\d{1,2})?)/i);
        if (priceMatch) { fields.sellingPrice = priceMatch[1].replace(/,/g, ''); break; }
    }

    // Try to extract MRP
    for (const line of lines) {
        const mrpMatch = line.match(/MRP[:\s]*(?:₹|Rs\.?\s*)(\d[\d,]*(?:\.\d{1,2})?)/i);
        if (mrpMatch) { fields.costPrice = mrpMatch[1].replace(/,/g, ''); break; }
    }

    // Try to extract quantity/weight (e.g., "500g", "1kg", "250ml")
    for (const line of lines) {
        const qtyMatch = line.match(/(\d+)\s*(g|kg|ml|L|pcs|pieces?|pack)/i);
        if (qtyMatch) { fields.unit = qtyMatch[2].toLowerCase(); fields.quantity = qtyMatch[1]; break; }
    }

    // Try to extract barcode (long numeric sequences)
    for (const line of lines) {
        const bcMatch = line.match(/\b(\d{8,13})\b/);
        if (bcMatch) { fields.barcode = bcMatch[1]; break; }
    }

    // Try to extract HSN code
    for (const line of lines) {
        const hsnMatch = line.match(/HSN[:\s]*(\d{4,8})/i);
        if (hsnMatch) { fields.hsn = hsnMatch[1]; break; }
    }

    // Try to extract category from common keywords
    const categoryKeywords = {
        'dairy': ['milk', 'cheese', 'butter', 'paneer', 'curd', 'yogurt'],
        'grocery': ['rice', 'wheat', 'flour', 'sugar', 'salt', 'oil', 'dal'],
        'beverage': ['juice', 'water', 'drink', 'cola', 'tea', 'coffee'],
        'snack': ['chips', 'biscuit', 'namkeen', 'crackers', 'wafer'],
        'personal care': ['soap', 'shampoo', 'cream', 'lotion', 'paste', 'toothbrush'],
    };
    const fullText = rawText.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => fullText.includes(kw))) {
            fields.category = cat;
            break;
        }
    }

    return fields;
}

// ── Extract fields from voice transcript ─────────────────────
function extractFromVoice(transcript) {
    const text = transcript.toLowerCase();
    const fields = {};

    // Price pattern: "price 50 rupees" or "fifty rupees"
    const priceMatch = text.match(/(?:price|cost|rate|selling)[:\s]+(?:is\s+)?(?:rupees?\s+)?(\d+)/i);
    if (priceMatch) fields.sellingPrice = priceMatch[1];

    // Quantity: "quantity 100 kg"
    const qtyMatch = text.match(/quantity[:\s]+(\d+)\s*(kg|g|ltr|ml|pcs|pieces?|box|pack)?/i);
    if (qtyMatch) {
        fields.quantity = qtyMatch[1];
        if (qtyMatch[2]) fields.unit = qtyMatch[2];
    }

    // Name: "product name is XYZ" or "item name XYZ"
    const nameMatch = text.match(/(?:product|item)\s+name\s+(?:is\s+)?(.+?)(?:price|$)/i);
    if (nameMatch) fields.name = nameMatch[1].trim();

    return fields;
}

// ── Main AI Scanner Component ─────────────────────────────────
export default function AIScanner({ isOpen, onClose, onApply, context = 'product' }) {
    const { t } = useTranslation();
    const [mode, setMode] = useState('ocr'); // 'ocr' | 'voice'
    const [ocrStatus, setOcrStatus] = useState('idle'); // 'idle' | 'loading' | 'done' | 'error'
    const [extractedFields, setExtractedFields] = useState({});
    const [selectedFields, setSelectedFields] = useState({});
    const [rawText, setRawText] = useState('');
    const [voiceActive, setVoiceActive] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileRef = useRef(null);
    const recognitionRef = useRef(null);

    // Clear state when modal opens
    useEffect(() => {
        if (isOpen) {
            setOcrStatus('idle');
            setExtractedFields({});
            setSelectedFields({});
            setRawText('');
            setVoiceTranscript('');
            setPreviewUrl(null);
            setVoiceActive(false);
            setMode('ocr');
        }
    }, [isOpen]);

    // ── File Processing (Image or PDF) ─────────────────────────
    const processFile = useCallback(async (file) => {
        if (!file) return;

        setOcrStatus('loading');
        let imageToProcess = file;

        try {
            // Handle PDF conversion
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                // Process the first page
                const page = await pdf.getPage(1);
                // Use scale 2.0 for higher resolution (better for OCR)
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport }).promise;

                // Convert canvas to blob for Tesseract
                imageToProcess = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
                setPreviewUrl(canvas.toDataURL('image/jpeg'));
            } else {
                setPreviewUrl(URL.createObjectURL(file));
            }

            // OCR Logic using Tesseract
            const createWorker = Tesseract.createWorker;
            const worker = await createWorker('eng', 1, {
                logger: () => { /* suppress logs */ },
            });
            const { data: { text } } = await worker.recognize(imageToProcess);
            await worker.terminate();

            setRawText(text);
            const fields = extractFieldsFromOCR(text);
            setExtractedFields(fields);

            // Select all detected fields by default
            const initialSelected = {};
            Object.keys(fields).forEach(k => { initialSelected[k] = true; });
            setSelectedFields(initialSelected);

            if (Object.keys(fields).length === 0) {
                setOcrStatus('error');
                toast.error('Could not extract data. Try a clearer document or image.');
            } else {
                setOcrStatus('done');
                toast.success(`Extracted ${Object.keys(fields).length} field(s) successfully!`);
            }
        } catch (err) {
            console.error('[AI Scanner] Error:', err);
            setOcrStatus('error');
            toast.error('Processing failed. Please try again.');
        }
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            processFile(file);
        }
    };

    // ── Voice Recognition ─────────────────────────────────────
    const startVoice = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error('Voice recognition is not supported in your browser. Try Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Indian English
        recognitionRef.current = recognition;

        recognition.onresult = (e) => {
            let transcript = '';
            for (let i = 0; i < e.results.length; i++) {
                transcript += e.results[i][0].transcript;
            }
            setVoiceTranscript(transcript);

            // Live field extraction
            const fields = extractFromVoice(transcript);
            if (Object.keys(fields).length > 0) {
                setExtractedFields(fields);
                const initialSelected = {};
                Object.keys(fields).forEach(k => { initialSelected[k] = true; });
                setSelectedFields(initialSelected);
            }
        };

        recognition.onerror = (e) => {
            console.error('[Voice] Error:', e);
            setVoiceActive(false);
        };

        recognition.onend = () => {
            setVoiceActive(false);
        };

        recognition.start();
        setVoiceActive(true);
        setOcrStatus('idle');
        setExtractedFields({});
    }, []);

    const stopVoice = useCallback(() => {
        recognitionRef.current?.stop();
        setVoiceActive(false);
        if (voiceTranscript) {
            const fields = extractFromVoice(voiceTranscript);
            setExtractedFields(fields);
            const initialSelected = {};
            Object.keys(fields).forEach(k => { initialSelected[k] = true; });
            setSelectedFields(initialSelected);
            setOcrStatus('done');
        }
    }, [voiceTranscript]);

    // Cleanup voice on unmount
    useEffect(() => {
        return () => recognitionRef.current?.stop();
    }, []);

    // ── Apply selected fields ─────────────────────────────────
    const handleApply = () => {
        const filtered = {};
        Object.entries(selectedFields).forEach(([k, checked]) => {
            if (checked && extractedFields[k] !== undefined) {
                filtered[k] = extractedFields[k];
            }
        });
        onApply(filtered);
        onClose();
    };

    const FIELD_LABELS = {
        name: 'Product Name',
        sellingPrice: 'Selling Price',
        costPrice: 'Cost / MRP',
        barcode: 'Barcode',
        unit: 'Unit',
        quantity: 'Qty / Weight',
        hsn: 'HSN Code',
        category: 'Category',
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-violet-600 to-purple-600">
                        <HiOutlineSparkles className="w-6 h-6 text-white" />
                        <div className="flex-1">
                            <h2 className="text-white font-bold text-lg">AI Data Extractor</h2>
                            <p className="text-violet-200 text-xs">Scan a bill, label, or speak to fill fields</p>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                            <HiOutlineXMark className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex border-b border-gray-100">
                        {[
                            { id: 'ocr', label: 'Scan Image / Bill', Icon: HiOutlinePhoto },
                            { id: 'voice', label: 'Voice Input', Icon: HiOutlineMicrophone },
                        ].map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                onClick={() => { setMode(id); setOcrStatus('idle'); setExtractedFields({}); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors
                                    ${mode === id
                                        ? 'bg-violet-50 text-violet-600 border-b-2 border-violet-500'
                                        : 'text-surface-500 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

                        {/* ── OCR Mode ── */}
                        {mode === 'ocr' && (
                            <>
                                {ocrStatus === 'idle' && (
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={e => e.preventDefault()}
                                        onClick={() => fileRef.current?.click()}
                                        className="border-2 border-dashed border-violet-200 rounded-xl p-8 text-center cursor-pointer
                                                   hover:border-violet-400 hover:bg-violet-50 transition-all"
                                    >
                                        <HiOutlinePhoto className="w-12 h-12 mx-auto text-violet-300 mb-3" />
                                        <p className="font-semibold text-surface-700">Drop image/PDF or click to upload</p>
                                        <p className="text-sm text-surface-400 mt-1">
                                            Supports invoices, product labels, receipts, and packaging (PDF/JPG/PNG)
                                        </p>
                                        <p className="text-xs text-violet-500 mt-3 font-medium">
                                            Powered by Tesseract.js & PDF.js
                                        </p>
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                )}

                                {ocrStatus === 'loading' && (
                                    <div className="text-center py-8">
                                        {previewUrl && (
                                            <img src={previewUrl} alt="Preview" className="w-32 h-32 object-cover rounded-xl mx-auto mb-4 shadow-md" />
                                        )}
                                        <HiOutlineCpuChip className="w-8 h-8 mx-auto text-violet-500 animate-pulse mb-2" />
                                        <p className="font-semibold text-surface-700">Analysing document...</p>
                                        <p className="text-sm text-surface-400 mt-1">Running OCR engine, please wait</p>
                                        <div className="mt-3 flex justify-center gap-1">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                                                    style={{ animationDelay: `${i * 0.15}s` }} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {ocrStatus === 'error' && (
                                    <div className="text-center py-6 text-red-500">
                                        <HiOutlineExclamationTriangle className="w-10 h-10 mx-auto mb-2" />
                                        <p className="font-semibold">Could not extract data</p>
                                        <p className="text-sm mt-1 text-surface-500">
                                            The document may be blurry or contains no recognizable text.
                                        </p>
                                        {rawText && (
                                            <pre className="text-left text-xs bg-gray-50 rounded-lg p-3 mt-2 max-h-24 overflow-y-auto text-surface-600">
                                                {rawText.slice(0, 300)}
                                            </pre>
                                        )}
                                        <button
                                            onClick={() => { setOcrStatus('idle'); setPreviewUrl(null); }}
                                            className="mt-3 px-4 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-sm font-semibold"
                                        >
                                            Try Another File
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── Voice Mode ── */}
                        {mode === 'voice' && (
                            <div className="text-center py-4 space-y-4">
                                <div className="relative inline-block">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto
                                        ${voiceActive
                                            ? 'bg-red-100 ring-4 ring-red-300 ring-opacity-60 animate-pulse'
                                            : 'bg-violet-100'}`}
                                    >
                                        <HiOutlineMicrophone className={`w-10 h-10 ${voiceActive ? 'text-red-500' : 'text-violet-500'}`} />
                                    </div>
                                </div>

                                <div>
                                    <p className="font-semibold text-surface-700">
                                        {voiceActive ? 'Listening...' : 'Click to start voice input'}
                                    </p>
                                    <p className="text-xs text-surface-400 mt-1">
                                        Say: "Product name is Amul Butter, price 55 rupees, quantity 100 grams"
                                    </p>
                                </div>

                                {voiceTranscript && (
                                    <div className="text-left bg-gray-50 rounded-xl p-3 text-sm text-surface-600 italic">
                                        "{voiceTranscript}"
                                    </div>
                                )}

                                <button
                                    onClick={voiceActive ? stopVoice : startVoice}
                                    className={`px-6 py-3 rounded-xl font-bold text-white transition-all
                                        ${voiceActive
                                            ? 'bg-red-500 hover:bg-red-600'
                                            : 'bg-violet-600 hover:bg-violet-700'}`}
                                >
                                    {voiceActive ? 'Stop & Extract' : 'Start Recording'}
                                </button>

                                <p className="text-xs text-surface-400">
                                    Powered by Web Speech API · Works best in Chrome
                                </p>
                            </div>
                        )}

                        {/* ── Extracted Fields Review ── */}
                        {Object.keys(extractedFields).length > 0 && (
                            <div className="border border-violet-100 rounded-xl overflow-hidden">
                                <div className="bg-violet-50 px-4 py-2 flex items-center gap-2">
                                    <HiOutlineCheckCircle className="w-4 h-4 text-violet-600" />
                                    <span className="text-sm font-bold text-violet-700">
                                        {Object.keys(extractedFields).length} field(s) extracted — select to apply
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {Object.entries(extractedFields).map(([key, value]) => (
                                        <label
                                            key={key}
                                            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedFields[key] || false}
                                                onChange={e => setSelectedFields(prev => ({ ...prev, [key]: e.target.checked }))}
                                                className="w-4 h-4 accent-violet-600 rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-surface-400 uppercase font-semibold tracking-wide">
                                                    {FIELD_LABELS[key] || key}
                                                </p>
                                                <p className="text-sm font-semibold text-surface-900 truncate">{value}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Raw Text Accordion */}
                        {rawText && ocrStatus === 'done' && (
                            <details className="text-xs">
                                <summary className="cursor-pointer text-surface-400 hover:text-surface-600 font-medium flex items-center gap-1.5">
                                    <HiOutlineDocumentText className="w-3.5 h-3.5" />
                                    View raw extracted text
                                </summary>
                                <pre className="mt-2 bg-gray-50 rounded-lg p-3 text-surface-500 max-h-28 overflow-y-auto whitespace-pre-wrap">
                                    {rawText}
                                </pre>
                            </details>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 flex gap-3 px-5 py-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-surface-600 font-semibold text-sm hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={Object.values(selectedFields).every(v => !v)}
                            className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm
                                       hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            Apply Selected Fields
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
