// ============================================
// Reusable Modal Component
// ============================================

import { useEffect } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`glass-card p-0 w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col animate-slide-up`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/50">
                    <h3 className="text-lg font-semibold text-surface-100">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
                    >
                        <HiOutlineXMark className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
