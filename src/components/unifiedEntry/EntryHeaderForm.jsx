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
import AutocompleteInput from '../common/AutocompleteInput';

export default function EntryHeaderForm({ formData, type, customers, suppliers, onChange, onPartySelect }) {
    const { t } = useTranslation();

    // Choose the correct list and label depending on entry type
    const isSaleOrPayment = type === 'SALE' || type === 'PAYMENT';
    const partyList = isSaleOrPayment ? customers : suppliers;
    const partyLabel = isSaleOrPayment ? t('sales.customer') : t('purchases.supplier');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 grid grid-cols-1 md:grid-cols-5 gap-6"
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

            {/* Customer or Supplier */}
            <div className="form-group md:col-span-2">
                <label className="label">{partyLabel}</label>
                <div className="relative">
                    <UserGroupIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <AutocompleteInput 
                        value={formData.partyName || ''}
                        onChange={(val) => onChange({ target: { name: 'partyName', value: val } })}
                        onSelect={onPartySelect}
                        endpoint={isSaleOrPayment ? '/customers' : '/suppliers'}
                        placeholder={`Search ${partyLabel}...`}
                        className="input pl-10 h-12 rounded-xl w-full"
                    />
                    
                    {/* Party Info Badge */}
                    {formData.partyId && (
                        <div className="absolute -bottom-6 left-0 flex items-center gap-3 text-[10px] font-bold">
                            {(() => {
                                const p = partyList.find(x => x.id === formData.partyId);
                                if (!p) return null;
                                return (
                                    <>
                                        <span className="text-surface-400 uppercase tracking-tighter">Balance: <span className="text-surface-900">₹{Number(p.balance || 0).toLocaleString()}</span></span>
                                        {Number(p.creditLimit) > 0 && (
                                            <span className="text-surface-400 uppercase tracking-tighter">Limit: <span className="text-primary-600">₹{Number(p.creditLimit).toLocaleString()}</span></span>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice Type (Only for SALE/PURCHASE) */}
            {(type === 'SALE' || type === 'PURCHASE') ? (
                <div className="form-group">
                    <label className="label">Invoice Type</label>
                    <div className="flex bg-surface-100 p-1 rounded-xl h-12">
                        <button
                            type="button"
                            onClick={() => onChange({ target: { name: 'invoiceType', value: 'GST' } })}
                            className={`flex-1 flex items-center justify-center text-sm font-semibold rounded-lg transition-all ${
                                formData.invoiceType === 'GST' 
                                    ? 'bg-white shadow-sm text-primary-600' 
                                    : 'text-surface-500 hover:text-surface-700'
                            }`}
                        >
                            GST
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ target: { name: 'invoiceType', value: 'NON_GST' } })}
                            className={`flex-1 flex items-center justify-center text-sm font-semibold rounded-lg transition-all ${
                                formData.invoiceType === 'NON_GST' 
                                    ? 'bg-white shadow-sm text-primary-600' 
                                    : 'text-surface-500 hover:text-surface-700'
                            }`}
                        >
                            Non-GST
                        </button>
                    </div>
                </div>
            ) : (
                 <div className="hidden md:block"></div>
            )}

            {/* Expected Delivery Date (optional - only for orders/sales) */}
            {(type === 'SALE' || type === 'PURCHASE') ? (
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
            ) : (
                <div className="hidden md:block"></div>
            )}
        </motion.div>
    );
}
