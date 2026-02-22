// ============================================
// Pagination Component
// ============================================

import { useTranslation } from 'react-i18next';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';

export default function Pagination({ pagination, onPageChange }) {
    const { t } = useTranslation();

    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, total, limit } = pagination;
    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
            <p className="text-sm text-surface-500">
                {t('common.showing')} <span className="font-medium text-surface-300">{startItem}</span> - <span className="font-medium text-surface-300">{endItem}</span> {t('common.of')}{' '}
                <span className="font-medium text-surface-300">{total}</span> {t('common.results')}
            </p>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <HiOutlineChevronLeft className="w-4 h-4" />
                </button>

                {pages.map((p) => (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200
              ${p === page
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
                            }`}
                    >
                        {p}
                    </button>
                ))}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <HiOutlineChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
