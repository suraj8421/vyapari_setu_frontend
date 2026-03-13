// ============================================
// AutoActionsPanel — Toggleable option checkboxes
// ============================================
// REFACTOR: Previously ~50 lines of inline JSX inside UnifiedEntryPage.
// Added: keyboard accessibility (Space to toggle), emoji icons, 'Coming Soon'
// badge for the unimplemented broadcast feature, and ARIA attributes.
//
// Props:
//   options  : { updateStock, updateLoan, generateInvoice, sendToCustomer }
//   onChange : (optionKey: string) => void

import { CheckCircleIcon } from '@heroicons/react/24/outline';

const ACTION_OPTIONS = [
    {
        id: 'updateStock',
        emoji: '📦',
        label: 'Update Stock Level Automatically',
        desc: 'Deduct or add inventory counts based on entry type',
    },
    {
        id: 'updateLoan',
        emoji: '📒',
        label: 'Update Party Loan / Khata',
        desc: 'Record credit or debit in the customer / supplier ledger',
    },
    {
        id: 'generateInvoice',
        emoji: '🧾',
        label: 'Generate PDF Invoice',
        desc: 'Download a professional invoice document ready for printing',
    },
    {
        id: 'sendToCustomer',
        emoji: '📣',
        label: 'Broadcast to Admins',
        desc: 'Send a real-time alert to all administrators',
        // REFACTOR NOTE: This feature is UI-only — backend has no notification
        // system yet. Marked disabled so staff don't expect it to do anything.
        disabled: true,
    },
];

export default function AutoActionsPanel({ options, onChange }) {
    return (
        <div className="card p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                Auto-Actions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ACTION_OPTIONS.map(({ id, emoji, label, desc, disabled }) => {
                    const isOn = !disabled && !!options[id];

                    return (
                        <div
                            key={id}
                            role="checkbox"
                            aria-checked={isOn}
                            aria-disabled={disabled}
                            tabIndex={disabled ? -1 : 0}
                            onClick={() => !disabled && onChange(id)}
                            onKeyDown={e => e.key === ' ' && !disabled && onChange(id)}
                            className={`
                                flex items-start gap-4 p-4 rounded-2xl border-2 select-none
                                transition-all duration-200
                                ${disabled
                                    ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50'
                                    : isOn
                                        ? 'border-emerald-500 bg-emerald-50 shadow-sm cursor-pointer'
                                        : 'border-gray-100 hover:border-gray-200 cursor-pointer bg-white'}
                            `}
                        >
                            {/* Visual checkbox indicator */}
                            <div className={`
                                mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0
                                transition-colors duration-200
                                ${isOn ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}
                            `}>
                                {isOn && <CheckCircleIcon className="w-4 h-4" />}
                            </div>

                            {/* Text content */}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-surface-900 leading-snug flex items-center gap-2 flex-wrap">
                                    <span>{emoji}</span>
                                    <span>{label}</span>
                                    {disabled && (
                                        <span className="text-[9px] uppercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-black tracking-wider">
                                            Soon
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-surface-500 mt-1 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
