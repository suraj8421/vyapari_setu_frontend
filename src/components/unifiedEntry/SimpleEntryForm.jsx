// ============================================
// SimpleEntryForm — Amount + Category
// ============================================
// REFACTOR: Used for EXPENSE, PAYMENT, and MISC types.
// Previously ~25 lines of inline JSX inside UnifiedEntryPage.
//
// Props:
//   formData : { paidAmount, category }
//   type     : 'EXPENSE' | 'PAYMENT' | 'MISC'
//   onChange : standard React input change handler

import { motion } from 'framer-motion';

// Per-type descriptive placeholder text so staff know what to enter
const CATEGORY_PLACEHOLDERS = {
    EXPENSE: 'e.g. Electricity Bill, Rent, Staff Salary, Maintenance',
    PAYMENT: 'e.g. Customer advance, EMI repayment, Refund',
    MISC: 'e.g. Miscellaneous petty cash, Small unclassified expense',
};

const AMOUNT_LABELS = {
    EXPENSE: 'Expense Amount',
    PAYMENT: 'Payment Amount Received',
    MISC: 'Miscellaneous Amount',
};

export default function SimpleEntryForm({ formData, type, onChange }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
            {/* Amount */}
            <div className="form-group">
                <label className="label">{AMOUNT_LABELS[type] || 'Amount'}</label>
                <div className="relative">
                    {/* ₹ prefix icon */}
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400 pointer-events-none">
                        ₹
                    </span>
                    <input
                        type="number"
                        name="paidAmount"
                        value={formData.paidAmount}
                        onChange={onChange}
                        className="input h-14 text-2xl font-bold rounded-2xl pl-10"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>

            {/* Category / Purpose */}
            <div className="form-group">
                <label className="label">Category / Purpose</label>
                <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={onChange}
                    className="input h-14 rounded-2xl"
                    placeholder={CATEGORY_PLACEHOLDERS[type] || 'Enter category'}
                />
                {/* Helper text based on type */}
                {type === 'MISC' && (
                    <p className="text-xs text-amber-600 mt-1">
                        💡 MISC entries are stored as miscellaneous expenses in the ledger.
                    </p>
                )}
            </div>
        </motion.div>
    );
}
