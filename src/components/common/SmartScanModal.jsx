import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { 
    HiOutlineCamera, 
    HiOutlineDocumentText, 
    HiOutlineMicrophone, 
    HiOutlineArrowUpTray,
    HiOutlineXMark,
    HiOutlineCheck,
    HiOutlineArrowPath,
    HiOutlineSparkles,
    HiOutlineInformationCircle
} from 'react-icons/hi2';
import { useSmartScan } from '../../hooks/useSmartScan';

/**
 * SmartScanModal - Context-Aware Scanning UI
 * @param {boolean} isOpen 
 * @param {function} onClose 
 * @param {string} contextType - 'product' | 'supplier' | 'expense' | 'sales' | etc.
 * @param {function} onScanComplete - Callback with structured data output
 */
export default function SmartScanModal({ isOpen, onClose, contextType, onScanComplete }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('camera');
    const [scanResult, setScanResult] = useState(null);
    const cameraRef = useRef(null);
    const html5QrCodeRef = useRef(null);

    // Initializing our logic engine
    const {
        isProcessing,
        progress,
        error,
        handleBarcodeDetected,
        processImage,
        startVoice,
        stopVoice,
        isListening,
        handleFileUpload
    } = useSmartScan({
        contextType,
        onScanComplete: (data) => {
            setScanResult(data);
            // Optionally auto-close if it's a simple barcode hit
            if (data.barcode && activeTab === 'camera') {
                // Keep open to show success or auto-apply? 
                // The requirement says "Auto close modal"
                setTimeout(() => {
                    handleApply(data);
                }, 1000);
            }
        }
    });

    // ─── Camera Lifecyle ──────────────────────────────────────────
    const stopCamera = useCallback(async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
        }
    }, []);

    const startCamera = useCallback(async () => {
        if (!cameraRef.current) return;
        
        try {
            const html5QrCode = new Html5Qrcode(cameraRef.current.id);
            html5QrCodeRef.current = html5QrCode;
            
            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.0
                },
                (decodedText) => {
                    handleBarcodeDetected(decodedText);
                },
                (errorMessage) => { /* Silently ignore camera search noise */ }
            );
        } catch (err) {
            console.error("Camera Start Error:", err);
        }
    }, [handleBarcodeDetected]);

    useEffect(() => {
        if (isOpen && activeTab === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => { stopCamera(); };
    }, [isOpen, activeTab, startCamera, stopCamera]);

    // ─── Captured Snapshot for OCR ────────────────────────────────
    const captureAndProcess = async () => {
        if (!cameraRef.current) return;
        const video = cameraRef.current.querySelector('video');
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        await processImage(dataUrl);
    };

    // ─── Apply Logic ───────────────────────────────────────────────
    const handleApply = (data) => {
        onScanComplete?.(data || scanResult);
        onClose();
        setScanResult(null);
    };

    if (!isOpen) return null;

    // ─── Context-Specific UI Text ─────────────────────────────────
    const getContextHints = () => {
        switch (contextType) {
            case 'expense': return "Point at a receipt to capture Amount & Category.";
            case 'supplier': return "Scan a business card or invoice header.";
            case 'user': return "Scan a Government ID or typed name list.";
            case 'product': return "Scan product barcode or packaging label.";
            default: return "Position the item clearly within the frame.";
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-surface-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 rounded-xl">
                            <HiOutlineSparkles className="w-6 h-6 text-primary-600 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-surface-900 tracking-tight leading-none uppercase italic">
                                Smart <span className="text-primary-600">Scan</span>
                            </h2>
                            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mt-1">
                                Context: {contextType || 'General'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface-50 rounded-full transition-colors">
                        <HiOutlineXMark className="w-6 h-6 text-surface-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-surface-50 mx-6 mt-4 rounded-2xl">
                    {[
                        { id: 'camera', icon: HiOutlineCamera, label: 'Live' },
                        { id: 'upload', icon: HiOutlineArrowUpTray, label: 'Upload' },
                        { id: 'voice', icon: HiOutlineMicrophone, label: 'Voice' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id ? 'bg-white shadow-sm text-primary-600' : 'text-surface-400 hover:text-surface-600'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main View Area */}
                <div className="flex-1 overflow-y-auto p-6 min-h-[300px] flex flex-col items-center justify-center">
                    
                    {activeTab === 'camera' && (
                        <div className="w-full h-full relative group">
                            <div 
                                id="reader" 
                                ref={cameraRef} 
                                className="w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-inner border-4 border-surface-900" 
                            />
                            
                            {/* Scanning Overlay (Retro-futuristic) */}
                            {!isProcessing && !scanResult && (
                                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-primary-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan-line pointer-events-none" />
                            )}

                            {/* OCR Snapshot Trigger */}
                            <div className="absolute bottom-4 inset-x-0 flex justify-center">
                                <button 
                                    onClick={captureAndProcess}
                                    disabled={isProcessing}
                                    className="p-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-full hover:scale-110 active:scale-90 transition-all shadow-xl group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                                        <HiOutlineCamera className="w-5 h-5 text-surface-900 group-hover:text-white" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'upload' && (
                        <div className="w-full flex flex-col items-center gap-6 py-10">
                            <div className="w-24 h-24 bg-primary-50 rounded-3xl flex items-center justify-center mb-2">
                                <HiOutlineDocumentText className="w-12 h-12 text-primary-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-black text-surface-900 tracking-tight">Drop Document</h3>
                                <p className="text-sm text-surface-500 font-medium">Extracting from Image or PDF</p>
                            </div>
                            <label className="cursor-pointer bg-surface-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-surface-200">
                                Choose File
                                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e.target.files[0])} />
                            </label>
                        </div>
                    )}

                    {activeTab === 'voice' && (
                        <div className="w-full flex flex-col items-center gap-6 py-10">
                            <motion.div 
                                animate={isListening ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className={`w-24 h-24 rounded-full flex items-center justify-center ${isListening ? 'bg-red-500 shadow-[0_0_40px_rgba(239,44,44,0.4)]' : 'bg-primary-600'}`}
                            >
                                <HiOutlineMicrophone className="w-10 h-10 text-white" />
                            </motion.div>
                            <div className="text-center">
                                <h3 className="text-lg font-black text-surface-900 tracking-tight">
                                    {isListening ? "Listening..." : "Ready for Voice Input"}
                                </h3>
                                <p className="text-sm text-surface-500 font-medium italic">
                                    "Speak item name, price, and units"
                                </p>
                            </div>
                            <button 
                                onClick={isListening ? stopVoice : startVoice}
                                className={`px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                    isListening ? 'bg-red-100 text-red-600 shadow-none' : 'bg-surface-900 text-white shadow-xl shadow-surface-200'
                                }`}
                            >
                                {isListening ? "Stop" : "Start Listening"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Status / Processing Overlay */}
                {(isProcessing || scanResult || error) && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 z-10 text-center">
                        {isProcessing ? (
                            <>
                                <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mb-6 animate-bounce">
                                    <HiOutlineSparkles className="w-10 h-10 text-primary-600" />
                                </div>
                                <h3 className="text-2xl font-black text-surface-900 tracking-tighter uppercase italic">AI Vision <span className="text-primary-600">Active</span></h3>
                                <p className="text-sm text-surface-400 font-bold uppercase tracking-[0.2em] mt-2">Extracting Intelligence...</p>
                                
                                {progress > 0 && (
                                    <div className="w-full max-w-xs h-1.5 bg-surface-100 rounded-full mt-6 overflow-hidden">
                                        <div className="h-full bg-primary-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                )}
                            </>
                        ) : error ? (
                            <>
                                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                                    <HiOutlineXMark className="w-10 h-10 text-red-600" />
                                </div>
                                <h3 className="text-xl font-black text-red-600 tracking-tight">SCAN FAILED</h3>
                                <p className="text-sm text-surface-500 mt-2">{error}</p>
                                <button onClick={() => setScanResult(null)} className="mt-8 btn-primary">Try Again</button>
                            </>
                        ) : (
                            <div className="w-full max-w-sm">
                                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                                    <HiOutlineCheck className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-black text-surface-900 tracking-tight uppercase italic mb-6">Intelligence <span className="text-emerald-500">Captured</span></h3>
                                
                                {/* Quick Preview of Structured Data */}
                                <div className="bg-surface-50 rounded-2xl p-4 text-left border border-surface-100 mb-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Name</p>
                                            <p className="text-sm font-black text-surface-900 truncate">{scanResult.name || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Price</p>
                                            <p className="text-sm font-black text-emerald-600">₹{scanResult.price || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Quantity</p>
                                            <p className="text-sm font-black text-surface-900">{scanResult.quantity} {scanResult.unit}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Barcode</p>
                                            <p className="text-sm font-black text-surface-900 truncate">{scanResult.barcode || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setScanResult(null)} className="flex-1 py-4 bg-surface-100 text-surface-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-surface-200 transition-all">Retake</button>
                                    <button onClick={() => handleApply()} className="flex-1 py-4 bg-surface-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-surface-200">Confirm & Apply</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Guide */}
                <div className="p-4 bg-surface-50 border-t border-surface-100 flex items-center gap-3">
                    <HiOutlineInformationCircle className="w-5 h-5 text-surface-400" />
                    <p className="text-xs font-bold text-surface-500 italic">
                        {getContextHints()}
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

// Add these styles to your index.css if not already present
/*
@keyframes scan-line {
  0% { top: 30%; }
  100% { top: 70%; }
}
.animate-scan-line {
  animation: scan-line 2s infinite alternate ease-in-out;
}
*/
