// ============================================
// Reusable Modal Component (Portal-based)
// ============================================

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineXMark } from 'react-icons/hi2';

const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
};

export default function Modal({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = 'md', 
    bodyClassName = "", 
    headerClassName = "", 
    titleClassName = "",
    maxWidth = ""
}) {
    // Scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2.5 sm:p-4 isolate">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-0"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className={`glass-card p-0 w-full max-w-[calc(100vw-1.25rem)] ${maxWidth || sizeClasses[size] || 'sm:max-w-lg'} max-h-[92vh] flex flex-col relative z-20 overflow-hidden shadow-2xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-surface-700/50 shrink-0 ${headerClassName}`}>
                            <h3 className={`text-base sm:text-lg font-semibold text-surface-900 truncate pr-2 ${titleClassName}`}>{title}</h3>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-white/10 transition-colors shrink-0"
                            >
                                <HiOutlineXMark className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className={`px-4 sm:px-6 py-4 overflow-y-auto flex-1 ${bodyClassName}`}>
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

