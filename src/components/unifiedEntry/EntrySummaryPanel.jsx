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
const PAYMENT_METHODS = [
    { value: 'CASH', label: '💵  Cash' },
    { value: 'UPI', label: '📱  UPI / Digital Wallet' },
    { value: 'CREDIT', label: '📋  Credit (No payment now)' },
    { value: 'BANK_TRANSFER', label: '🏦  Bank Transfer / NEFT' },
    { value: 'CARD', label: '💳  Debit / Credit Card' },
];

// Format a value as Indian Rupees
const fmt = v => `₹ ${Number(v || 0).toFixed(2)}`;

export default function EntrySummaryPanel({ totals, formData, loading, onChange }) {
    const discountTotal = formData.items?.reduce((a, c) => a + Number(c.discount || 0), 0) || 0;
    const paidAmount = Number(formData.paidAmount || 0);
    const remaining = totals.total - paidAmount;

    return (
        <div className="space-y-4">
            {/* ── Totals + Payment Card ───────────────────────── */}
            <div className="card p-6 bg-surface-900 text-white overflow-hidden relative rounded-2xl">
                {/* Decorative glow blob */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500 opacity-20 blur-3xl
                                -mr-16 -mt-16 rounded-full pointer-events-none" />

                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                    <CreditCardIcon className="w-6 h-6" />
                    Summary
                </h3>

                {/* Line totals breakdown */}
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-surface-300">
                        <span>Subtotal</span>
                        <span>{fmt(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-surface-300">
                        <span>GST / Tax</span>
                        <span>{fmt(totals.tax)}</span>
                    </div>
                    {discountTotal > 0 && (
                        <div className="flex justify-between text-red-400">
                            <span>Discount</span>
                            <span>─ {fmt(discountTotal)}</span>
                        </div>
                    )}
                    {/* Grand total */}
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] text-surface-400 uppercase tracking-wider font-bold">
                            Grand Total
                        </p>
                        <p className="text-4xl font-extrabold text-primary-400 mt-1">
                            {fmt(totals.total)}
                        </p>
                    </div>
                </div>

                {/* Payment inputs */}
                <div className="pt-6 space-y-4">
                    <div className="form-group">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-widest block mb-1">
                            Payment Method
                        </label>
                        <select
                            name="paymentMethod"
                            value={formData.paymentMethod}
                            onChange={onChange}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                                       outline-none focus:ring-2 focus:ring-primary-500 text-white"
                        >
                            {PAYMENT_METHODS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="text-xs font-bold text-surface-400 uppercase tracking-widest block mb-1">
                            Amount Paid Now
                        </label>
                        <input
                            type="number"
                            name="paidAmount"
                            value={formData.paidAmount}
                            onChange={onChange}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                                       outline-none focus:ring-2 focus:ring-primary-500
                                       text-xl font-bold text-white"
                            min="0"
                            step="0.01"
                        />
                        {/* REFACTOR: New — show live credit balance so staff know
                            how much will be recorded as outstanding in the khata */}
                        {remaining > 0 && totals.total > 0 && (
                            <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                                {fmt(remaining)} will be added to credit / khata
                            </p>
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

            {/* ── Staff Approval Notice ─────────────────────────── */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-amber-900">Staff Approval Notice</p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Entries are saved immediately. Any <strong>edits</strong> to
                        existing transactions go to the admin approval queue and will
                        not take effect until approved.
                    </p>
                </div>
            </div>
        </div>
    );
}
