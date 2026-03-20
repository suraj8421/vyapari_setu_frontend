// ============================================
// EntrySummaryPanel — Right-side dark totals panel
// ============================================
// REFACTOR: Previously ~80 lines of inline JSX inside UnifiedEntryPage including
// the totals display, payment method selector, paid amount input, submit button,
// and the staff approval notice. All extracted here.
//
// Props:
//   totals   : { subtotal, tax, discount, total }
//   formData : { paymentMethod, paidAmount, items }
//   loading  : boolean — shows spinner on submit button when true
//   onChange : standard React input change handler (for paymentMethod + paidAmount)

import { ArrowPathIcon, CheckCircleIcon, CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Added CARD option — was missing from the original payment method list
// Added CARD option — was missing from the original payment method list
const PAYMENT_METHODS = [
    { value: 'CASH', label: '💵 Cash' },
    { value: 'UPI', label: '📱 UPI' },
    { value: 'CARD', label: '💳 Card' },
    { value: 'BANK_TRANSFER', label: '🏦 Bank' },
    { value: 'CREDIT', label: '📋 Credit' },
    { value: 'OTHER', label: '🔘 Other' },
];

// Format a value as Indian Rupees
const fmt = v => `₹ ${Number(v || 0).toFixed(2)}`;

export default function EntrySummaryPanel({ 
    totals, formData, loading, onChange,
    onAddPayment, onRemovePayment, onPaymentChange
}) {
    const isGST = formData.invoiceType === 'GST';
    const remaining = totals.total - totals.paidAmount;

    return (
        <div className="space-y-4">
            {/* ── Totals + Payment Card ───────────────────────── */}
            <div className="card p-6 bg-surface-900 border-0 text-white overflow-hidden relative rounded-2xl shadow-2xl">
                {/* Decorative glow blob */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500 opacity-20 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none" />

                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                    <CreditCardIcon className="w-6 h-6 text-primary-400" />
                    Summary
                </h3>

                {/* Line totals breakdown */}
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-surface-400">
                        <span>Subtotal</span>
                        <span className="font-mono">{fmt(totals.subtotal)}</span>
                    </div>

                    {isGST && (
                        <>
                            {totals.cgst > 0 && (
                                <div className="flex justify-between text-surface-400 pl-4 border-l border-white/10">
                                    <span>CGST</span>
                                    <span className="font-mono">{fmt(totals.cgst)}</span>
                                </div>
                            )}
                            {totals.sgst > 0 && (
                                <div className="flex justify-between text-surface-400 pl-4 border-l border-white/10">
                                    <span>SGST</span>
                                    <span className="font-mono">{fmt(totals.sgst)}</span>
                                </div>
                            )}
                            {totals.igst > 0 && (
                                <div className="flex justify-between text-surface-400 pl-4 border-l border-white/10">
                                    <span>IGST</span>
                                    <span className="font-mono">{fmt(totals.igst)}</span>
                                </div>
                            )}
                        </>
                    )}

                    {totals.discount > 0 && (
                        <div className="flex justify-between text-red-400">
                            <span>Total Discount</span>
                            <span className="font-mono">─ {fmt(totals.discount)}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-primary-400/80 pt-2 border-t border-white/5">
                        <span className="text-[10px] uppercase font-black tracking-widest">Total Weight/Qty</span>
                        <span className="font-black">{totals.totalQuantity || 0} Units</span>
                    </div>

                    {/* Grand total */}
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] text-surface-500 uppercase tracking-widest font-bold">
                            Grand Total
                        </p>
                        <p className="text-4xl font-extrabold text-primary-400 mt-1 font-mono tracking-tighter">
                            {fmt(totals.total)}
                        </p>
                    </div>
                </div>

                {/* Split Payment Splitter */}
                <div className="pt-8 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-surface-500 uppercase tracking-widest block">
                            Payment Distribution
                        </label>
                        <button 
                            type="button" 
                            onClick={onAddPayment}
                            className="text-[10px] font-bold text-primary-400 hover:text-primary-300 transition-colors uppercase"
                        >
                            + Add Method
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.payments.map((p, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-white/5 p-2 rounded-xl group">
                                <select
                                    value={p.method}
                                    onChange={e => onPaymentChange(idx, 'method', e.target.value)}
                                    className="bg-transparent border-0 text-xs font-bold outline-none focus:ring-0 w-24"
                                >
                                    {PAYMENT_METHODS.map(m => (
                                        <option key={m.value} value={m.value} className="bg-surface-900">{m.label}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={p.amount}
                                    onChange={e => onPaymentChange(idx, 'amount', Number(e.target.value))}
                                    className="bg-transparent border-0 text-right text-sm font-mono w-full outline-none focus:ring-0"
                                    placeholder="0.00"
                                />
                                {formData.payments.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => onRemovePayment(idx)}
                                        className="text-surface-500 hover:text-red-400 transition-colors p-1"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Total Paid / Remaining Summary */}
                    <div className="pt-4 mt-2">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-surface-500">Total Paid</span>
                            <span className="font-bold">{fmt(totals.paidAmount)}</span>
                        </div>
                        {remaining > 0 && (
                            <div className="flex justify-between text-xs text-amber-400 italic">
                                <span>Balance (Credit)</span>
                                <span>{fmt(remaining)}</span>
                            </div>
                        )}
                        {remaining < 0 && (
                            <div className="flex justify-between text-xs text-red-400 italic">
                                <span>Change to Return</span>
                                <span>{fmt(Math.abs(remaining))}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="
                        w-full mt-8 py-4 rounded-2xl font-black text-lg
                        bg-primary-500 hover:bg-primary-600 active:scale-95
                        transition-all shadow-xl shadow-primary-500/20
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-3
                    "
                >
                    {loading
                        ? <><ArrowPathIcon className="w-6 h-6 animate-spin" /> Saving...</>
                        : <><CheckCircleIcon className="w-6 h-6" /> Record Transaction</>
                    }
                </button>
            </div>

            {/* ── ERP Smart Alerts ─────────────────────────────── */}
            <div className="space-y-3">
                {totals.stockWarnings && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 animate-pulse">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-red-900 leading-none">Stock Shortage Detected</p>
                            <p className="text-[10px] text-red-700 mt-1 leading-relaxed opacity-80">
                                One or more items in this order exceed current warehouse availability.
                            </p>
                        </div>
                    </div>
                )}

                {totals.creditLimitExceeded && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-amber-900 leading-none">Credit Limit Warning</p>
                            <p className="text-[10px] text-amber-800 mt-1 leading-relaxed opacity-80">
                                This sale will push the customer's balance above their approved credit limit.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Staff Approval Notice ─────────────────────────── */}
                <div className="p-4 rounded-2xl bg-surface-50 border border-surface-200/50 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-surface-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold text-surface-900 leading-none">Staff Approval Notice</p>
                        <p className="text-[10px] text-surface-500 mt-1 leading-relaxed opacity-80">
                            Entries are saved immediately. Edits to existing transactions go to the admin approval queue.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
