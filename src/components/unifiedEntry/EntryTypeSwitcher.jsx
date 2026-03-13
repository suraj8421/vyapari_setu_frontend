// ============================================
// EntryTypeSwitcher — The 5-button tab bar
// ============================================
// REFACTOR: Previously this was ~30 lines of inline JSX inside UnifiedEntryPage.
// Extracting it here allows the tab bar to be unit-tested and reused independently.
//
// Props:
//   activeType : 'SALE' | 'PURCHASE' | 'EXPENSE' | 'PAYMENT' | 'MISC'
//   onChange   : (type: string) => void

import {
    TagIcon,
    CubeIcon,
    ArrowPathIcon,
    CreditCardIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

// Centralised config — add new types here without touching JSX
const ENTRY_TYPES = [
    { id: 'SALE', Icon: TagIcon, color: 'bg-primary-600', labelKey: 'sales.title' },
    { id: 'PURCHASE', Icon: CubeIcon, color: 'bg-orange-500', labelKey: 'purchases.title' },
    { id: 'EXPENSE', Icon: ArrowPathIcon, color: 'bg-red-500', label: 'Expense' },
    { id: 'PAYMENT', Icon: CreditCardIcon, color: 'bg-emerald-500', label: 'Payment' },
    // MISC was previously broken — backend now maps it to an expense with category='MISC'
    { id: 'MISC', Icon: DocumentTextIcon, color: 'bg-gray-600', label: 'Misc' },
];

export default function EntryTypeSwitcher({ activeType, onChange }) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-2xl shadow-inner">
            {ENTRY_TYPES.map(({ id, Icon, color, label, labelKey }) => {
                const isActive = activeType === id;
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onChange(id)}
                        aria-pressed={isActive}
                        className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold
                            transition-all duration-300
                            ${isActive
                                ? `${color} text-white shadow-lg scale-105`
                                : 'text-surface-600 hover:bg-white hover:text-surface-900'}
                        `}
                    >
                        <Icon className="w-5 h-5" />
                        {labelKey ? t(labelKey) : label}
                    </button>
                );
            })}
        </div>
    );
}
