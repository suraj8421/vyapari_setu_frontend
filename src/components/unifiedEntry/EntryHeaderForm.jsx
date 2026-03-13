// ============================================
// EntryHeaderForm — Date / Party / Delivery row
// ============================================
// REFACTOR: Previously ~40 lines of inline form fields inside UnifiedEntryPage.
//
// Props:
//   formData  : { date, partyId, deliveryDate }
//   type      : string ('SALE' | 'PURCHASE' | ...)
//   customers : array
//   suppliers : array
//   onChange  : standard React input change handler

import { CalendarIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function EntryHeaderForm({ formData, type, customers, suppliers, onChange }) {
    const { t } = useTranslation();

    // Choose the correct list and label depending on entry type
    const isSaleOrPayment = type === 'SALE' || type === 'PAYMENT';
    const partyList = isSaleOrPayment ? customers : suppliers;
    const partyLabel = isSaleOrPayment ? t('sales.customer') : t('purchases.supplier');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 grid grid-cols-1 md:grid-cols-4 gap-6"
        >
            {/* Transaction Date */}
            <div className="form-group">
                <label className="label">{t('common.date')}</label>
                <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={onChange}
                        className="input pl-10 h-12 rounded-xl"
                        required
                    />
                </div>
            </div>

            {/* Customer or Supplier — label and list swap based on entry type */}
            <div className="form-group md:col-span-2">
                <label className="label">{partyLabel}</label>
                <div className="relative">
                    <UserGroupIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                        name="partyId"
                        value={formData.partyId}
                        onChange={onChange}
                        className="input pl-10 h-12 rounded-xl"
                    >
                        <option value="">Select Party</option>
                        {/* REFACTOR FIX: partyList now populates correctly because
                            fetchDropdownData reads .data.data not .data.customers */}
                        {partyList.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name}{p.phone ? ` (${p.phone})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Expected Delivery Date (optional) */}
            <div className="form-group">
                <label className="label">Expected Delivery</label>
                <div className="relative">
                    <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="date"
                        name="deliveryDate"
                        value={formData.deliveryDate}
                        onChange={onChange}
                        className="input pl-10 h-12 rounded-xl"
                    />
                </div>
            </div>
        </motion.div>
    );
}
