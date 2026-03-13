import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import {
    HiOutlineQrCode,
    HiOutlineCamera,
    HiOutlineDocumentArrowUp,
    HiOutlineXMark,
    HiOutlineCheck,
    HiOutlineArrowPath,
    HiOutlineCheckCircle
} from 'react-icons/hi2';
import { scannerAPI } from '../../services/api';

// Steps
const STEP_CHOOSE = 'CHOOSE';
const STEP_SCAN_BARCODE = 'SCAN_BARCODE';
const STEP_SCAN_IMAGE = 'SCAN_IMAGE';
const STEP_SCAN_DOC = 'SCAN_DOC';
const STEP_REVIEW = 'REVIEW';

export default function ScannerModal({ isOpen, onClose, onAction }) {
    const { t } = useTranslation();
    const [step, setStep] = useState(STEP_CHOOSE);
    const [loading, setLoading] = useState(false);

    // Result payload from the backend
    const [scanResult, setScanResult] = useState(null);

    // If it's a single product
    const [singleProductChecks, setSingleProductChecks] = useState({});

    // If it's a multi product doc
    const [multiProductChecks, setMultiProductChecks] = useState({});

    useEffect(() => {
        if (!isOpen) {
            setStep(STEP_CHOOSE);
            setScanResult(null);
            setSingleProductChecks({});
            setMultiProductChecks({});
            setLoading(false);
        }
    }, [isOpen]);

    // ── Barcode Scanner Logic (Camera) ──────────────────────────────────
    const scannerRef = useRef(null);
    useEffect(() => {
        if (step === STEP_SCAN_BARCODE) {
            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );
            scannerRef.current.render(
                (decodedText) => {
                    // Success callback
                    scannerRef.current.clear(); // Stops scanner
                    handleBarcodeScan(decodedText);
                },
                (error) => {
                    // ignore frequent read failures
                }
            );
        }

        return () => {
            if (scannerRef.current && typeof scannerRef.current.clear === 'function') {
                scannerRef.current.clear().catch(err => console.log('Scanner close error', err));
            }
        };
    }, [step]);

    const handleBarcodeScan = async (barcodeVal) => {
        setLoading(true);
        try {
            const res = await scannerAPI.scanBarcode(barcodeVal);
            const data = res.data.data;
            if (data.matchFound) {
                // Return immediate match to parent
                onAction('OPEN_EDIT', data.product);
                toast.success('Product found!');
            } else {
                // Pass new barcode to parent to create new
                onAction('OPEN_CREATE_PREFILLED', { barcode: barcodeVal });
                toast.success('No product found. Creating new...');
            }
            onClose();
        } catch (err) {
            toast.error('Failed to scan barcode');
            setStep(STEP_CHOOSE);
        } finally {
            setLoading(false);
        }
    };

    // ── Dropzone Handlers ────────────────────────────────────────────────
    const onDropImage = async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await scannerAPI.processImage(formData);
            const data = res.data.data;
            setScanResult(data);

            // Auto check all extracted fields by default
            if (data.type === 'SINGLE_PRODUCT') {
                const checks = {};
                Object.keys(data.extracted).forEach(k => checks[k] = true);
                setSingleProductChecks(checks);
            }

            setStep(STEP_REVIEW);
        } catch (err) {
            toast.error('Failed to process image');
            setStep(STEP_CHOOSE);
        } finally {
            setLoading(false);
        }
    };

    const onDropDoc = async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('document', file);

            const res = await scannerAPI.processDocument(formData);
            const data = res.data.data;
            setScanResult(data);

            // Auto select all rows
            if (data.type === 'MULTI_PRODUCT_DOC') {
                const checks = {};
                data.items.forEach((item, idx) => checks[idx] = true);
                setMultiProductChecks(checks);
            }

            setStep(STEP_REVIEW);
        } catch (err) {
            toast.error('Failed to process document');
            setStep(STEP_CHOOSE);
        } finally {
            setLoading(false);
        }
    };

    const { getRootProps: getImageProps, getInputProps: getImageInputProps } = useDropzone({ onDrop: onDropImage });
    const { getRootProps: getDocProps, getInputProps: getDocInputProps } = useDropzone({ onDrop: onDropDoc });

    // ── Final Checks and Submit ──────────────────────────────────────────
    const handleSaveReview = () => {
        if (!scanResult) return;

        if (scanResult.type === 'SINGLE_PRODUCT') {
            const safeData = {};
            // Gather only checked fields
            Object.keys(scanResult.extracted).forEach(field => {
                if (singleProductChecks[field]) {
                    safeData[field] = scanResult.extracted[field];
                }
            });

            if (scanResult.matchFound) {
                // Action: Bulk update or open edit populated
                onAction('OPEN_EDIT', { ...scanResult.existingProduct, ...safeData });
            } else {
                onAction('OPEN_CREATE_PREFILLED', safeData);
            }
        }
        else if (scanResult.type === 'MULTI_PRODUCT_DOC') {
            const selectedItems = scanResult.items.filter((_, idx) => multiProductChecks[idx]);
            if (selectedItems.length === 0) {
                return toast.error('Check at least one item');
            }
            onAction('BULK_IMPORT', selectedItems);
        }

        onClose();
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-surface-900 flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                <HiOutlineQrCode className="w-6 h-6" />
                            </span>
                            Smart Product Scanner
                        </h2>
                        <p className="text-sm text-surface-500 mt-1">
                            {step === STEP_CHOOSE && "How would you like to scan today?"}
                            {step === STEP_SCAN_BARCODE && "Camera Barcode Scanner"}
                            {step === STEP_SCAN_IMAGE && "Upload Product Label Photo"}
                            {step === STEP_SCAN_DOC && "Upload Invoice / Catalog Page"}
                            {step === STEP_REVIEW && "Review Extracted Data"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <HiOutlineXMark className="w-6 h-6 text-surface-500" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center">
                            <HiOutlineArrowPath className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                            <p className="text-surface-600 font-medium">Processing via AI Vision...</p>
                            <p className="text-surface-400 text-sm mt-1">Extracting fields and matching inventory</p>
                        </div>
                    ) : (
                        <>
                            {step === STEP_CHOOSE && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <button onClick={() => setStep(STEP_SCAN_BARCODE)} className="p-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary-400 hover:bg-primary-50 flex flex-col items-center gap-4 transition-all group">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-primary-200 flex items-center justify-center text-gray-400 group-hover:text-primary-600 transition-colors"><HiOutlineQrCode className="w-8 h-8" /></div>
                                        <span className="font-bold text-surface-900 text-lg">Barcode / QR</span>
                                        <span className="text-sm text-center text-surface-500">Fastest way to lookup or add a single item via your camera.</span>
                                    </button>
                                    <button onClick={() => setStep(STEP_SCAN_IMAGE)} className="p-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 flex flex-col items-center gap-4 transition-all group">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-emerald-200 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors"><HiOutlineCamera className="w-8 h-8" /></div>
                                        <span className="font-bold text-surface-900 text-lg">Product Label</span>
                                        <span className="text-sm text-center text-surface-500">Capture an image of a box/label; we'll extract names, MRP, weights.</span>
                                    </button>
                                    <button onClick={() => setStep(STEP_SCAN_DOC)} className="p-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center gap-4 transition-all group">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-indigo-200 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-colors"><HiOutlineDocumentArrowUp className="w-8 h-8" /></div>
                                        <span className="font-bold text-surface-900 text-lg">Invoice / Sheet</span>
                                        <span className="text-sm text-center text-surface-500">Upload a vendor invoice or catalog to bulk-extract multiple goods at once.</span>
                                    </button>
                                </div>
                            )}

                            {step === STEP_SCAN_BARCODE && (
                                <div className="flex flex-col items-center max-w-lg mx-auto">
                                    <div id="reader" className="w-full bg-black rounded-2xl overflow-hidden shadow-inner mb-6"></div>
                                    <p className="text-surface-500 text-sm text-center border p-4 rounded-xl bg-gray-50 border-gray-200">Point your camera at a barcode to automatically scan and look up the product.</p>
                                    <button onClick={() => setStep(STEP_CHOOSE)} className="mt-6 text-sm font-semibold text-primary-600 hover:underline">← Back to Options</button>
                                </div>
                            )}

                            {step === STEP_SCAN_IMAGE && (
                                <div className="flex flex-col items-center max-w-lg mx-auto">
                                    <div {...getImageProps()} className="w-full p-12 border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-2xl text-center cursor-pointer hover:bg-emerald-100 transition-colors">
                                        <input {...getImageInputProps()} />
                                        <HiOutlineCamera className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                                        <p className="text-emerald-800 font-bold text-lg">Drop product photo here</p>
                                        <p className="text-emerald-600 text-sm mt-1">or click to upload from gallery</p>
                                    </div>
                                    <button onClick={() => setStep(STEP_CHOOSE)} className="mt-6 text-sm font-semibold text-primary-600 hover:underline">← Back to Options</button>
                                </div>
                            )}

                            {step === STEP_SCAN_DOC && (
                                <div className="flex flex-col items-center max-w-lg mx-auto">
                                    <div {...getDocProps()} className="w-full p-12 border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-2xl text-center cursor-pointer hover:bg-indigo-100 transition-colors">
                                        <input {...getDocInputProps()} />
                                        <HiOutlineDocumentArrowUp className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                                        <p className="text-indigo-800 font-bold text-lg">Drop invoice / sheet here</p>
                                        <p className="text-indigo-600 text-sm mt-1">supports Images & PDFs</p>
                                    </div>
                                    <button onClick={() => setStep(STEP_CHOOSE)} className="mt-6 text-sm font-semibold text-primary-600 hover:underline">← Back to Options</button>
                                </div>
                            )}

                            {step === STEP_REVIEW && scanResult && scanResult.type === 'SINGLE_PRODUCT' && (
                                <div className="space-y-6">
                                    {scanResult.matchFound ? (
                                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-sm">
                                            <HiOutlineCheckCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold">Match Found!</p>
                                                <p>This product already exists in your inventory. Review the new extracted fields below and check the boxes for values you want to override.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex gap-3 text-emerald-800 text-sm">
                                            <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold">New Product Detected!</p>
                                                <p>Review the extracted fields below and uncheck anything that looks incorrect before importing.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-100 text-surface-500 font-bold uppercase tracking-wider text-[11px]">
                                                <tr>
                                                    <th className="px-4 py-3 w-12 text-center">✓</th>
                                                    <th className="px-4 py-3">Field</th>
                                                    <th className="px-4 py-3">Extracted Value (New)</th>
                                                    {scanResult.matchFound && <th className="px-4 py-3 bg-white">Current / Existing Value</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {Object.entries(scanResult.extracted).map(([fieldKey, val]) => (
                                                    <tr key={fieldKey} className={`hover:bg-white ${singleProductChecks[fieldKey] ? 'bg-primary-50/20' : ''}`}>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                                                                checked={singleProductChecks[fieldKey] || false}
                                                                onChange={(e) => setSingleProductChecks(prev => ({ ...prev, [fieldKey]: e.target.checked }))}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-surface-600 capitalize">{fieldKey.replace(/([A-Z])/g, ' $1').trim()}</td>
                                                        <td className="px-4 py-3 font-medium text-surface-900">{typeof val === 'number' ? val.toString() : (val || '—')}</td>
                                                        {scanResult.matchFound && (
                                                            <td className="px-4 py-3 bg-white text-surface-500">{scanResult.existingProduct[fieldKey] !== undefined ? scanResult.existingProduct[fieldKey] : '—'}</td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {step === STEP_REVIEW && scanResult && scanResult.type === 'MULTI_PRODUCT_DOC' && (
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex gap-3 text-indigo-800 text-sm">
                                        <HiOutlineDocumentArrowUp className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Bulk Extraction Successful!</p>
                                            <p>We found {scanResult.items.length} products listed in "{scanResult.metadata.documentType}". Review and select the rows you wish to import to your inventory.</p>
                                            <div className="mt-2 text-xs flex gap-4 opacity-80">
                                                <span>✓ Selected: {Object.values(multiProductChecks).filter(Boolean).length}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-100 text-surface-500 font-bold uppercase tracking-wider text-[11px]">
                                                <tr>
                                                    <th className="px-4 py-3 w-12 text-center">✓</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3">Product Name</th>
                                                    <th className="px-4 py-3">Barcode</th>
                                                    <th className="px-4 py-3">Purchased Qty</th>
                                                    <th className="px-4 py-3">Cost Price</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {scanResult.items.map((item, idx) => (
                                                    <tr key={idx} className={`hover:bg-white`}>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                                                                checked={multiProductChecks[idx] || false}
                                                                onChange={(e) => setMultiProductChecks(prev => ({ ...prev, [idx]: e.target.checked }))}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {item.matchFound ? (
                                                                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">MATCHED</span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">NEW</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-surface-900">{item.extracted.name}</td>
                                                        <td className="px-4 py-3 font-mono text-xs">{item.extracted.barcode}</td>
                                                        <td className="px-4 py-3 font-bold">{item.extracted.quantity} {item.extracted.unit}</td>
                                                        <td className="px-4 py-3">₹{item.extracted.costPrice}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="text-sm font-semibold text-primary-600 hover:underline" onClick={() => {
                                            const checks = {};
                                            scanResult.items.forEach((_, i) => checks[i] = true);
                                            setMultiProductChecks(checks);
                                        }}>Select All</button>
                                        <button className="text-sm font-semibold text-gray-500 hover:underline" onClick={() => setMultiProductChecks({})}>Clear All</button>
                                    </div>
                                </div>
                            )}

                        </>
                    )}
                </div>

                {/* Footer */}
                {step === STEP_REVIEW && scanResult && !loading && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button onClick={() => setStep(STEP_CHOOSE)} className="btn-secondary">Discard & Rescan</button>
                        <button onClick={handleSaveReview} className="btn-primary">
                            <HiOutlineCheck className="w-5 h-5" />
                            {scanResult.type === 'SINGLE_PRODUCT'
                                ? (scanResult.matchFound ? 'Update & Save Fields' : 'Import New Product')
                                : 'Import Selected Rows to Inventory'
                            }
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
