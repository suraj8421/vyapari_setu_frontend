import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSmartScan } from '../hooks/useSmartScan.js';
import {
    HiOutlineCloudArrowUp,
    HiOutlineDocumentText,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineXMark,
    HiOutlineArrowPath,
    HiOutlineSparkles,
    HiOutlineInformationCircle,
    HiOutlineCamera,
    HiOutlineTrash,
    HiOutlinePlus
} from 'react-icons/hi2';

import Logo from '../../../../components/common/Logo';

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    idle:       { label: 'Ready to scan',    color: 'text-surface-400',  bg: '' },
    uploading:  { label: 'Uploading...',     color: 'text-primary-400',  bg: 'bg-primary-500/10' },
    queued:     { label: 'In queue...',      color: 'text-yellow-400',   bg: 'bg-yellow-500/10' },
    processing: { label: 'AI processing...', color: 'text-blue-400',    bg: 'bg-blue-500/10' },
    completed:  { label: 'Scan complete!',   color: 'text-emerald-400',  bg: 'bg-emerald-500/10' },
    failed:     { label: 'Scan failed',      color: 'text-red-400',      bg: 'bg-red-500/10' },
};

// ─── Confidence pill ────────────────────────────────────────────────────────
function ConfidencePill({ score }) {
    if (!score && score !== 0) return null;
    const pct = Math.round(score * 100);
    const color = pct >= 80 ? 'text-emerald-400 bg-emerald-500/15'
                : pct >= 50 ? 'text-yellow-400 bg-yellow-500/15'
                :             'text-red-400 bg-red-500/15';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
            <HiOutlineSparkles className="w-3 h-3" />
            {pct}% confidence
        </span>
    );
}

// ─── Animated spinner ───────────────────────────────────────────────────────
function Spinner({ className = '' }) {
    return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

/**
 * SmartScanModal
 *
 * Props:
 *   isOpen        {boolean}
 *   onClose       {() => void}
 *   onApply       {(result) => void}  — called when user clicks "Fill Form"
 */
export default function SmartScanModal({ isOpen, onClose, onApply }) {
    const { status, result, error, startScan, reset } = useSmartScan();
    const [dragActive, setDragActive] = useState(false);
    
    // Multi-page state
    const [pages, setPages] = useState([]); // array of { id, file, url, type }
    
    // Camera state
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const fileInputRef = useRef(null);

    // ─── Lock body scroll when open ─────────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            stopCamera();
        }
        return () => { 
            document.body.style.overflow = 'unset'; 
            stopCamera();
        };
    }, [isOpen]);

    // Cleanup URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            pages.forEach(p => URL.revokeObjectURL(p.url));
        };
    }, [pages]);

    if (!isOpen) return null;

    const isBusy = ['uploading', 'queued', 'processing'].includes(status);
    const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

    // ─── File handling ──────────────────────────────────────────────────────
    function addFiles(newFiles) {
        if (!newFiles || newFiles.length === 0) return;
        
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        const validFiles = Array.from(newFiles).filter(f => allowed.includes(f.type) && f.size <= 20 * 1024 * 1024);
        
        if (validFiles.length < newFiles.length) {
            alert('Some files were ignored. Ensure they are JPG/PNG/WebP/PDF and under 20MB.');
        }

        const newPages = validFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            url: URL.createObjectURL(file),
            type: file.type
        }));

        setPages(prev => [...prev, ...newPages]);
        reset(); 
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragActive(false);
        if (isBusy) return;
        addFiles(e.dataTransfer.files);
    }

    function removePage(id) {
        if (isBusy) return;
        setPages(prev => prev.filter(p => p.id !== id));
        reset();
    }

    // ─── Camera Handling ────────────────────────────────────────────────────
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraOpen(true);
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera. Please check permissions.');
        }
    }

    function stopCamera() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    }

    function takePhoto() {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            addFiles([file]);
            stopCamera();
        }, 'image/jpeg', 0.9);
    }

    function handleClose() {
        // Allow close if not actively in an inflight request,
        // or if we're in a terminal state (completed/failed)
        if (isBusy && status === 'uploading') return; // block only during initial upload
        reset();
        setPages([]);
        stopCamera();
        onClose();
    }

    // Force-close: always allow closing, resetting everything
    function handleForceClose() {
        reset();
        setPages([]);
        stopCamera();
        onClose();
    }

    function handleApply() {
        if (result) {
            onApply(result);
            handleClose();
        }
    }

    function handleScanAll() {
        if (pages.length === 0) return;
        startScan(pages.map(p => p.file));
    }

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={handleClose}
        >
            <div
                className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-2xl rounded-2xl border border-surface-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
                style={{ background: 'linear-gradient(135deg, #1a1f2e 0%, #12161f 100%)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-surface-700/50 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Logo variant="navbar" className="scale-75 sm:scale-90 origin-left" />
                        <div className="w-px h-6 sm:h-8 bg-surface-700/50 mx-0.5 sm:mx-1" />
                        <div>
                            <h2 className="text-sm sm:text-base font-semibold text-surface-100">Smart Scan</h2>
                            <p className="text-[10px] sm:text-xs text-surface-500">AI multi-page extraction</p>
                        </div>
                    </div>
                    <button
                        onClick={handleForceClose}
                        title="Close (Esc)"
                        className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors"
                    >
                        <HiOutlineXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Body ─────────────────────────────────────────────────── */}
                <div className="p-3.5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">

                    {isCameraOpen ? (
                        <div className="relative rounded-xl overflow-hidden border border-surface-600 bg-black h-64 sm:h-80 flex flex-col items-center justify-center">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
                                <button
                                    onClick={stopCamera}
                                    className="px-4 py-2 rounded-full bg-surface-800/80 text-surface-200 backdrop-blur-sm border border-surface-600 hover:bg-surface-700 transition-colors text-sm font-medium shadow-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={takePhoto}
                                    className="w-14 h-14 rounded-full bg-white border-4 border-surface-300 shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
                                >
                                    <div className="w-10 h-10 rounded-full bg-violet-500/20" />
                                </button>
                            </div>
                        </div>
                    ) : pages.length === 0 ? (
                        // Drop Zone (Empty State)
                        <div
                            onDragEnter={e => { e.preventDefault(); setDragActive(true); }}
                            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            className={`
                                relative flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 border-dashed
                                transition-all duration-200
                                ${dragActive
                                    ? 'border-violet-400 bg-violet-500/10 scale-[1.01]'
                                    : 'border-surface-600 bg-surface-800/30 hover:border-surface-500 hover:bg-surface-800/50'
                                }
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                accept="image/*,application/pdf"
                                onChange={e => addFiles(e.target.files)}
                            />

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-surface-600/50 hover:bg-surface-700/30 transition-colors"
                                >
                                    <div className="p-3 rounded-full bg-blue-500/10">
                                        <HiOutlineCloudArrowUp className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <span className="text-sm font-medium text-surface-200">Upload Files</span>
                                </button>
                                
                                <button 
                                    onClick={startCamera}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-surface-600/50 hover:bg-surface-700/30 transition-colors"
                                >
                                    <div className="p-3 rounded-full bg-violet-500/10">
                                        <HiOutlineCamera className="w-8 h-8 text-violet-400" />
                                    </div>
                                    <span className="text-sm font-medium text-surface-200">Use Camera</span>
                                </button>
                            </div>

                            <p className="text-xs text-surface-500 mt-2 text-center max-w-xs">
                                Drag and drop images/PDFs here. You can add multiple pages for a single invoice.
                            </p>
                        </div>
                    ) : (
                        // Pages List & Status
                        <div className="space-y-4">
                            
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-surface-200">
                                    Invoice Pages ({pages.length})
                                </h3>
                                {!isBusy && status !== 'completed' && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={startCamera}
                                            className="p-1.5 rounded-lg text-surface-400 hover:text-violet-400 hover:bg-surface-700/50 transition-colors"
                                            title="Take Photo"
                                        >
                                            <HiOutlineCamera className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-1.5 rounded-lg text-surface-400 hover:text-blue-400 hover:bg-surface-700/50 transition-colors"
                                            title="Add Files"
                                        >
                                            <HiOutlinePlus className="w-5 h-5" />
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            className="hidden"
                                            accept="image/*,application/pdf"
                                            onChange={e => addFiles(e.target.files)}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {pages.map((p, index) => (
                                    <div key={p.id} className="relative group rounded-lg overflow-hidden border border-surface-600 aspect-[3/4] bg-surface-800/50">
                                        {p.type === 'application/pdf' ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-surface-500">
                                                <HiOutlineDocumentText className="w-8 h-8 mb-1" />
                                                <span className="text-xs font-medium">PDF</span>
                                            </div>
                                        ) : (
                                            <img src={p.url} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
                                        )}
                                        
                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold">
                                            {index + 1}
                                        </div>

                                        {!isBusy && status !== 'completed' && (
                                            <button 
                                                onClick={() => removePage(p.id)}
                                                className="absolute top-2 right-2 p-1.5 rounded-md bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                            >
                                                <HiOutlineTrash className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Status badge */}
                            {status !== 'idle' && (
                                <div className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${cfg.bg} ${cfg.color} border-current/20`}>
                                    {isBusy && <Spinner className="w-4 h-4" />}
                                    {status === 'completed' && <HiOutlineCheckCircle className="w-5 h-5" />}
                                    {status === 'failed'    && <HiOutlineXCircle    className="w-5 h-5" />}
                                    <span className="text-sm font-medium">{cfg.label}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error message */}
                    {status === 'failed' && error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <HiOutlineXCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Result Preview */}
                    {status === 'completed' && result && (
                        <div className="space-y-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                                    Multi-Page Extraction Preview
                                </span>
                                <ConfidencePill score={result.confidence_score} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {result.vendor && (
                                     <div>
                                         <p className="text-xs text-surface-500 mb-0.5">Vendor</p>
                                         <div className="flex items-center gap-2">
                                             <p className="font-medium text-surface-200 truncate">{result.vendor}</p>
                                             {result.supplier_exists ? (
                                                 <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">MATCHED</span>
                                             ) : (
                                                 <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">NEW</span>
                                             )}
                                         </div>
                                     </div>
                                 )}
                                 {result.invoice_no && (
                                     <div>
                                         <p className="text-xs text-surface-500 mb-0.5">Invoice #</p>
                                         <p className="font-medium text-surface-200">{result.invoice_no}</p>
                                     </div>
                                 )}
                                 {result.gstin && (
                                     <div>
                                         <p className="text-xs text-surface-500 mb-0.5">GSTIN</p>
                                         <p className="font-medium text-surface-200">{result.gstin}</p>
                                     </div>
                                 )}
                                 {result.date && (
                                     <div>
                                         <p className="text-xs text-surface-500 mb-0.5">Date</p>
                                         <p className="font-medium text-surface-200">{result.date}</p>
                                     </div>
                                 )}
                                 {result.total != null && (
                                     <div>
                                         <p className="text-xs text-surface-500 mb-0.5">Total</p>
                                         <p className="font-semibold text-emerald-400">
                                             ₹{Number(result.total).toLocaleString('en-IN')}
                                         </p>
                                     </div>
                                 )}
                            </div>

                            {result.items?.length > 0 && (
                                <div>
                                    <p className="text-xs text-surface-500 mb-1.5">
                                        {result.items.length} line item{result.items.length > 1 ? 's' : ''} detected
                                    </p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                        {result.items.map((item, i) => (
                                            <div key={i} className={`flex items-center justify-between text-xs rounded px-2 py-1.5 ${item.exists ? 'bg-surface-800/40 text-surface-300' : 'bg-amber-500/5 border border-amber-500/10 text-amber-200'}`}>
                                                <div className="flex flex-col gap-0.5 max-w-[65%]">
                                                    <span className="truncate font-medium">{item.name || item.description || '—'}</span>
                                                    {!item.exists && <span className="text-[9px] text-amber-500/80 font-bold uppercase">New Item</span>}
                                                </div>
                                                <span className="text-surface-500 font-mono">
                                                    ×{item.qty ?? item.quantity ?? 1} @ ₹{item.rate ?? item.unit_price ?? 0}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5 text-xs text-surface-500 mt-2">
                                <HiOutlineInformationCircle className="w-3.5 h-3.5 shrink-0" />
                                Please verify the extracted items and total.
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ───────────────────────────────────────────────── */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-surface-700/50 shrink-0">
                    <button
                        type="button"
                        onClick={() => { reset(); setPages([]); }}
                        disabled={pages.length === 0}
                        className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-surface-400 hover:text-surface-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed py-2 sm:py-0"
                    >
                        <HiOutlineArrowPath className="w-4 h-4" />
                        Clear All
                    </button>

                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                        <button
                            type="button"
                            onClick={handleForceClose}
                            className="px-4 py-2.5 rounded-lg text-xs sm:text-sm text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 transition-colors text-center"
                        >
                            Cancel
                        </button>

                        {status === 'completed' ? (
                            <button
                                type="button"
                                onClick={handleApply}
                                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <HiOutlineCheckCircle className="w-4 h-4" />
                                Fill Form
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleScanAll}
                                disabled={pages.length === 0 || isBusy || isCameraOpen}
                                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-400 hover:to-blue-400 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                {isBusy ? (
                                    <><Spinner className="w-4 h-4" /> Scanning...</>
                                ) : (
                                    <><HiOutlineSparkles className="w-4 h-4" /> Scan {pages.length > 0 ? pages.length : ''} Pages</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
