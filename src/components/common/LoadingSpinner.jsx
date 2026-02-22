// ============================================
// Loading Spinner Component
// ============================================

export default function LoadingSpinner({ size = 'md', text = '' }) {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className={`${sizeClasses[size]} animate-spin`}>
                <svg viewBox="0 0 24 24" fill="none" className="text-primary-500">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                    <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
            {text && <p className="text-sm text-surface-500">{text}</p>}
        </div>
    );
}
